/**
 * @file admin.controller.js
 * @description Контроллер для админских операций: управление группами, занятиями, массовыми действиями и историей изменений.
 * 
 * Все функции защищены middleware authMiddleware + adminOnly (роль 'admin').
 * 
 * Использует:
 * - pool из db.js для запросов к PostgreSQL
 * - logChange из audit.service.js для записи в историю изменений
 * 
 * @requires ../db
 * @requires ../services/audit.service
 */

const pool = require('../db');
const { logChange } = require('../services/audit.service');

/* ================== ГРУППЫ ================== */

/**
 * Получить список всех групп
 * @route GET /api/admin/groups
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Object[]} Массив групп { id, name }
 */
const getGroups = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM groups ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения групп:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

/**
 * Создать новую группу
 * @route POST /api/admin/groups
 * @param {Object} req - Express request
 * @param {Object} req.body
 * @param {string} req.body.name - Название группы
 * @param {Object} res - Express response
 * @returns {Object} Созданная группа { id, name }
 */
const createGroup = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Укажите название группы' });

  try {
    const result = await pool.query(
      'INSERT INTO groups (name) VALUES ($1) RETURNING id, name',
      [name.trim()]
    );

    // Логируем создание группы
    await logChange(
      req.user.id,
      'create_group',
      'group',
      result.rows[0].id,
      null,
      { name: name.trim() },
      `Создана группа: ${name.trim()}`
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Группа с таким именем уже существует' });
    }
    console.error('Ошибка создания группы:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

/**
 * Удалить группу и все её занятия
 * @route DELETE /api/admin/groups/:id
 * @param {Object} req - Express request
 * @param {string} req.params.id - ID группы
 * @param {Object} res - Express response
 */
const deleteGroup = async (req, res) => {
  const { id } = req.params;

  try {
    // Получаем данные группы ДО удаления для лога
    const oldGroup = await pool.query('SELECT id, name FROM groups WHERE id = $1', [id]);
    if (oldGroup.rows.length === 0) {
      return res.status(404).json({ message: 'Группа не найдена' });
    }

    // Удаляем группу (каскадно удалятся занятия, если есть ON DELETE CASCADE)
    await pool.query('DELETE FROM groups WHERE id = $1', [id]);

    // Логируем удаление
    await logChange(
      req.user.id,
      'delete_group',
      'group',
      id,
      oldGroup.rows[0],
      null,
      `Удалена группа: ${oldGroup.rows[0].name}`
    );

    res.json({ message: 'Группа удалена' });
  } catch (err) {
    console.error('Ошибка удаления группы:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

/* ================== ЗАНЯТИЯ ================== */

/**
 * Получить все занятия (с фильтром по группе)
 * @route GET /api/admin/lessons
 * @param {Object} req.query
 * @param {string} [req.query.groupId] - ID группы для фильтра
 * @returns {Object[]} Массив занятий с group_name
 */
const getLessons = async (req, res) => {
  try {
    const { groupId, start, end } = req.query; // start/end - даты ISO (2023-10-01)

    let query = `
      SELECT l.*, g.name AS group_name 
      FROM lessons l 
      JOIN groups g ON l.group_id = g.id 
      WHERE l.lesson_date BETWEEN $1 AND $2 
    `;
    const params = [start || '1970-01-01', end || '2099-12-31'];

    if (groupId) {
      query += ` AND l.group_id = $3`;
      params.push(groupId);
    }

    query += ` ORDER BY l.lesson_date, l.start_time`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения занятий:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
/**
 * Создать новое занятие
 * @route POST /api/admin/lessons
 * @param {Object} req.body - Данные занятия
 * @returns {Object} { id, message }
 */
const createLesson = async (req, res) => {
  // week теперь используется только для генерации, но не хранится как истина в последней инстанции
  const { group_id, day, start_time, end_time, subject, teacher, room, type, week, single_date } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let datesToInsert = [];

    // ВАРИАНТ 1: Создаем конкретную пару (админ кликнул на день в календаре)
    if (single_date) {
      datesToInsert.push(single_date);
    }
    // ВАРИАНТ 2: Создаем серию (админ выбрал "Каждую неделю")
    else if (week !== undefined && day !== undefined) {
      datesToInsert = generateDates(day, week); // Генерируем даты на семестр
    }

    if (datesToInsert.length === 0) {
      throw new Error('Не удалось определить даты для занятия');
    }

    const insertedIds = [];

    for (const date of datesToInsert) {
      const result = await client.query(
        `INSERT INTO lessons 
        (group_id, lesson_date, start_time, end_time, subject, teacher, room, type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING id`,
        [group_id, date, start_time, end_time, subject, teacher, room, type]
      );
      insertedIds.push(result.rows[0].id);
    }

    await logChange(
      req.user.id, 'create_lesson_series', 'lesson', null, null,
      { count: insertedIds.length, subject },
      `Создано ${insertedIds.length} занятий (${subject})`
    );

    await client.query('COMMIT');
    res.json({ message: `Создано ${insertedIds.length} занятий`, ids: insertedIds });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Ошибка создания:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  } finally {
    client.release();
  }
};
/**
 * Удалить занятие
 * @route DELETE /api/admin/lessons/:id
 * @param {string} req.params.id - ID занятия
 */
const deleteLesson = async (req, res) => {
  const { id } = req.params;
  const { deleteSeries } = req.body; // Флаг: удалить только это или всю серию?

  // Если хотите удалять всю серию, вам нужно хранить `series_id` в БД или искать похожие
  // Для простоты пока удаляем по одному
  try {
    await pool.query('DELETE FROM lessons WHERE id = $1', [id]);
    res.json({ message: 'Занятие удалено' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
/* ================== МАССОВЫЕ ОПЕРАЦИИ ================== */

/**
 * Скопировать занятия с одной недели на другую
 * @route POST /api/admin/lessons/copy-week
 * @param {Object} req.body
 * @param {number} req.body.group_id
 * @param {number} req.body.from_week - 0=каждая, 1=чётная, 2=нечётная
 * @param {number} req.body.to_week
 */
const copyWeek = async (req, res) => {
  const { group_id, from_week, to_week } = req.body;

  if (!group_id || from_week === undefined || to_week === undefined) {
    return res.status(400).json({ message: 'Укажите group_id, from_week и to_week' });
  }

  try {
    const source = await pool.query(
      'SELECT day, start_time, end_time, subject, teacher, room, type FROM lessons WHERE group_id = $1 AND week = $2',
      [group_id, from_week]
    );

    if (source.rows.length === 0) {
      return res.status(404).json({ message: 'Нет занятий для копирования' });
    }

    // Перезаписываем целевую неделю
    await pool.query('DELETE FROM lessons WHERE group_id = $1 AND week = $2', [group_id, to_week]);

    const insertQuery = `
      INSERT INTO lessons (group_id, day, start_time, end_time, subject, teacher, room, type, week)
      SELECT $1, day, start_time, end_time, subject, teacher, room, type, $2
      FROM lessons 
      WHERE group_id = $1 AND week = $3
    `;

    await pool.query(insertQuery, [group_id, to_week, from_week]);

    // Логируем
    await logChange(
      req.user.id,
      'copy_week',
      'lessons',
      null,
      { from_week, group_id },
      { to_week, group_id },
      `Скопирована неделя ${from_week} → ${to_week} для группы ${group_id}`
    );

    res.json({ message: `Неделя скопирована (week ${from_week} → ${to_week})` });
  } catch (err) {
    console.error('Ошибка копирования недели:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

/**
 * Очистить все занятия группы на определённой неделе
 * @route DELETE /api/admin/lessons/clear-week
 * @param {Object} req.body
 * @param {number} req.body.group_id
 * @param {number} req.body.week
 */
const clearWeek = async (req, res) => {
  const { group_id, week } = req.body;

  if (!group_id || week === undefined) {
    return res.status(400).json({ message: 'Укажите group_id и week' });
  }

  try {
    // Получаем удаляемые занятия
    const deletedLessons = await pool.query(
      'SELECT * FROM lessons WHERE group_id = $1 AND week = $2',
      [group_id, week]
    );

    const result = await pool.query(
      'DELETE FROM lessons WHERE group_id = $1 AND week = $2',
      [group_id, week]
    );

    if (result.rowCount > 0) {
      await logChange(
        req.user.id,
        'clear_week',
        'lessons',
        null,
        null,  // Не храним весь список — слишком большой
        null,
        `Очищена неделя ${week} для группы ${group_id}. Удалено ${result.rowCount} занятий`
      );
    }

    res.json({ message: `Удалено ${result.rowCount} занятий` });
  } catch (err) {
    console.error('Ошибка очистки недели:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

/**
 * Заменить преподавателя во всех занятиях группы
 * @route PATCH /api/admin/lessons/replace-teacher
 * @param {Object} req.body
 * @param {number} req.body.group_id
 * @param {string} req.body.old_teacher
 * @param {string} req.body.new_teacher
 */
const replaceTeacher = async (req, res) => {
  const { group_id, old_teacher, new_teacher } = req.body;

  if (!group_id || !old_teacher || !new_teacher) {
    return res.status(400).json({ message: 'Укажите group_id, old_teacher и new_teacher' });
  }

  try {
    const affectedLessons = await pool.query(
      `SELECT id, subject, day, start_time, end_time, room, type, week 
       FROM lessons 
       WHERE group_id = $1 AND teacher = $2`,
      [group_id, old_teacher.trim()]
    );

    const result = await pool.query(
      `UPDATE lessons 
       SET teacher = $1 
       WHERE group_id = $2 AND teacher = $3
       RETURNING id`,
      [new_teacher.trim(), group_id, old_teacher.trim()]
    );

    if (result.rowCount > 0) {
      await logChange(
        req.user.id,
        'replace_teacher',
        'lessons',
        null,
        { teacher: old_teacher },
        { teacher: new_teacher },
        `Заменён преподаватель "${old_teacher}" → "${new_teacher}" в ${result.rowCount} занятиях группы ${group_id}`
      );
    }

    res.json({ message: `Заменено ${result.rowCount} занятий` });
  } catch (err) {
    console.error('Ошибка замены преподавателя:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

/**
 * Получить историю изменений (аудит-лог)
 * @route GET /api/admin/changes
 * @param {Object} req.query
 * @param {string} [req.query.limit=50]
 * @param {string} [req.query.offset=0]
 * @returns {Object[]} Массив записей истории
 */
const getChangeHistory = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT 
         sc.id,
         sc.action_type,
         sc.description,
         sc.changed_at,
         u.email AS admin_email,
         sc.old_value,
         sc.new_value
       FROM schedule_changes sc
       JOIN users u ON sc.admin_id = u.id
       ORDER BY sc.changed_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения истории изменений:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Экспорт всех функций
module.exports = {
  getGroups,
  createGroup,
  deleteGroup,
  getLessons,
  createLesson,
  deleteLesson,
  copyWeek,
  clearWeek,
  replaceTeacher,
  getChangeHistory
};
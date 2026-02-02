/**
 * @file schedule.controller.js
 * @description Контроллер для получения расписания занятий.
 * 
 * Основная функция:
 * - GET /api/schedule — возвращает расписание для текущего пользователя
 *   - Студент: только своей группы
 *   - Админ: любой группы (через query-параметр ?group=...)
 * 
 * Поддерживает:
 * - Смещение недели (?weekOffset)
 * - Фильтрацию по чётности/нечётности недели
 * - Вычисление информации о неделе через week.service
 * 
 * Защищён middleware authMiddleware (требуется JWT)
 * 
 * @requires ../db - Пул соединений PostgreSQL
 * @requires ../services/week.service - Утилита для расчёта недели (чётная/нечётная, даты)
 */

const pool = require('../db');
const { getWeekInfo } = require('../services/week.service');

/**
 * GET /api/schedule
 * Получение расписания для текущего пользователя
 * 
 * @route GET /api/schedule
 * @param {Object} req - Express request object
 * @param {Object} req.user - Данные пользователя из JWT (из authMiddleware)
 * @param {string} req.user.role - Роль ('admin' или 'student')
 * @param {string} [req.user.group] - Название группы (для студента)
 * @param {Object} req.query
 * @param {string} [req.query.weekOffset=0] - Смещение недели (0 = текущая, -1 = предыдущая и т.д.)
 * @param {string} [req.query.group] - Название группы (только для админа)
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON с расписанием:
 *   - group: string — название группы
 *   - weekNumber: number
 *   - weekType: string ('чётная' / 'нечётная')
 *   - isEven: boolean
 *   - weekStart: string (ISO date)
 *   - weekEnd: string (ISO date)
 *   - lessons: array — занятия
 * 
 * @throws {400} Если админ не указал группу или у студента нет группы
 * @throws {403} Если неизвестная роль
 * @throws {404} Если группа не найдена
 * @throws {500} При ошибке сервера или БД
 */
const getSchedule = async (req, res) => {
  try {
    let groupName = req.query.group;
    let teacherId = null;

    // Определяем логику в зависимости от роли
    if (req.user.role === 'admin') {
      if (!groupName) return res.status(400).json({ message: 'Выберите группу' });
    } else if (req.user.role === 'student') {
      groupName = req.user.group;
    } else if (req.user.role === 'teacher') {
      teacherId = req.user.id; // Для учителя фильтруем по его ID
    } else {
      return res.status(403).json({ message: 'Неизвестная роль: ' + req.user.role });
    }

    const weekOffset = Number(req.query.weekOffset || 0);
    const weekInfo = getWeekInfo(weekOffset);

    let lessonsRes;

    if (teacherId) {
      // ЗАПРОС ДЛЯ УЧИТЕЛЯ (его личные пары)
      lessonsRes = await pool.query(
        `SELECT l.*, g.name as group_name, u.full_name AS teacher
         FROM lessons l
         LEFT JOIN users u ON u.id = l.teacher_id
         LEFT JOIN groups g ON g.id = l.group_id
         WHERE l.teacher_id = $1
         AND l.lesson_date BETWEEN $2 AND $3
         ORDER BY l.lesson_date, l.start_time`,
        [teacherId, weekInfo.weekStart, weekInfo.weekEnd]
      );
    } else {
      // ЗАПРОС ДЛЯ СТУДЕНТА/АДМИНА (по группе)
      const groupRes = await pool.query('SELECT id FROM groups WHERE name = $1', [groupName]);
      if (groupRes.rows.length === 0) return res.status(404).json({ message: 'Группа не найдена' });

      lessonsRes = await pool.query(
        `SELECT l.*, u.full_name AS teacher
         FROM lessons l
         LEFT JOIN users u ON u.id = l.teacher_id
         WHERE l.group_id = $1
         AND l.lesson_date BETWEEN $2 AND $3
         ORDER BY l.lesson_date, l.start_time`,
        [groupRes.rows[0].id, weekInfo.weekStart, weekInfo.weekEnd]
      );
    }

    res.json({
      ...weekInfo,
      lessons: lessonsRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Экспорт контроллера
module.exports = { getSchedule };
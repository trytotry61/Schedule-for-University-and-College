const pool = require('../db');
const { logChange } = require('../services/audit.service');


/**
 * PUT /api/schedule/day
 * Полная перезапись расписания на конкретный день
 * Доступ: только admin
 */
const updateScheduleByDay = async (req, res) => {
  // 🔐 Проверка роли
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Только администратор может редактировать расписание' });
  }

  const { date, groupId, lessons } = req.body;

  // 🛑 Валидация входных данных
  if (!date || !groupId || !Array.isArray(lessons)) {
    return res.status(400).json({ message: 'date, groupId и lessons обязательны' });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0); // обнуляем время

  const scheduleDate = new Date(date);
  scheduleDate.setHours(0, 0, 0, 0);
  if (scheduleDate < today) {
    return res.status(400).json({
      message: 'Нельзя редактировать расписание прошедших дат'
    });
  }



  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    // 🔍 Сохраняем старое расписание (ДО изменений)
    const oldLessonsRes = await client.query(
      `SELECT * FROM lessons WHERE lesson_date = $1 AND group_id = $2`,
      [date, groupId]
    );

    // 1️⃣ Удаляем старые занятия этого дня
    await client.query(
      `DELETE FROM lessons
       WHERE lesson_date = $1 AND group_id = $2`,
      [date, groupId]
    );

    // 2️⃣ Вставляем новые занятия
    for (const lesson of lessons) {
      const {
        start_time,
        end_time,
        subject,
        teacher_id,
        room,
        type
      } = lesson;

      if (!start_time || !end_time || !subject || !room || !type) {
        throw new Error('Некорректные данные занятия');
      }

      await client.query(
        `
        INSERT INTO lessons (
          group_id,
          lesson_date,
          start_time,
          end_time,
          subject,
          teacher_id,
          room,
          type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          groupId,
          date,
          start_time,
          end_time,
          subject,
          teacher_id || null,
          room,
          type
        ]
      );
    }

    await client.query('COMMIT');
    await logChange({
      adminId: req.user.id,
      actionType: 'update_schedule_day',
      targetType: 'schedule_day',
      targetId: null,
      oldValue: {
        date,
        lessons: oldLessonsRes.rows
      },
      newValue: {
        date,
        groupId,
        lessons

      }
    });


    res.json({ message: 'Расписание на день успешно сохранено' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Ошибка сохранения расписания дня:', err);
    res.status(500).json({ message: 'Ошибка сервера при сохранении расписания' });
  } finally {
    client.release();
  }
};
const getScheduleByDay = async (req, res) => {
  try {
    const { date, groupId } = req.query;

    if (!date || !groupId) {
      return res.status(400).json({ message: 'date и groupId обязательны' });
    }

    const result = await pool.query(
      `
      SELECT
        l.id,
        l.lesson_date,
        l.start_time,
        l.end_time,
        l.subject,
        l.room,
        l.type,
        u.full_name AS teacher
      FROM lessons l
      LEFT JOIN users u ON u.id = l.teacher_id
      WHERE l.lesson_date = $1
        AND l.group_id = $2
      ORDER BY l.start_time
      `,
      [date, groupId]
    );

    res.json({
      date,
      groupId,
      lessons: result.rows
    });
  } catch (err) {
    console.error('Ошибка получения расписания:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

module.exports = {
  getScheduleByDay,
  updateScheduleByDay
};

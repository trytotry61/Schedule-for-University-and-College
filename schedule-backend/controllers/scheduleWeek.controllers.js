const pool = require('../db');

const getScheduleByWeek = async (req, res) => {
  try {
    const { weekOffset = 0, groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ message: 'groupId обязателен' });
    }

    const now = new Date();
    const monday = new Date(now);
    const day = monday.getDay() || 7;
    monday.setDate(monday.getDate() - day + 1 + weekOffset * 7);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const lessonsRes = await pool.query(`
      SELECT
        l.id,
        l.lesson_date,
        EXTRACT(DOW FROM l.lesson_date) - 1 AS day,
        l.start_time,
        l.end_time,
        l.subject,
        l.room,
        l.type,
        u.full_name AS teacher
      FROM lessons l
      LEFT JOIN users u ON u.id = l.teacher_id
      WHERE l.group_id = $1
        AND l.lesson_date BETWEEN $2 AND $3
      ORDER BY l.lesson_date, l.start_time
    `, [groupId, monday, sunday]);

    res.json({
      weekStart: monday,
      weekEnd: sunday,
      lessons: lessonsRes.rows
    });

  } catch (err) {
    console.error('Ошибка получения недели:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

module.exports = { getScheduleByWeek };

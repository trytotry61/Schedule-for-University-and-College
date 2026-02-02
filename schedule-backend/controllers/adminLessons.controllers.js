const pool = require('../db');

/**
 * GET /api/admin/lessons
 * Просмотр всех занятий (админ)
 */
const getAdminLessons = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        l.id,
        l.lesson_date,
        l.start_time,
        l.end_time,
        l.subject,
        l.room,
        l.type,
        g.name AS group_name,
        u.full_name AS teacher
      FROM lessons l
      JOIN groups g ON g.id = l.group_id
      LEFT JOIN users u ON u.id = l.teacher_id
      ORDER BY l.lesson_date, l.start_time
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('ADMIN LESSONS ERROR:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

module.exports = { getAdminLessons };

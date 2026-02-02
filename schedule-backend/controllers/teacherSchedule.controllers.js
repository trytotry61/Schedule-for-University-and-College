const pool = require('../db');

const getTeacherSchedule = async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Только для учителей' });
  }

  const teacherId = req.user.id;

  const result = await pool.query(
    `
    SELECT
      l.lesson_date,
      l.start_time,
      l.end_time,
      l.subject,
      l.room,
      g.name AS group_name
    FROM lessons l
    JOIN groups g ON g.id = l.group_id
    WHERE l.teacher_id = $1
    ORDER BY l.lesson_date, l.start_time
    `,
    [teacherId]
  );

  res.json(result.rows);
};

module.exports = { getTeacherSchedule };

const pool = require('../db');
const bcrypt = require('bcrypt');

const createTeacher = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Только администратор' });
  }

  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ message: 'Все поля обязательны' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (email, password_hash, role, full_name)
      VALUES ($1, $2, 'teacher', $3)
      RETURNING id, email, full_name
      `,
      [email, passwordHash, full_name]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка создания учителя:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
const getTeachers = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Только администратор' });
  }

  try {
    const result = await pool.query(
      `
      SELECT id, full_name
      FROM users
      WHERE role = 'teacher'
      ORDER BY full_name
      `
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка получения учителей' });
  }
};


module.exports = {
  createTeacher,
  getTeachers
};


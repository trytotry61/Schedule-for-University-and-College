/**
 * @file schedule.service.js
 * @description Устаревшая версия контроллера аутентификации (один JWT на 7 дней).
 * 
 * @note Этот файл по ошибке назван schedule.service.js, но содержит код auth.controller.js.
 * В текущей версии проекта используется Access + Refresh Token.
 * Оставлен для справки.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email и пароль обязательны' });
  }

  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.role, g.name AS group_name
       FROM users u
       LEFT JOIN groups g ON u.group_id = g.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        group: user.group_name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

/**
 * POST /api/auth/register (устаревшая версия)
 */
const register = async (req, res) => {
  // ... код регистрации из твоего index.js
  const { email, password, groupName } = req.body;

  if (!email || !password || !groupName) {
    return res.status(400).json({ message: 'Заполните все поля: email, password, groupName' });
  }

  try {
    const groupRes = await pool.query(
      'SELECT id FROM groups WHERE name = $1',
      [groupName.trim()]
    );

    if (groupRes.rows.length === 0) {
      return res.status(400).json({ message: 'Группа не найдена' });
    }

    const groupId = groupRes.rows[0].id;

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Email уже занят' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (email, password_hash, role, group_id)
       VALUES ($1, $2, 'student', $3)`,
      [email.trim().toLowerCase(), passwordHash, groupId]
    );

    res.status(201).json({ message: 'Студент успешно зарегистрирован' });
  } catch (err) {
    console.error('Ошибка регистрации:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

module.exports = { login, register };
/**
 * @file auth.controller.js
 * @description Контроллер для операций аутентификации и авторизации.
 * 
 * Реализует:
 * - Логин с выдачей accessToken и refreshToken (в httpOnly cookie)
 * - Обновление accessToken по refreshToken
 * - Логаут (очистка cookie)
 * - Регистрацию новых студентов
 * 
 * Использует JWT с коротким accessToken (15 мин) и длинным refreshToken (7 дней).
 * 
 * @requires bcryptjs - Для хеширования паролей
 * @requires jsonwebtoken - Для генерации и верификации JWT
 * @requires ../db - Пул соединений PostgreSQL
 * @requires dotenv - Загрузка переменных окружения
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
require('dotenv').config();

/** @constant {string} Секретный ключ для подписи JWT (из .env или fallback) */
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

/** @constant {string} Время жизни accessToken */
const ACCESS_TOKEN_EXPIRES = '15m';   // 15 минут — короткий для безопасности

/** @constant {string} Время жизни refreshToken */
const REFRESH_TOKEN_EXPIRES = '7d';   // 7 дней — удобно для пользователя

/**
 * POST /api/auth/login
 * Авторизация пользователя (админ или студент)
 * 
 * @route POST /api/auth/login
 * @param {Object} req - Express request object
 * @param {Object} req.body
 * @param {string} req.body.email - Email пользователя
 * @param {string} req.body.password - Пароль
 * @param {Object} res - Express response object
 * 
 * @returns {Object} { accessToken }
 * @throws {400} Если не указаны email или пароль
 * @throws {401} Если неверные данные
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Ищем пользователя в БД
    const result = await pool.query(
      `SELECT u.*, g.name AS group_name 
       FROM users u 
       LEFT JOIN groups g ON u.group_id = g.id 
       WHERE u.email = $1`,
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    const userData = result.rows[0]; // Переименовал в userData, чтобы не было конфликтов

    // 2. Проверяем пароль
    const isMatch = await bcrypt.compare(password, userData.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный пароль' });
    }

    // 3. Генерируем токены
    // Добавляем роль teacher в payload, если она есть в БД
    const accessToken = jwt.sign(
      {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        group: userData.group_name || null // У учителя группы может не быть
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES }
    );

    const refreshToken = jwt.sign(
      { id: userData.id },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES }
    );

    // 4. Отправляем RefreshToken в куки
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
    });

    res.json({ accessToken });
  } catch (err) {
    console.error('Ошибка входа:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

/**
 * POST /api/auth/refresh
 * Обновление accessToken по refreshToken из cookie
 * 
 * @route POST /api/auth/refresh
 * @param {Object} req - Express request
 * @param {Object} req.cookies
 * @param {string} req.cookies.refreshToken - Refresh token
 * @param {Object} res - Express response
 * 
 * @returns {Object} { accessToken } - Новый accessToken
 * @throws {401} Если refreshToken отсутствует или недействителен
 */
const refresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Нет refresh token' });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);

    // Получаем актуальные данные пользователя (роль могла измениться)
    const userRes = await pool.query(
      `SELECT u.id, u.email, u.role, g.name AS group_name
       FROM users u
       LEFT JOIN groups g ON u.group_id = g.id
       WHERE u.id = $1`,
      [payload.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    const user = userRes.rows[0];

    const newAccessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        group: user.group_name
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    // При любой ошибке (истёк, подделан) — очищаем cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.status(401).json({ message: 'Недействительный refresh token' });
  }
};

/**
 * POST /api/auth/logout
 * Выход из системы — очистка refreshToken cookie
 * 
 * @route POST /api/auth/logout
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const logout = (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ message: 'Выход выполнен' });
};

/**
 * POST /api/auth/register
 * Регистрация нового студента
 * 
 * @route POST /api/auth/register
 * @param {Object} req.body
 * @param {string} req.body.email
 * @param {string} req.body.password
 * @param {string} req.body.groupName - Название группы
 * 
 * @returns {Object} { message }
 * @throws {400} Если данные неполные или группа/email заняты
 */
const register = async (req, res) => {
  const { email, password, groupName } = req.body;

  if (!email || !password || !groupName) {
    return res.status(400).json({ message: 'Заполните все поля: email, password, groupName' });
  }

  try {
    // Проверяем существование группы
    const groupRes = await pool.query(
      'SELECT id FROM groups WHERE name = $1',
      [groupName.trim()]
    );

    if (groupRes.rows.length === 0) {
      return res.status(400).json({ message: 'Группа не найдена' });
    }

    const groupId = groupRes.rows[0].id;

    // Проверяем уникальность email
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Email уже занят' });
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Создаём пользователя с ролью student
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

// Экспорт всех функций контроллера
module.exports = {
  login,
  register,
  refresh,
  logout
};
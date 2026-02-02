/**
 * @file auth.middleware.js
 * @description Middleware для аутентификации запросов с использованием JWT.
 * 
 * Проверяет наличие и валидность accessToken в заголовке Authorization.
 * Если токен валиден — добавляет данные пользователя в req.user и передаёт управление следующему middleware.
 * 
 * Используется для защиты всех защищённых роутов:
 * - /api/schedule
 * - /api/admin/*
 * 
 * @requires jsonwebtoken - Для верификации JWT
 * @requires dotenv - Загрузка JWT_SECRET из .env
 * 
 * @middleware
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

/** @constant {string} Секретный ключ для верификации JWT (из .env) */
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware аутентификации по JWT
 * 
 * @function authMiddleware
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Заголовки запроса
 * @param {string} [req.headers.authorization] - Заголовок Authorization в формате "Bearer <token>"
 * @param {Object} res - Express response object
 * @param {Function} next - Следующий middleware в цепочке
 * 
 * @returns {void} Вызывает next() при успешной аутентификации
 * @throws {401} Если токен отсутствует или недействителен
 * 
 * @example
 * // Использование в роуте
 * router.get('/schedule', authMiddleware, scheduleController.getSchedule);
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Проверяем наличие заголовка и правильный формат "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Токен не предоставлен' });
  }

  // Извлекаем токен
  const token = authHeader.split(' ')[1];

  try {
    // Верифицируем токен и добавляем payload в req.user
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;  // { id, email, role, group, iat, exp }

    // Передаём управление следующему middleware/контроллеру
    next();
  } catch (err) {
    // Токен истёк, подделан или неверный секрет
    console.warn('Недействительный токен:', err.message);
    return res.status(401).json({ message: 'Недействительный токен' });
  }
}

// Экспортируем middleware
module.exports = authMiddleware;
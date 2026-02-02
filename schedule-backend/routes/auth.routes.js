/**
 * @file auth.routes.js
 * @description Маршруты для аутентификации и авторизации пользователей.
 * 
 * Все роуты публичные (не требуют JWT):
 * - /login — вход в систему
 * - /register — регистрация нового студента
 * - /refresh — обновление accessToken по refreshToken
 * - /logout — выход (очистка refreshToken cookie)
 * 
 * Подключён в index.js через app.use('/api/auth', authRoutes)
 * 
 * @requires express
 * @requires ../controllers/auth.controller
 * 
 * @module routes/auth
 */

const express = require('express');
const router = express.Router();

// Импорт функций из контроллера аутентификации
const { login, register, refresh, logout } = require('../controllers/auth.controller');

/**
 * POST /api/auth/login
 * Авторизация пользователя
 * 
 * @route POST /api/auth/login
 * @public
 * @body {string} email - Email пользователя
 * @body {string} password - Пароль
 * 
 * @returns {Object} { accessToken } — короткий токен для запросов
 * @returns {Cookie} refreshToken — длинный токен в httpOnly cookie
 */
router.post('/login', login);

/**
 * POST /api/auth/register
 * Регистрация нового студента
 * 
 * @route POST /api/auth/register
 * @public
 * @body {string} email - Email
 * @body {string} password - Пароль
 * @body {string} groupName - Название группы (должна существовать)
 * 
 * @returns {Object} { message: 'Студент успешно зарегистрирован' }
 */
router.post('/register', register);

/**
 * POST /api/auth/refresh
 * Обновление accessToken по refreshToken из cookie
 * 
 * @route POST /api/auth/refresh
 * @public
 * @cookie {string} refreshToken - Длинный токен из httpOnly cookie
 * 
 * @returns {Object} { accessToken } — новый короткий токен
 */
router.post('/refresh', refresh);

/**
 * POST /api/auth/logout
 * Выход из системы
 * 
 * @route POST /api/auth/logout
 * @public
 * @cookie {string} refreshToken - Очищается на сервере
 * 
 * @returns {Object} { message: 'Выход выполнен' }
 */
router.post('/logout', logout);

// Экспортируем роутер
module.exports = router;
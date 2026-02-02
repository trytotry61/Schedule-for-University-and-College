/**
 * @file schedule.routes.js
 * @description Маршруты для получения расписания занятий.
 * 
 * Доступен только аутентифицированным пользователям (студентам и админам):
 * - Студент видит расписание своей группы
 * - Админ может указать группу через query-параметр ?group=...
 * 
 * Защищён middleware authMiddleware (проверка JWT accessToken).
 * 
 * Подключён в index.js через app.use('/api/schedule', scheduleRoutes)
 * 
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../controllers/schedule.controller
 * 
 * @module routes/schedule
 */

const express = require('express');
const router = express.Router();

// Middleware аутентификации (проверка JWT)
const authMiddleware = require('../middleware/auth.middleware');

// Контроллер расписания
const { getSchedule } = require('../controllers/schedule.controller');

/**
 * GET /api/schedule
 * Получение расписания занятий для текущего пользователя
 * 
 * @route GET /api/schedule
 * @middleware authMiddleware - Требуется валидный accessToken
 * 
 * @query {number} [weekOffset=0] - Смещение недели (0 = текущая, -1 = предыдущая и т.д.)
 * @query {string} [group] - Название группы (только для админа)
 * 
 * @returns {Object} JSON с расписанием:
 *   - group: string — название группы
 *   - weekNumber: number
 *   - weekType: string ('чётная' / 'нечётная')
 *   - isEven: boolean
 *   - weekStart: string (ISO)
 *   - weekEnd: string (ISO)
 *   - lessons: array — массив занятий
 * 
 * @throws {401} Если токен отсутствует или недействителен
 * @throws {400} Если админ не указал группу или у студента нет группы
 * @throws {403} Если неизвестная роль
 * @throws {404} Если группа не найдена
 */
router.get('/', authMiddleware, getSchedule);

// Экспортируем роутер
module.exports = router;
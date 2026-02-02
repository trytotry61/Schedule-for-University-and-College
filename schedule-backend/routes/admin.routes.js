/**
 * @file admin.routes.js
 * @description Маршруты для админ-панели.
 * 
 * Все роуты защищены:
 * - authMiddleware — проверка JWT (accessToken)
 * - adminOnly — проверка роли 'admin'
 * 
 * Доступны только аутентифицированным администраторам.
 * 
 * Подключён в index.js через app.use('/api/admin', adminRoutes)
 * 
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../middleware/role.middleware
 * @requires ../controllers/admin.controller
 * 
 * @module routes/admin
 */

const express = require('express');
const router = express.Router();

// Middleware защиты
const authMiddleware = require('../middleware/auth.middleware');
const adminOnly = require('../middleware/role.middleware');

// Контроллеры админских операций
const {
  getGroups,
  createGroup,
  deleteGroup,
  getLessons,
  createLesson,
  deleteLesson,
  copyWeek,
  clearWeek,
  replaceTeacher,
  getChangeHistory
} = require('../controllers/admin.controller');

/* ================== МАССОВЫЕ ОПЕРАЦИИ С ЗАНЯТИЯМИ ================== */

/**
 * Скопировать занятия с одной недели на другую (перезаписывает целевую неделю)
 * @route POST /api/admin/lessons/copy-week
 * @middleware authMiddleware, adminOnly
 */
router.post('/lessons/copy-week', authMiddleware, adminOnly, copyWeek);

/**
 * Очистить все занятия группы на определённой неделе
 * @route DELETE /api/admin/lessons/clear-week
 * @middleware authMiddleware, adminOnly
 */
router.delete('/lessons/clear-week', authMiddleware, adminOnly, clearWeek);

/**
 * Заменить преподавателя во всех занятиях группы
 * @route PATCH /api/admin/lessons/replace-teacher
 * @middleware authMiddleware, adminOnly
 */
router.patch('/lessons/replace-teacher', authMiddleware, adminOnly, replaceTeacher);

/* ================== УПРАВЛЕНИЕ ГРУППАМИ ================== */

/**
 * Получить список всех групп
 * @route GET /api/admin/groups
 * @middleware authMiddleware, adminOnly
 */
router.get('/groups', authMiddleware, adminOnly, getGroups);

/**
 * Создать новую группу
 * @route POST /api/admin/groups
 * @middleware authMiddleware, adminOnly
 */
router.post('/groups', authMiddleware, adminOnly, createGroup);

/**
 * Удалить группу (и все её занятия, если есть каскад)
 * @route DELETE /api/admin/groups/:id
 * @middleware authMiddleware, adminOnly
 */
router.delete('/groups/:id', authMiddleware, adminOnly, deleteGroup);

/* ================== УПРАВЛЕНИЕ ЗАНЯТИЯМИ ================== */

/**
 * Получить все занятия (с фильтром ?groupId=...)
 * @route GET /api/admin/lessons
 * @middleware authMiddleware, adminOnly
 */
router.get('/lessons', authMiddleware, adminOnly, getLessons);

/**
 * Добавить новое занятие
 * @route POST /api/admin/lessons
 * @middleware authMiddleware, adminOnly
 */
router.post('/lessons', authMiddleware, adminOnly, createLesson);

/**
 * Удалить занятие по ID
 * @route DELETE /api/admin/lessons/:id
 * @middleware authMiddleware, adminOnly
 */
router.delete('/lessons/:id', authMiddleware, adminOnly, deleteLesson);

/* ================== ИСТОРИЯ ИЗМЕНЕНИЙ ================== */

/**
 * Получить историю изменений (аудит-лог)
 * @route GET /api/admin/changes
 * @middleware authMiddleware, adminOnly
 * @query {number} [limit=50] - Количество записей
 * @query {number} [offset=0] - Смещение для пагинации
 */
router.get('/changes', authMiddleware, adminOnly, getChangeHistory);

// Экспортируем роутер
module.exports = router;
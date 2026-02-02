/**
 * @file audit.service.js
 * @description Сервис для логирования изменений в расписании (аудит-лог).
 * 
 * Записывает все действия администратора в таблицу schedule_changes для:
 * - Отслеживания, кто и когда что изменил
 * - Возможности анализа ошибок
 * - Будущей реализации отката изменений
 * 
 * Используется в admin.controller.js для всех операций (создание, удаление, массовые действия).
 * 
 * @requires ../db - Пул соединений PostgreSQL
 * 
 * @module services/audit
 */

/**
 * Пул соединений к БД (импортирован из db.js)
 * @type {Pool}
 */
const pool = require('../db');

/**
 * Логирует действие администратора в таблицу schedule_changes
 * 
 * @async
 * @function logChange
 * @param {number} adminId - ID администратора (из users.id)
 * @param {string} actionType - Тип действия (например, 'create_lesson', 'delete_group', 'copy_week')
 * @param {string} targetType - Тип объекта ('lesson', 'group', 'lessons')
 * @param {number|null} [targetId=null] - ID изменённого объекта (если применимо, иначе null для массовых операций)
 * @param {Object|Array|null} [oldValue=null] - Старое значение (объект или массив для массовых операций)
 * @param {Object|Array|null} [newValue=null] - Новое значение
 * @param {string|null} [description=null] - Человекочитаемое описание (по умолчанию = actionType)
 * 
 * @returns {Promise<void>}
 * 
 * @throws Не бросает ошибку — логирование не должно прерывать основную операцию
 * 
 * @example
 * await logChange(
 *   req.user.id,
 *   'create_lesson',
 *   'lesson',
 *   lessonId,
 *   null,
 *   lessonData,
 *   'Создано занятие: Математика (ауд. 301)'
 * );
 */

async function logChange({
  adminId,
  actionType,
  targetType,
  targetId = null,
  oldValue = null,
  newValue = null
}) {
  try {
    await pool.query(
      `
      INSERT INTO schedule_changes
      (admin_id, action_type, target_type, target_id, old_value, new_value)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        adminId,
        actionType,
        targetType,
        targetId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null
      ]
    );
  } catch (err) {
    console.error('Ошибка логирования изменения:', {
      adminId,
      actionType,
      targetType,
      targetId,
      error: err.message
    });
  }
}

module.exports = { logChange };
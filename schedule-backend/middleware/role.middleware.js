/**
 * @file role.middleware.js
 * @description Middleware для проверки роли пользователя.
 * 
 * Разрешает доступ только пользователям с ролью 'admin'.
 * Используется в связке с authMiddleware (который добавляет req.user).
 * 
 * Защищает админские роуты от доступа студентов и неавторизованных пользователей.
 * 
 * @requires ./auth.middleware - Должен быть вызван до adminOnly (чтобы req.user был установлен)
 * 
 * @middleware
 */

/**
 * Middleware проверки роли администратора
 * 
 * @function adminOnly
 * @param {Object} req - Express request object
 * @param {Object} req.user - Данные пользователя из JWT (из authMiddleware)
 * @param {string} req.user.role - Роль пользователя ('admin' или 'student')
 * @param {Object} res - Express response object
 * @param {Function} next - Следующий middleware в цепочке
 * 
 * @returns {void} Вызывает next() если роль 'admin'
 * @throws {403} Если роль не 'admin'
 * 
 * @example
 * // Использование в роуте
 * router.get('/groups', authMiddleware, adminOnly, adminController.getGroups);
 */
function adminOnly(req, res, next) {
  // Проверяем, что пользователь аутентифицирован и имеет роль admin
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Доступ запрещён: требуется роль admin' 
    });
  }

  // Доступ разрешён — передаём управление следующему обработчику
  next();
}

// Экспортируем middleware
module.exports = adminOnly;
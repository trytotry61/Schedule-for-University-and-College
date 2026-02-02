/**
 * @file auth.js
 * @description Обработчик формы авторизации на странице входа (index.html).
 * 
 * Основные функции:
 * - Отправка данных логина на сервер через apiRequest
 * - Сохранение accessToken в localStorage
 * - Декодирование JWT для определения роли пользователя
 * - Редирект на соответствующую страницу (admin.html или schedule.html)
 * 
 * Зависимости:
 * - apiRequest из api.js (для запросов с токеном и refresh)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Элементы формы
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const errorEl = document.getElementById('loginError');

  /**
   * Декодирует payload JWT-токена (без проверки подписи)
   * 
   * @param {string} token - JWT-токен в формате "header.payload.signature"
   * @returns {Object|null} Распарсенный payload или null при ошибке
   */
  function decodeToken(token) {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (e) {
      console.error('Ошибка декодирования токена:', e);
      return null;
    }
  }

  /**
   * Обработчик отправки формы авторизации
   */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Валидация полей
    if (!email || !password) {
      errorEl.textContent = 'Введите email и пароль';
      return;
    }

    try {
      // Запрос на сервер для авторизации
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem('accessToken', result.accessToken);
      const payload = decodeToken(result.accessToken);

      if (!payload || !payload.role) {
        errorEl.textContent = 'Ошибка авторизации: роль не определена';
        localStorage.removeItem('accessToken');
        return;
      }

      // Редирект в зависимости от роли пользователя
      if (payload.role === 'admin') {
        window.location.href = 'admin.html';
      } else if (payload.role === 'student' || payload.role === 'teacher') {
        // Учителя и студенты пока могут ходить на одну страницу расписания
        // Либо замените на 'teacher_schedule.html', если создадите её
        window.location.href = 'schedule.html';
      } else {
        errorEl.textContent = 'Неизвестная роль пользователя: ' + payload.role;
        localStorage.removeItem('accessToken');
      }
    } catch (err) {
      // Обработка ошибок от apiRequest
      errorEl.textContent = err.message || 'Ошибка входа';
      console.error('Ошибка логина:', err);
    }
  });
});
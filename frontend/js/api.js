/**
 * @file api.js
 * @description Центральный модуль для выполнения API-запросов к backend.
 * Поддерживает:
 * - Автоматическую отправку accessToken в заголовке Authorization
 * - Автоматическое обновление accessToken через refresh token при 401
 * - Отправку cookies (для refreshToken)
 * - Единый обработчик ошибок и логаут при неудачном refresh
 * 
 * Доступен глобально как window.apiRequest и window.logout
 */

/**
 * Базовый URL API сервера
 * @constant {string}
 * @default 'http://localhost:3000'
 * @todo В продакшене заменить на относительный путь '' или вынести в переменную окружения
 */
const API_URL = 'http://localhost:3000';

/**
 * Выполняет запрос к API с автоматической обработкой аутентификации
 * 
 * @async
 * @function apiRequest
 * @param {string} path - Путь API (например, '/api/schedule' или '/api/admin/groups')
 * @param {Object} [options={}] - Опции fetch (method, body, headers и т.д.)
 * @param {string} [options.method='GET'] - HTTP-метод
 * @param {Object|string} [options.body] - Тело запроса (будет преобразовано в JSON)
 * @param {Object} [options.headers] - Дополнительные заголовки
 * 
 * @returns {Promise<Object>} Распарсенные данные ответа (JSON)
 * @throws {Error} Если запрос неуспешен (после всех попыток refresh)
 * 
 * @example
 * const groups = await apiRequest('/api/admin/groups');
 */
async function apiRequest(path, options = {}) {
  let accessToken = localStorage.getItem('accessToken');
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'include'
  };
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  let response = await fetch(API_URL + path, config);
  if (response.status === 401) {
    const refreshResponse = await fetch(API_URL + '/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });

    if (refreshResponse.ok) {
      const refreshData = await refreshResponse.json();
      accessToken = refreshData.accessToken;
      localStorage.setItem('accessToken', accessToken);

      // Повторяем оригинальный запрос с новым токеном
      config.headers.Authorization = `Bearer ${accessToken}`;
      response = await fetch(API_URL + path, config);
    } else {
      // Не удалось обновить токен — принудительный логаут
      await performLogout();
      throw new Error('Сессия истекла. Войдите заново.');
    }
  }

  // Парсим тело ответа 
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    // Тело пустое или не JSON — нормально для некоторых запросов (например, DELETE)
  }

  // Проверяем успешность ответа
  if (!response.ok) {
    const message = data?.message || `Ошибка ${response.status}`;
    throw new Error(message);
  }

  return data;
}

/**
 * Выполняет полный логаут пользователя
 * 
 * @async
 * @function performLogout
 * @description
 * - Отправляет запрос на сервер для очистки refreshToken cookie
 * - Удаляет accessToken из localStorage
 * - Перенаправляет на страницу входа
 */
async function performLogout() {
  try {
    await fetch(API_URL + '/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } catch (err) {
    console.warn('Ошибка при отправке логаута на сервер:', err);
  } finally {
    localStorage.removeItem('accessToken');
    window.location.href = 'index.html';
  }
}
function getCurrentUser() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload; // { id, email, role, group, exp }
  } catch (e) {
    console.error('Ошибка декодирования токена', e);
    return null;
  }
}


window.apiRequest = apiRequest;
window.logout = performLogout;
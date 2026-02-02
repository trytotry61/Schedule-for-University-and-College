/**
 * @file data.js
 * @description Слой данных для работы с расписанием (Data Layer).
 * 
 * Основные функции:
 * - Инициализация IndexedDB для оффлайн-кэша
 * - "Умная" загрузка расписания: 
 *   - Онлайн — запрос к серверу + кэширование в IndexedDB
 *   - Оффлайн — возврат из IndexedDB
 *   - Fallback на кэш при ошибке сети
 * 
 * Используется в schedule.js для загрузки расписания.
 * 
 * Зависимости:
 * - window.DB (из db.js) — работа с IndexedDB
 * - localStorage.accessToken — для авторизации запросов
 * 
 * @global
 * @property {Object} window.DataLayer - Глобальный объект с методами initDataLayer и getScheduleSmart
 */

/* ================== DATA LAYER ================== */

(() => {
  /** @private @type {boolean} Флаг готовности IndexedDB */
  let dbReady = false;

  /**
   * Инициализирует IndexedDB для оффлайн-кэша
   * 
   * @async
   * @function initDataLayer
   * @returns {Promise<void>}
   * @throws {Error} Если IndexedDB не удалось открыть
   * 
   * @example
   * await window.DataLayer.initDataLayer();
   */
  async function initDataLayer() {
    if (!dbReady) {
      await window.DB.openDB();
      dbReady = true;
    }
  }

  /**
   * "Умная" загрузка расписания с поддержкой оффлайн-режима
   * 
   * Логика работы:
   * 1. Если оффлайн — пытается взять данные из IndexedDB
   * 2. Если онлайн — делает запрос к серверу, кэширует результат
   * 3. При ошибке сети — fallback на кэш из IndexedDB
   * 
   * @async
   * @function getScheduleSmart
   * @param {number} [weekOffset=0] - Смещение недели относительно текущей (0 = текущая, -1 = предыдущая и т.д.)
   * @returns {Promise<Object>} Данные расписания (как возвращает /api/schedule)
   * @throws {Error} Если данные недоступны ни онлайн, ни оффлайн
   * 
   * @example
   * const schedule = await window.DataLayer.getScheduleSmart(0);
   */
  async function getScheduleSmart(weekOffset = 0) {
    const token = localStorage.getItem('accessToken');  // Используем accessToken после перехода на новую систему

    // === ОФФЛАЙН РЕЖИМ ===
    if (!navigator.onLine) {
      const cached = await window.DB.getScheduleFromDB(weekOffset);
      if (cached) {
        console.log('Расписание загружено из оффлайн-кэша (IndexedDB)');
        return cached;
      }
      throw new Error('OFFLINE_NO_DATA');
    }

    // === ОНЛАЙН РЕЖИМ ===
    try {
      const response = await fetch(`http://localhost:3000/api/schedule?weekOffset=${weekOffset}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка сервера');
      }

      const data = await response.json();

      await window.DB.saveScheduleToDB(weekOffset, data);

      console.log('Расписание загружено с сервера и закэшировано');
      return data;
    } catch (err) {
      console.warn('Ошибка сети, пытаемся загрузить из кэша:', err);

      const cached = await window.DB.getScheduleFromDB(weekOffset);
      if (cached) {
        console.log('Fallback: расписание загружено из кэша');
        return cached;
      }

      throw err; 
    }
  }

  // Экспортируем методы глобально
  window.DataLayer = {
    initDataLayer,
    getScheduleSmart
  };
})();
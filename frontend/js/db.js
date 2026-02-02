/**
 * @file db.js
 * @description Модуль для работы с IndexedDB — локальным хранилищем браузера для оффлайн-кэша расписания.
 * 
 * Основные функции:
 * - Открытие и инициализация базы данных
 * - Сохранение расписания по смещению недели (weekOffset)
 * - Чтение закэшированного расписания
 * 
 * Используется в data.js для реализации оффлайн-режима.
 * 
 * Хранилище:
 * - DB_NAME: 'schedule-db'
 * - STORE_NAME: 'weeks'
 * - Ключ: weekOffset (число)
 * - Значение: { weekOffset, data, timestamp }
 * 
 * @global
 * @property {Object} window.DB - Глобальный объект с методами openDB, getScheduleFromDB, saveScheduleToDB
 */

/* ================== DB.JS (IndexedDB для оффлайн-кэша) ================== */

(() => {
  /** @private @constant {string} Имя базы данных IndexedDB */
  const DB_NAME = 'schedule-db';

  /** @private @constant {number} Версия базы данных (увеличивать при изменении структуры) */
  const DB_VERSION = 1;

  /** @private @constant {string} Имя хранилища объектов (object store) */
  const STORE_NAME = 'weeks';

  /** @private @type {IDBDatabase|null} Экземпляр открытой базы данных */
  let db = null;

  /**
   * Открывает (или создаёт) базу данных IndexedDB
   * 
   * @async
   * @function openDB
   * @returns {Promise<void>} Resolve при успешном открытии
   * @throws {Error} При ошибке открытия базы
   * 
   * @example
   * await window.DB.openDB();
   */
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      /**
       * Событие: необходимо обновить структуру базы (первое открытие или смена версии)
       */
      request.onupgradeneeded = (e) => {
        const database = e.target.result;

        // Создаём хранилище, если его нет
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'weekOffset' });
          console.log('Создано хранилище IndexedDB:', STORE_NAME);
        }
      };

      /**
       * Успешное открытие базы
       */
      request.onsuccess = () => {
        db = request.result;
        console.log('IndexedDB открыта:', DB_NAME);
        resolve();
      };

      /**
       * Ошибка открытия базы
       */
      request.onerror = () => {
        console.error('Ошибка открытия IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Получает закэшированное расписание по смещению недели
   * 
   * @async
   * @function getScheduleFromDB
   * @param {number} weekOffset - Смещение недели (0 = текущая, -1 = предыдущая и т.д.)
   * @returns {Promise<Object|null>} Данные расписания или null, если нет в кэше
   * 
   * @example
   * const cached = await window.DB.getScheduleFromDB(0);
   */
  function getScheduleFromDB(weekOffset) {
    return new Promise((resolve) => {
      if (!db) {
        console.warn('IndexedDB не открыта');
        return resolve(null);
      }

      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(weekOffset);

      req.onsuccess = () => {
        const result = req.result;
        if (result && result.data) {
          console.log(`Расписание для weekOffset=${weekOffset} найдено в кэше`);
          resolve(result.data);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => {
        console.error('Ошибка чтения из IndexedDB:', req.error);
        resolve(null);
      };
    });
  }

  /**
   * Сохраняет расписание в IndexedDB для оффлайн-доступа
   * 
   * @async
   * @function saveScheduleToDB
   * @param {number} weekOffset - Смещение недели
   * @param {Object} data - Полные данные расписания (как от /api/schedule)
   * @returns {Promise<void>}
   * 
   * @example
   * await window.DB.saveScheduleToDB(0, scheduleData);
   */
  function saveScheduleToDB(weekOffset, data) {
    return new Promise((resolve) => {
      if (!db) {
        console.warn('IndexedDB не открыта — кэширование пропущено');
        return resolve();
      }

      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      store.put({
        weekOffset,
        data,
        timestamp: Date.now()
      });

      tx.oncomplete = () => {
        console.log(`Расписание для weekOffset=${weekOffset} сохранено в кэш`);
        resolve();
      };

      tx.onerror = () => {
        console.error('Ошибка сохранения в IndexedDB:', tx.error);
        resolve(); // Не бросаем ошибку — кэш не критичен
      };
    });
  }

  //Используем в data.js и schedule.js
  window.DB = {
    openDB,
    getScheduleFromDB,
    saveScheduleToDB
  };
})();
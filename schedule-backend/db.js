/**
 * @file db.js
 * @description Конфигурация подключения к базе данных PostgreSQL с использованием pg.Pool.
 * 
 * Создаёт пул соединений для эффективной работы с БД во всех контроллерах.
 * 
 * Поддерживает два способа конфигурации:
 * 1. Через connectionString (удобно для продакшена, например Heroku, Render)
 * 2. Через отдельные переменные окружения (для локальной разработки)
 * 
 * @requires pg - Библиотека node-postgres
 * @requires dotenv - Для загрузки переменных из .env
 * 
 * @module db
 * @exports {Pool} pool - Экземпляр pg.Pool для использования в приложении
 */

require('dotenv').config();  // Загружаем переменные из .env

const { Pool } = require('pg');

/**
 * Пул соединений к PostgreSQL
 * 
 * @type {Pool}
 * @description
 * - Управляет множеством соединений (переиспользование, ограничение)
 * - Используется во всех контроллерах для запросов к БД
 * 
 * Конфигурация:
 * - Приоритет у DATABASE_URL (стандарт для облачных платформ)
 * - Если нет — используем отдельные переменные
 * 
 * Рекомендуемые переменные в .env:
 * @example
 * DATABASE_URL=postgres://user:password@localhost:5432/schedule_db
 * 
 * # Или отдельно:
 * DB_USER=postgres
 * DB_PASSWORD=2305200711egoralina
 * DB_HOST=localhost
 * DB_PORT=5432
 * DB_NAME=schedule_db
 * 
 * @todo В продакшене добавить ssl: { rejectUnauthorized: false } для облачных БД
 */
const pool = new Pool({
  // Если есть DATABASE_URL — используем его (стандарт для Render, Railway, Heroku)
  connectionString: process.env.DATABASE_URL,
  // Если DATABASE_URL нет — собираем из отдельных переменных
  ...(process.env.DATABASE_URL ? {} : {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'schedule_db'
  }),
  // Для облачных БД (например, Neon, Supabase) — включаем SSL в проде
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Экспортируемый пул соединений
 * 
 * Использование в контроллерах:
 * @example
 * const pool = require('../db');
 * const { rows } = await pool.query('SELECT * FROM lessons');
 */
module.exports = pool;
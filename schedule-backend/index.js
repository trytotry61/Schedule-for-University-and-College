/**
 * @file index.js
 * @description Точка входа в backend-приложение (Node.js + Express).
 * 
 * Основные функции:
 * - Загрузка переменных окружения (.env)
 * - Настройка Express-сервера
 * - Подключение middleware (CORS, JSON-парсер, rate limiting)
 * - Подключение статических файлов фронтенда
 * - Регистрация маршрутов (auth, schedule, admin)
 * - Запуск сервера на порту
 * 
 * @requires express - Веб-фреймворк
 * @requires cors - Разрешение кросс-доменных запросов
 * @requires express-rate-limit - Защита от брута и DDoS
 * @requires dotenv - Загрузка переменных окружения
 * 
 * @module server
 */

require('dotenv').config();  // Загружаем переменные из .env (JWT_SECRET, DB_* и т.д.)

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Импорт маршрутов
const authRoutes = require('./routes/auth.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const scheduleDayRoutes = require('./routes/scheduleDay.routes');
const adminRoutes = require('./routes/admin.routes');
const cookieParser = require('cookie-parser');
const adminTeacherRoutes = require('./routes/adminTeacher.routes')
const teacherScheduleRoutes=require('./routes/teacherSchedule.routes')
const adminLessonsRoutes = require('./routes/adminLessons.routes');
const groupsRoutes = require('./routes/groups.routes');
const adminAuditRoutes = require('./routes/adminAudit.routes');






// Создаём приложение Express
const app = express();

// === MIDDLEWARE ===

// Разрешаем CORS-запросы с фронтенда
app.use(cors({
  origin: 'http://localhost:3000', // или порт твоего фронтенда
  credentials: true
}));


// Парсим JSON-тела запросов
app.use(express.json());
app.use(cookieParser());
app.use('/api/schedule', scheduleDayRoutes);
/** Подключаем учителей  и их расписание к базе данных */
app.use('/api/admin', adminTeacherRoutes);
app.use('/api/teacher', teacherScheduleRoutes);
app.use('/api/admin', adminLessonsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/admin', adminAuditRoutes);

// === RATE LIMITING (защита от атак) ===

/**
 * Общий лимитер для всех запросов
 * @type {Function}
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 200,                 // максимум 200 запросов с одного IP
  message: { message: 'Слишком много запросов, попробуйте позже' },
  standardHeaders: true,    // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,     // Disable the `X-RateLimit-*` headers
});

app.use(generalLimiter);

/**
 * Строгий лимитер для попыток входа (защита от брутфорса)
 * @type {Function}
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,  // только 10 попыток за 15 минут
  message: { message: 'Слишком много попыток входа. Подождите 15 минут.' }
});

app.use('/api/auth/login', authLimiter);

/**
 * Лимитер для админских роутов (админ делает меньше запросов)
 * @type {Function}
 */
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/admin', adminLimiter);

// === СТАТИЧЕСКИЕ ФАЙЛЫ ===
// Отдаём фронтенд (HTML, CSS, JS) из папки ../frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// === МАРШРУТЫ API ===
app.use('/api/auth', authRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/admin', adminRoutes);

// === ЗАПУСК СЕРВЕРА ===
const PORT = process.env.PORT || 3000;  // process.env.PORT для продакшена (Render, Railway)

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
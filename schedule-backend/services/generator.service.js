/**
 * @file services/generator.service.js
 * @description Сервис для генерации конкретных занятий на основе шаблонов
 */
const pool = require('../db');

// Настройки семестра (можно вынести в конфиг или БД)
const SEMESTER_START = new Date('2023-09-01'); // Укажите реальное начало
const SEMESTER_END = new Date('2023-12-31');   // Укажите реальный конец

/**
 * Генерирует даты для занятия на основе дня недели и типа недели
 * @param {number} dayOfWeek - 0 (Пн) - 5 (Сб) (в вашей системе массив days начинается с Пн)
 * @param {number} weekType - 0 (все), 1 (четная), 2 (нечетная)
 */
function generateDates(dayOfWeek, weekType) {
  const dates = [];
  let currentDate = new Date(SEMESTER_START);

  // Корректируем currentDate до первого нужного дня недели
  // В JS getDay(): 0=Вс, 1=Пн... Ваша система: 0=Пн...
  // Преобразуем вашу систему (0=Пн) в JS (1=Пн)
  const targetJsDay = dayOfWeek + 1; 

  while (currentDate <= SEMESTER_END) {
    // Если день недели совпадает
    if (currentDate.getDay() === targetJsDay) {
      const isEven = getWeekNumber(currentDate) % 2 === 0;
      
      // Логика weekType: 0=любая, 1=четная, 2=нечетная
      // Примечание: тут нужно согласовать вашу логику четности
      let match = false;
      if (weekType === 0) match = true;
      else if (weekType === 1 && isEven) match = true;
      else if (weekType === 2 && !isEven) match = true;

      if (match) {
        dates.push(new Date(currentDate));
      }
    }
    // Следующий день
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

// Вспомогательная функция номера недели
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

module.exports = { generateDates };
/**
 * @file week.service.js
 * @description Сервис для расчёта информации об учебной неделе.
 * 
 * Учебный год начинается 1 сентября.
 * Неделя считается с понедельника по воскресенье.
 * Поддерживает смещение (weekOffset) для прошлых и будущих недель.
 */

/**
 * Возвращает информацию о неделе с учётом смещения
 * 
 * @param {number} [weekOffset=0] - Смещение от текущей недели (0 — текущая, -1 — предыдущая и т.д.)
 * @returns {Object} Информация о неделе
 */
function getWeekInfo(weekOffset = 0) {
  const now = new Date();

  // Определяем дату начала текущего учебного года (1 сентября)
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const academicYearStart = new Date(year, 8, 1); // 1 сентября

  // Смещаем дату на нужное количество недель
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + weekOffset * 7);

  // Выравниваем на понедельник (начало недели)
  const dayOfWeek = targetDate.getDay(); // 0 = вс, 1 = пн, ..., 6 = сб
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // смещение до ближайшего понедельника назад
  const weekStart = new Date(targetDate);
  weekStart.setDate(targetDate.getDate() + diffToMonday);

  // Конец недели — воскресенье
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // Номер недели от начала учебного года
  const diffDays = Math.floor((weekStart - academicYearStart) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;

  return {
    weekNumber,
    isEven: weekNumber % 2 === 0,
    weekType: weekNumber % 2 === 0 ? 'чётная' : 'нечётная',
    weekStart: formatLocalDate(weekStart),
    weekEnd: formatLocalDate(weekEnd)
  };

}
/**
 * @function formatLocalDate Натраивает верный формат выаода даты и поэтому число не сбивается и все даты выведены корренктно
 * @param {number} date 
 * @returns Верную дату с учетом временого пояса 
 */
function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


module.exports = { getWeekInfo };
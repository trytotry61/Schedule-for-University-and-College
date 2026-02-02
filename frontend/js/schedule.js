document.addEventListener('DOMContentLoaded', () => {
  const scheduleGrid = document.getElementById('scheduleGrid');
  const lessonsLayer = document.getElementById('lessonsLayer');
  const weekInfoEl = document.getElementById('weekInfo');
  const currentTimeLine = document.getElementById('currentTimeLine');
  const btnPrevWeek = document.getElementById('btnPrevWeek');
  const btnNextWeek = document.getElementById('btnNextWeek');

  let currentWeekOffset = 0;
  const SLOT_MINUTES = 30;
  const ROW_HEIGHT = 40;

  function init() {
    loadSchedule();
    updateTimeLine();
    setInterval(updateTimeLine, 60000);
  }

  // === ГЕНЕРАЦИЯ СЕТКИ (ТОЧНО КАК В СТАРОМ ФАЙЛЕ) ===
  function renderGrid(weekStartDate) {
    if (!scheduleGrid) return;
    scheduleGrid.innerHTML = '';

    const days = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
    
    // 1. Определяем "сегодня"
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Вс, 1=Пн...
    const todayIndex = dayOfWeek === 0 ? -1 : dayOfWeek - 1; // Индекс для массива days

    // 2. Создаем пустой угол
    const corner = document.createElement('div');
    corner.className = 'grid-header';
    scheduleGrid.appendChild(corner);

    // 3. Создаем заголовки дней (С ВЫДЕЛЕНИЕМ)
    days.forEach((day, index) => {
      const header = document.createElement('div');
      header.className = 'grid-header';
      
      // ПРОВЕРКА: Если это текущая неделя и текущий день — добавляем класс today
      if (currentWeekOffset === 0 && index === todayIndex) {
        header.classList.add('today'); 
        console.log("Выделен день:", day); // Для отладки в консоли
      }

      let dateText = '';
      if (weekStartDate) {
        const date = new Date(weekStartDate);
        date.setDate(date.getDate() + index);
        dateText = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      }

      header.innerHTML = `
        <div>${day}</div>
        <div class="day-date" style="font-size: 0.8em; font-weight: normal; opacity: 0.8;">${dateText}</div>
      `;
      scheduleGrid.appendChild(header);
    });

    // 4. Шкала времени слева
    for (let h = 8; h <= 20; h++) {
      const timeDiv = document.createElement('div');
      timeDiv.className = 'time-label';
      timeDiv.textContent = `${h}:00`;
      timeDiv.style.gridColumn = '1';
      timeDiv.style.gridRow = timeToRow(`${h}:00`);
      scheduleGrid.appendChild(timeDiv);
    }
  }

  async function loadSchedule() {
    const user = getCurrentUser();
    if (!user) return;

    try {
      // Важно: проверяем как называется параметр в твоем API (group или groupId)
      const data = await apiRequest(`/api/schedule?weekOffset=${currentWeekOffset}&group=${encodeURIComponent(user.group)}`);
      
      // Сначала строим сетку, потом уроки
      renderGrid(data.weekStart); 
      
      if (weekInfoEl) {
        weekInfoEl.textContent = `${data.weekStart} — ${data.weekEnd} (${data.weekType})`;
      }

      renderLessons(data.lessons);
      if (currentWeekOffset === 0) scrollToCurrentDay();
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    }
  }

  // Остальные функции (renderLessons, timeToRow, updateTimeLine) 
  // должны оставаться без изменений, как в предыдущем рабочем коде.
  
  function timeToRow(timeStr) {
    if (!timeStr) return 2;
    const [h, m] = timeStr.split(':').map(Number);
    return Math.floor(((h - 8) * 60 + m) / SLOT_MINUTES) + 2;
  }

  function renderLessons(lessons) {
    lessonsLayer.innerHTML = '';
    if (!lessons) return;
    lessons.forEach(lesson => {
      const date = new Date(lesson.lesson_date);
      let dayIdx = date.getDay(); 
      if (dayIdx === 0) return; 
      const card = document.createElement('div');
      card.className = `lesson ${lesson.type || 'lecture'}`;
      card.style.gridColumn = dayIdx + 1;
      card.style.gridRow = `${timeToRow(lesson.start_time)} / ${timeToRow(lesson.end_time)}`;
      card.innerHTML = `
        <div class="lesson-title">${lesson.subject}</div>
        <div class="lesson-info">📍 ${lesson.room || ''}</div>
        <div class="lesson-info">👤 ${lesson.teacher || ''}</div>
      `;
      lessonsLayer.appendChild(card);
    });
  }

  function updateTimeLine() {
    if (!currentTimeLine) return;
    if (currentWeekOffset !== 0) {
      currentTimeLine.style.display = 'none';
      return;
    }
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes(), day = now.getDay();
    if (h < 8 || h > 20 || day === 0) {
      currentTimeLine.style.display = 'none';
      return;
    }
    currentTimeLine.style.display = 'block';
    const row = timeToRow(`${h}:${m}`);
    const top = (row - 2) * (ROW_HEIGHT / (60 / SLOT_MINUTES)) + ROW_HEIGHT; 
    // Если ROW_HEIGHT 40, то расчет должен соответствовать высоте строки в CSS
    currentTimeLine.style.top = `${(row - 2) * 40 + 40}px`;
    currentTimeLine.style.gridColumn = day + 1;
  }

  function scrollToCurrentDay() {
    const today = new Date().getDay();
    if (today === 0) return;
    const wrapper = document.getElementById('scheduleWrapper');
    if (wrapper) wrapper.scrollLeft = (today - 1) * (wrapper.scrollWidth / 7);
  }

  if (btnPrevWeek) btnPrevWeek.onclick = () => { currentWeekOffset--; loadSchedule(); };
  if (btnNextWeek) btnNextWeek.onclick = () => { currentWeekOffset++; loadSchedule(); };

  init();
});
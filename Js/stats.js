function initStatsPage() {
    updateStatsDisplay();
    renderActivityCalendar();
}

function updateStatsDisplay() {
    const streak = AppState.user.streak;
    document.getElementById('streakDisplay').textContent = streak;
    
    let streakText = 'дней подряд';
    if (streak % 10 === 1 && streak % 100 !== 11) streakText = 'день подряд';
    else if (streak % 10 >= 2 && streak % 10 <= 4 && (streak % 100 < 10 || streak % 100 >= 20)) streakText = 'дня подряд';
    document.getElementById('streakLabel').textContent = streakText;
    
    document.getElementById('learnedWordsStat').textContent = AppState.user.learnedWords;
    
    // Используем реальное время занятий (в минутах)
    const studyTime = Math.floor(AppState.user.studyTime / 60);
    document.getElementById('studyTimeStat').textContent = studyTime;
    
    const accuracy = AppState.user.learnedWords > 0 ? 
        Math.min(95, 70 + Math.floor(AppState.user.streak * 0.5)) : 0;
    document.getElementById('accuracyStat').textContent = accuracy + '%';
}

function renderActivityCalendar() {
    const calendar = document.getElementById('activityCalendar');
    const monthLabels = document.getElementById('monthLabels');
    if (!calendar || !monthLabels) return;
    
    // Проверяем мобильное устройство
    const isMobile = window.innerWidth <= 600;
    
    // На ПК: 7x54 = 378 дней (полный год)
    // На мобильном: 7x27 = 189 дней (полгода)
    const weeks = isMobile ? 27 : 54;
    const gridCols = isMobile ? 'repeat(27, 1fr)' : 'repeat(54, minmax(4px, 1fr))';
    const daysInWeek = 7;
    const totalDays = weeks * daysInWeek;
    
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalDays + 1);
    
    // Генерируем подписи месяцев
    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const monthLabelsArray = new Array(weeks).fill('');
    
    for (let week = 0; week < weeks; week++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + (week * 7) + 3);
        
        const month = date.getMonth();
        const monthName = monthNames[month];
        
        if (week === 0) {
            monthLabelsArray[week] = monthName;
        } else {
            const prevDate = new Date(startDate);
            prevDate.setDate(prevDate.getDate() + ((week - 1) * 7) + 3);
            const prevMonth = prevDate.getMonth();
            
            if (month !== prevMonth) {
                monthLabelsArray[week] = monthName;
            }
        }
    }
    
    let monthsHtml = '';
    for (let i = 0; i < monthLabelsArray.length; i++) {
        monthsHtml += '<div class="month-label">' + monthLabelsArray[i] + '</div>';
    }
    monthLabels.innerHTML = monthsHtml;
    
    monthLabels.style.display = 'grid';
    monthLabels.style.gridTemplateColumns = gridCols;
    monthLabels.style.gap = isMobile ? '1px' : '2px';
    monthLabels.style.width = '100%';
    
    const activity = AppState.user.activity;
    const daySquares = [];
    
    // GitHub-style: сначала дни недели (строки), потом недели (колонки)
    for (let dayOfWeek = 0; dayOfWeek < daysInWeek; dayOfWeek++) {
        for (let week = 0; week < weeks; week++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + (week * 7) + dayOfWeek);
            
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = year + '-' + month + '-' + day;
            const isActive = activity && activity[dateStr];
            
            daySquares.push('<div class="day-square' + (isActive ? ' active' : '') + '" title="' + dateStr + '"></div>');
        }
    }
    
    calendar.style.display = 'grid';
    calendar.style.gridTemplateColumns = gridCols;
    calendar.style.gridTemplateRows = isMobile ? 'repeat(7, 1fr)' : 'repeat(7, minmax(12px, auto))';
    calendar.style.gap = isMobile ? '1px' : '2px';
    calendar.style.width = '100%';
    
    calendar.innerHTML = daySquares.join('');
}

// Обновление статистики раз в секунду
setInterval(() => {
    if (document.querySelector('.stats-page')) {
        updateStatsDisplay();
    }
}, 1000);

// Перерисовка календаря при изменении размера окна
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (document.querySelector('.stats-page')) {
            renderActivityCalendar();
        }
    }, 100);
});

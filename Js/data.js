// Состояние приложения
const AppState = {
    user: {
        name: 'Пользователь',
        username: 'username',
        avatar: '👤',
        theme: 'dark',
        streak: 0,
        lastStudyDate: null,
        learnedWords: 0,
        studyTime: 0,
        activity: {}
    },
    
    favoriteDeck: { 
        id: 'favorite', 
        name: 'Избранное', 
        cards: [],
        isFavorite: true
    },
    
    forgottenDeck: { 
        id: 'forgotten', 
        name: 'Забытые карты', 
        cards: [],
        isForgotten: true
    },
    
    userDecks: [],
    
    publicDecks: [
        { id: 'pub1', name: '500 самых частотных слов', cardsCount: 500, lang: 'Английский' },
        { id: 'pub2', name: 'Фразовые глаголы', cardsCount: 150, lang: 'Английский' },
        { id: 'pub3', name: 'Business English', cardsCount: 220, lang: 'Английский' },
        { id: 'pub4', name: 'Идиомы', cardsCount: 300, lang: 'Английский' },
        { id: 'pub5', name: 'Сленг', cardsCount: 200, lang: 'Английский' }
    ],
    
    deckCreateTimes: [],
    cardCreateTimes: [],
    
    currentStudy: null
};

// Загрузка из localStorage
function loadState() {
    try {
        const saved = localStorage.getItem('linguaState');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(AppState, parsed);
        }
    } catch (e) {
        console.error('Error loading state:', e);
    }
    
    applyTheme(AppState.user.theme);
}

// Сохранение
function saveState() {
    localStorage.setItem('linguaState', JSON.stringify(AppState));
}

// Применение темы
function applyTheme(theme) {
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = theme === 'light';
    }
}

// Антиспам
function canCreateDeck() {
    const now = Date.now();
    const hourAgo = now - 3600000;
    AppState.deckCreateTimes = AppState.deckCreateTimes.filter(t => t > hourAgo);
    return AppState.deckCreateTimes.length < 10;
}

function canCreateCard() {
    const now = Date.now();
    const hourAgo = now - 3600000;
    AppState.cardCreateTimes = AppState.cardCreateTimes.filter(t => t > hourAgo);
    return AppState.cardCreateTimes.length < 100;
}

// Обновление streak
function updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    
    if (AppState.user.lastStudyDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        if (AppState.user.lastStudyDate === yesterday) {
            AppState.user.streak += 1;
        } else {
            AppState.user.streak = 1;
        }
        
        AppState.user.lastStudyDate = today;
        AppState.user.activity[today] = true;
        saveState();
    }
}

// Инициализация
loadState();

// Скрыть вкладку Профиль при загрузке если не авторизован
const token = localStorage.getItem('lexy_token');
if (!token) {
    const profileTab = document.querySelector('[data-tab="profile"]');
    if (profileTab) profileTab.style.display = 'none';
}

// Обновить кнопку авторизации после загрузки
if (typeof updateAuthButton === 'function') {
    setTimeout(updateAuthButton, 100);
}
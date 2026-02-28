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
        activity: {},
        isRegistered: false
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
    
    // Если пользователь уже вошёл (есть токен), загружаем данные с сервера
    const token = localStorage.getItem('lexy_token');
    if (token && typeof ApiService !== 'undefined') {
        // Сохраняем текущую тему перед загрузкой с сервера
        const currentTheme = AppState.user.theme || 'dark';
        
        // Устанавливаем isRegistered = true так как у пользователя есть токен
        AppState.user.isRegistered = true;
        loadUserDataFromServer().then(() => {
            // Восстанавливаем тему после загрузки с сервера
            AppState.user.theme = currentTheme;
            // Пересохраняем состояние с правильной темой
            saveState();
            // Применяем тему
            applyTheme(AppState.user.theme);
        });
    }
}

// Загрузка данных пользователя с сервера
async function loadUserDataFromServer() {
    try {
        // Загружаем статистику
        const stats = await ApiService.getStats();
        AppState.user.streak = stats.streak || 0;
        AppState.user.learnedWords = stats.learned_words || 0;
        AppState.user.studyTime = stats.study_time || 0;
        AppState.user.accuracy = stats.accuracy || 0;
        // Преобразуем дату в формат YYYY-MM-DD
        if (stats.last_study_date) {
            const d = new Date(stats.last_study_date);
            AppState.user.lastStudyDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        } else {
            AppState.user.lastStudyDate = null;
        }
        
        // Загружаем активность
        const activityData = await ApiService.getActivity();
        if (activityData && activityData.activity) {
            AppState.user.activity = activityData.activity;
        }
        
        // Синхронизируем колоды с сервера
        try {
            const serverData = await ApiService.syncGet();
            if (serverData && serverData.decks) {
                const serverCards = serverData.cards || [];
                
                // Build favorite deck from server data
                const favoriteCards = serverCards
                    .filter(card => card.is_favorite === true || card.is_favorite === 'true')
                    .map(card => ({
                        id: card.id,
                        word: card.front,
                        translation: card.back,
                        is_favorite: true,
                        repetitions: card.repetitions || 0,
                        interval: card.interval || 1,
                        ease: card.ease || 2.5,
                        nextReview: card.next_review
                    }));
                
                // Build forgotten deck from server data
                const forgottenCards = serverCards
                    .filter(card => card.is_forgotten === true || card.is_forgotten === 'true')
                    .map(card => ({
                        id: card.id,
                        word: card.front,
                        translation: card.back,
                        is_forgotten: true,
                        repetitions: card.repetitions || 0,
                        interval: card.interval || 1,
                        ease: card.ease || 2.5,
                        nextReview: card.next_review
                    }));
                
                AppState.favoriteDeck = {
                    id: 'favorite',
                    name: 'Избранное',
                    cards: favoriteCards,
                    isFavorite: true
                };
                
                AppState.forgottenDeck = {
                    id: 'forgotten',
                    name: 'Забытые карты',
                    cards: forgottenCards,
                    isForgotten: true
                };
                
                AppState.userDecks = serverData.decks.map(deck => {
                    const deckCards = serverCards
                        .filter(card => card.deck_id === deck.id)
                        .map(card => ({
                            id: card.id,
                            word: card.front,
                            translation: card.back,
                            is_favorite: card.is_favorite,
                            repetitions: card.repetitions || 0,
                            interval: card.interval || 1,
                            ease: card.ease || 2.5,
                            nextReview: card.next_review
                        }));
                    
                    return {
                        ...deck,
                        id: deck.id,
                        customImage: deck.custom_image || null,
                        source: deck.source || 'created',
                        publicDeckId: deck.public_deck_id || null,
                        cards: deckCards
                    };
                });
            }
        } catch (syncError) {
            console.error('Failed to sync decks:', syncError);
        }
        
        // Сохраняем обновлённые данные
        saveState();
    } catch (e) {
        console.error('Failed to load user data from server:', e);
    }
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
    // Используем локальную дату
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    // Вычисляем вчера
    const yesterday = new Date(Date.now() - 86400000);
    const yYear = yesterday.getFullYear();
    const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
    const yDay = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;
    
    // Проверяем активность за вчера и сегодня
    const activity = AppState.user.activity || {};
    const hadActivityYesterday = activity[yesterdayStr] && activity[yesterdayStr] > 0;
    const hadActivityToday = activity[todayStr] && activity[todayStr] > 0;
    
    if (hadActivityYesterday && !hadActivityToday) {
        // Если была активность вчера и сегодня ещё не было - увеличиваем streak
        AppState.user.streak += 1;
    } else if (!hadActivityYesterday && !hadActivityToday) {
        // Если не было активности ни вчера, ни сегодня - начинаем с 1
        AppState.user.streak = 1;
    }
    // Если уже была активность сегодня - не меняем streak
    
    // Обновляем дату
    AppState.user.lastStudyDate = todayStr;
    
    // Сохраняем на сервере
    if (typeof ApiService !== 'undefined') {
        ApiService.updateStats({
            streak: AppState.user.streak,
            learned_words: AppState.user.learnedWords,
            study_time: AppState.user.studyTime,
            accuracy: AppState.user.accuracy,
            last_study_date: todayStr
        }).catch(err => console.error('Failed to save streak:', err));
    }
    
    // Записываем активность - день стал активным
    if (!AppState.user.activity) {
        AppState.user.activity = {};
    }
    AppState.user.activity[todayStr] = true;
    saveState();
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
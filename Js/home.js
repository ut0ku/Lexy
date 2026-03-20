// Тестовые карточки для демо
const demoCards = [
    { front: 'Hello', back: 'Привет' },
    { front: 'Goodbye', back: 'До свидания' },
    { front: 'Thank you', back: 'Спасибо' },
    { front: 'Please', back: 'Пожалуйста' },
    { front: 'How are you?', back: 'Как дела?' }
];

// Демо колоды с карточками
const demoDecksData = {
    demo_basic: {
        id: 'demo_basic',
        name: 'Английский базовый',
        cards: [
            { id: 'db1', word: 'Hello', translation: 'Привет' },
            { id: 'db2', word: 'Goodbye', translation: 'До свидания' },
            { id: 'db3', word: 'Thank you', translation: 'Спасибо' },
            { id: 'db4', word: 'Please', translation: 'Пожалуйста' },
            { id: 'db5', word: 'Yes', translation: 'Да' },
            { id: 'db6', word: 'No', translation: 'Нет' },
            { id: 'db7', word: 'Good morning', translation: 'Доброе утро' },
            { id: 'db8', word: 'Good night', translation: 'Спокойной ночи' },
            { id: 'db9', word: 'How are you?', translation: 'Как дела?' },
            { id: 'db10', word: 'Nice to meet you', translation: 'Приятно познакомиться' }
        ]
    },
    demo_travel: {
        id: 'demo_travel',
        name: 'Путешествия',
        cards: [
            { id: 'dt1', word: 'Airport', translation: 'Аэропорт' },
            { id: 'dt2', word: 'Hotel', translation: 'Отель' },
            { id: 'dt3', word: 'Ticket', translation: 'Билет' },
            { id: 'dt4', word: 'Passport', translation: 'Паспорт' },
            { id: 'dt5', word: 'Where is...?', translation: 'Где находится...?' },
            { id: 'dt6', word: 'How much?', translation: 'Сколько стоит?' },
            { id: 'dt7', word: 'I need help', translation: 'Мне нужна помощь' },
            { id: 'dt8', word: 'Turn left', translation: 'Поверните налево' }
        ]
    },
    demo_food: {
        id: 'demo_food',
        name: 'Еда и ресторан',
        cards: [
            { id: 'df1', word: 'Water', translation: 'Вода' },
            { id: 'df2', word: 'Bread', translation: 'Хлеб' },
            { id: 'df3', word: 'Cheese', translation: 'Сыр' },
            { id: 'df4', word: 'Coffee', translation: 'Кофе' },
            { id: 'df5', word: 'The check, please', translation: 'Счёт, пожалуйста' },
            { id: 'df6', word: 'Delicious', translation: 'Вкусно' }
        ]
    }
};

let currentDemoCardIndex = 0;
let isDemoCardFlipped = false;

// Инициализация домашней страницы
function initHomePage() {
    currentDemoCardIndex = 0;
    isDemoCardFlipped = false;
    updateDemoCard();
}

// Обновить отображение демо карточки
function updateDemoCard() {
    const card = document.getElementById('demoCard');
    const front = document.getElementById('demoCardFront');
    const back = document.getElementById('demoCardBack');
    const progress = document.getElementById('demoProgressText');
    
    if (!card || !front || !back || !progress) return;
    
    const currentCard = demoCards[currentDemoCardIndex];
    front.textContent = currentCard.front;
    back.textContent = currentCard.back;
    progress.textContent = `${currentDemoCardIndex + 1} / ${demoCards.length}`;
    
    // Сбросить состояние переворота
    card.classList.remove('flipped');
    isDemoCardFlipped = false;
}

// Перевернуть демо карточку
function flipDemoCard() {
    const card = document.getElementById('demoCard');
    if (card) {
        card.classList.toggle('flipped');
        isDemoCardFlipped = !isDemoCardFlipped;
    }
}

// Следующая демо карточка
function nextDemoCard() {
    currentDemoCardIndex++;
    if (currentDemoCardIndex >= demoCards.length) {
        currentDemoCardIndex = 0;
    }
    updateDemoCard();
    
    // Прокрутка к секции демо
    const demoSection = document.getElementById('demoCards');
    if (demoSection) {
        demoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Начать демо карточки
function startDemoCards() {
    const demoSection = document.getElementById('demoCards');
    if (demoSection) {
        demoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Начать изучение демо колоды (использует существующую систему изучения)
function startDemoDeck(deckKey) {
    // Сначала добавить демо колоду в AppState.userDecks
    const demoDeck = demoDecksData[deckKey];
    if (!demoDeck) return;
    
    // Проверить, есть ли уже эта колода
    let existingDeck = AppState.userDecks.find(d => d.id === demoDeck.id);
    
    if (!existingDeck) {
        // Добавить демо колоду
        AppState.userDecks.push({...demoDeck});
    }
    
    // Запустить изучение с режимом 1 (Слово → устно)
    startStudy(demoDeck.id, 1);
}

// Переход на профиль
function goToProfile() {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="profile"]').classList.add('active');
    loadPage('profile');
}

// Показать окно авторизации
function showAuth() {
    if (typeof openAuthModal === 'function') {
        openAuthModal();
    } else {
        // Если функция не найдена, пробуем перейти на вкладку профиля
        loadPage('profile');
    }
}

// Экспорт функций в глобальную область видимости
window.startDemoCards = startDemoCards;
window.startDemoDeck = startDemoDeck;
window.flipDemoCard = flipDemoCard;
window.nextDemoCard = nextDemoCard;
window.goToProfile = goToProfile;
window.showAuth = showAuth;

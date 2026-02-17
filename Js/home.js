// Тестовые карточки для демо
const demoCards = [
    { front: 'Hello', back: 'Привет' },
    { front: 'Goodbye', back: 'До свидания' },
    { front: 'Thank you', back: 'Спасибо' },
    { front: 'Please', back: 'Пожалуйста' },
    { front: 'How are you?', back: 'Как дела?' }
];

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

// Переход на профиль
function goToProfile() {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="profile"]').classList.add('active');
    loadPage('profile');
}

// Экспорт функций в глобальную область видимости
window.startDemoCards = startDemoCards;
window.flipDemoCard = flipDemoCard;
window.nextDemoCard = nextDemoCard;
window.goToProfile = goToProfile;

// Функции для окна авторизации

// Открыть окно авторизации
function openAuthModal() {
    // Если пользователь уже авторизован - не открываем окно авторизации
    const token = localStorage.getItem('lexy_token');
    const userStr = localStorage.getItem('lexy_user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    if (token && user && user.username) {
        // Пользователь авторизован - переходим на вкладку Профиль
        const profileTab = document.querySelector('[data-tab="profile"]');
        if (profileTab) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            profileTab.classList.add('active');
            loadPage('profile');
        }
        return;
    }
    
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.add('active');
    }
}

// Закрыть окно авторизации
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Переключение вкладок
function switchAuthTab(tab) {
    // Обновить кнопки
    document.querySelectorAll('.auth-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.authTab === tab);
    });
    
    // Показать/скрыть формы
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerFormModal');
    
    if (loginForm) loginForm.classList.toggle('hidden', tab !== 'login');
    if (registerForm) registerForm.classList.toggle('hidden', tab !== 'register');
}

// Обработка входа
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showNotification('Введите логин и пароль', 'error');
        return;
    }
    
    try {
        const result = await ApiService.login(username, password);
        
        // Сохраняем токен и данные
        localStorage.setItem('lexy_token', result.token);
        
        // Маппим данные с сервера на локальную структуру
        // Сохраняем текущую тему перед обновлением
        const savedTheme = AppState.user.theme || 'dark';
        AppState.user = {
            name: result.user.name,
            username: result.user.username,
            avatar: result.user.avatar,
            role: result.user.role,
            theme: savedTheme,
            streak: 0,
            lastStudyDate: null,
            learnedWords: 0,
            studyTime: 0,
            accuracy: 0,
            activity: {}
        };
        
        // Загружаем активность с сервера
        try {
            const activityData = await ApiService.getActivity();
            if (activityData && activityData.activity) {
                AppState.user.activity = activityData.activity;
            }
        } catch (e) {
            console.error('Failed to load activity:', e);
        }
        
        // Загружаем статистику с сервера
        try {
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
        } catch (e) {
            console.error('Failed to load stats:', e);
        }
        
        // Сохраняем в localStorage
        localStorage.setItem('lexy_user', JSON.stringify(AppState.user));
        AppState.user.isRegistered = true;
        
        // Сохраняем локальные данные перед очисткой
        const localDecks = [...AppState.userDecks];
        
        // Очищаем старые локальные данные - они могут быть от другого пользователя
        AppState.userDecks = [];
        saveState();
        
        // Синхронизируем - получаем данные с сервера
        try {
            // Get fresh data from server
            const serverData = await ApiService.syncGet();
            
            // Apply server data first
            if (serverData && serverData.decks && serverData.decks.length > 0) {
                // Get cards from serverData.cards array (not deck.cards)
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
                    // Filter cards belonging to this deck
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
                        id: deck.id, // Keep server numeric ID
                        customImage: deck.custom_image || null,
                        source: deck.source || 'created',
                        publicDeckId: deck.public_deck_id || null,
                        cards: deckCards
                    };
                });
            } else if (localDecks && localDecks.length > 0) {
                // Server is empty, sync local decks to server
                await ApiService.syncSave(localDecks);
                const updatedData = await ApiService.syncGet();
                if (updatedData && updatedData.decks) {
                    const serverCards = updatedData.cards || [];
                    
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
                    
                    AppState.userDecks = updatedData.decks.map(deck => {
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
            }
            
            saveState();
        } catch (syncError) {
            console.error('Sync error:', syncError);
        }
        
        closeAuthModal();
        updateAuthButton();
        showNotification('Добро пожаловать, ' + result.user.name + '!');
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Обработка регистрации
async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('regNameModal').value;
    const username = document.getElementById('regUsernameModal').value;
    const password = document.getElementById('regPasswordModal').value;
    
    if (!name || !username || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    try {
        const result = await ApiService.register(name, username, password);
        
        // Сохраняем токен и данные
        localStorage.setItem('lexy_token', result.token);
        localStorage.setItem('lexy_user', JSON.stringify(result.user));
        
        AppState.user = result.user;
        AppState.user.isRegistered = true;
        saveState();
        
        // Синхронизируем данные с сервером (отправляем локальные данные на сервер)
        if (AppState.userDecks && AppState.userDecks.length > 0) {
            try {
                await ApiService.syncSave(AppState.userDecks);
                console.log('Data synced to server');
            } catch (syncError) {
                console.error('Sync error:', syncError);
            }
        }
        
        closeAuthModal();
        updateAuthButton();
        showNotification('Аккаунт создан! Добро пожаловать, ' + result.user.name + '!');
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Обновить кнопку авторизации
function updateAuthButton() {
    const btn = document.getElementById('authBtn');
    if (!btn) return;
    
    const token = localStorage.getItem('lexy_token');
    const userStr = localStorage.getItem('lexy_user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    if (token && user && user.username) {
        btn.classList.add('logged-in');
        btn.innerHTML = '<span class="user-avatar">' + (user.avatar || '👤') + '</span><span class="auth-btn-text">' + user.username + '</span>';
        
        // Показать вкладку Профиль
        const profileTab = document.querySelector('[data-tab="profile"]');
        if (profileTab) profileTab.style.display = '';
        
        // Показать вкладку Админ, если пользователь админ
        const adminTab = document.getElementById('adminTab');
        if (adminTab) {
            adminTab.style.display = user.role === 'admin' ? '' : 'none';
        }
        
        // Активировать все вкладки для авторизованного пользователя
        updateTabAccess(true);
    } else {
        btn.classList.remove('logged-in');
        btn.innerHTML = '<span class="auth-btn-text">Вход</span>';
        
        // Если не авторизован и на профиле - перейти на главную
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && activeTab.dataset.tab === 'profile') {
            document.querySelector('[data-tab="home"]').click();
        }
        
        // Если не авторизован и на админ-панели - перейти на главную
        if (activeTab && activeTab.dataset.tab === 'admin') {
            document.querySelector('[data-tab="home"]').click();
        }
        
        // Скрыть вкладку Профиль
        const profileTab = document.querySelector('[data-tab="profile"]');
        if (profileTab) profileTab.style.display = 'none';
        
        // Скрыть вкладку Админ
        const adminTab = document.getElementById('adminTab');
        if (adminTab) adminTab.style.display = 'none';
        
        // Деактивировать все вкладки кроме главной для неавторизованного пользователя
        updateTabAccess(false);
    }
}

// Управление доступностью вкладок для неавторизованных пользователей
function updateTabAccess(isAuthorized) {
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => {
        const tabName = tab.dataset.tab;
        
        // Главная вкладка всегда доступна
        if (tabName === 'home') {
            tab.classList.remove('disabled');
            return;
        }
        
        if (isAuthorized) {
            // Авторизованный пользователь - все вкладки доступны
            tab.classList.remove('disabled');
        } else {
            // Неавторизованный пользователь - только главная доступна
            tab.classList.add('disabled');
        }
    });
}

// Выход
function logout() {
    if (confirm('Выйти из аккаунта?')) {
        localStorage.removeItem('lexy_token');
        localStorage.removeItem('lexy_user');
        // Очищаем сохраненные данные - они привязаны к аккаунту
        localStorage.removeItem('linguaState');
        AppState.user = {
            name: '',
            username: '',
            isRegistered: false,
            role: 'user'
        };
        // Очищаем колоды при выходе - они привязаны к аккаунту
        AppState.userDecks = [];
        saveState();
        updateAuthButton();
        showNotification('Вы вышли из аккаунта');
        loadPage('home');
    }
}

// Закрытие модалки только по кнопке
// (удалён функционал закрытия по клику на пустую область)

// Экспорт функций
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.updateAuthButton = updateAuthButton;
window.updateTabAccess = updateTabAccess;
window.logout = logout;

// Назначаем обработчик на кнопку выхода
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logout();
        });
    }
});

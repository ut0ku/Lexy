// Функции для окна авторизации

// Открыть окно авторизации
function openAuthModal() {
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
    }
}

// Выход
function logout() {
    if (confirm('Выйти из аккаунта?')) {
        localStorage.removeItem('lexy_token');
        localStorage.removeItem('lexy_user');
        AppState.user = {
            name: '',
            username: '',
            isRegistered: false,
            role: 'user'
        };
        saveState();
        updateAuthButton();
        showNotification('Вы вышли из аккаунта');
        loadPage('home');
    }
}

// Закрытие модалки по клику вне
document.addEventListener('click', function(e) {
    const modal = document.getElementById('authModal');
    if (e.target === modal) {
        closeAuthModal();
    }
});

// Экспорт функций
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.updateAuthButton = updateAuthButton;
window.logout = logout;

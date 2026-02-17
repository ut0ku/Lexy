function initProfilePage() {
    const token = localStorage.getItem('lexy_token');
    const userStr = localStorage.getItem('lexy_user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    if (!token || !user) {
        showNotification('Войдите для доступа к профилю', 'error');
        document.querySelector('[data-tab="home"]').click();
        return;
    }
    
    AppState.user = user;
    updateProfileDisplay();
    
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) {
        editBtn.addEventListener('click', showEditProfileModal);
    }
    
    // Скрываем кнопку удаления аккаунта для админа
    const deleteBtn = document.getElementById('deleteAccountBtn');
    if (deleteBtn) {
        if (user.role === 'admin') {
            deleteBtn.style.display = 'none';
        } else {
            deleteBtn.addEventListener('click', deleteAccount);
        }
    }
    
    // Initialize theme toggle based on current theme
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = AppState.user.theme === 'light';
        themeToggle.addEventListener('change', toggleTheme);
        
        // Set initial theme label text
        const themeLabelText = document.getElementById('themeLabelText');
        if (themeLabelText) {
            themeLabelText.textContent = AppState.user.theme === 'light' ? 'Светлая тема' : 'Темная тема';
        }
        
        // Swap icons based on current theme
        swapThemeIcons(AppState.user.theme === 'light');
    }
    
    const exportBtn = document.getElementById('exportData');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportUserData);
    }
    
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.addEventListener('click', () => document.getElementById('importFile').click());
    }
    
    const importFile = document.getElementById('importFile');
    if (importFile) {
        importFile.addEventListener('change', importUserData);
    }
    
    const clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllData);
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

function updateProfileDisplay() {
    const nameDisplay = document.getElementById('userNameDisplay');
    const usernameDisplay = document.getElementById('userUsernameDisplay');
    const avatarDisplay = document.getElementById('avatarDisplay');
    
    if (nameDisplay) nameDisplay.textContent = AppState.user.name;
    if (usernameDisplay) usernameDisplay.textContent = '@' + AppState.user.username;
    if (avatarDisplay) avatarDisplay.textContent = AppState.user.avatar || '👤';
}

function showEditProfileModal() {
    const modal = showModal({
        title: 'Редактировать профиль',
        body: `
            <div class="form-group">
                <label>Имя</label>
                <input type="text" id="editName" value="${AppState.user.name}">
            </div>
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="editUsername" value="${AppState.user.username}">
            </div>
            <div class="form-group">
                <label>Аватар</label>
                <input type="text" id="editAvatar" value="${AppState.user.avatar || '👤'}" maxlength="2">
            </div>
            <button class="btn" id="saveProfileBtn">Сохранить</button>
        `
    });
    
    document.getElementById('saveProfileBtn').addEventListener('click', () => {
        AppState.user.name = document.getElementById('editName').value || 'Пользователь';
        AppState.user.username = document.getElementById('editUsername').value || 'username';
        AppState.user.avatar = document.getElementById('editAvatar').value || '👤';
        
        saveState();
        updateProfileDisplay();
        modal.classList.remove('active');
        showNotification('Профиль обновлен');
    });
}

function toggleTheme(e) {
    const isLight = e.target.checked;
    applyTheme(isLight ? 'light' : 'dark');
    AppState.user.theme = isLight ? 'light' : 'dark';
    saveState();
    
    // Update theme label text
    const themeLabelText = document.getElementById('themeLabelText');
    if (themeLabelText) {
        themeLabelText.textContent = isLight ? 'Светлая тема' : 'Темная тема';
    }
    
    // Swap icons for light theme
    swapThemeIcons(isLight);
}

// Swap icons based on theme
function swapThemeIcons(isLight) {
    // Theme toggle icons
    const sunIcon = document.querySelector('.sun-icon img');
    const moonIcon = document.querySelector('.moon-icon img');
    
    if (sunIcon) {
        sunIcon.src = isLight ? 'icons/sun-dark.svg' : 'icons/sun.svg';
    }
    if (moonIcon) {
        moonIcon.src = isLight ? 'icons/moon-dark.svg' : 'icons/moon.svg';
    }
    
    // Profile page icons - select by the icon-circle img elements
    const allIconCircleImg = document.querySelectorAll('.settings-item .icon-circle img');
    
    allIconCircleImg.forEach(img => {
        const src = img.getAttribute('src') || '';
        
        // Export icon
        if (src.includes('export')) {
            img.src = isLight ? 'icons/export-dark.svg' : 'icons/export.svg';
        }
        // Import icon
        else if (src.includes('import')) {
            img.src = isLight ? 'icons/import-dark.svg' : 'icons/import.svg';
        }
        // Exit/Logout icon
        else if (src.includes('exit') || src.includes('log-out')) {
            img.src = isLight ? 'icons/log-out-dark.svg' : 'icons/exit.svg';
        }
        // Trash icon
        else if (src.includes('trash')) {
            img.src = isLight && document.querySelector('link[href*="trash-dark"]') ? 'icons/trash-dark.svg' : 'icons/trash.svg';
        }
        // Delete icon
        else if (src.includes('delete')) {
            img.src = isLight && document.querySelector('link[href*="delete-dark"]') ? 'icons/delete-dark.svg' : 'icons/delete.svg';
        }
    });
    
    // Edit profile button icon
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        const editImg = editProfileBtn.querySelector('img');
        if (editImg) {
            // Check if dark version exists, otherwise use filter
            if (isLight) {
                editImg.src = 'icons/edit-dark.svg';
                editImg.onerror = function() {
                    // If edit-dark.svg doesn't exist, use filter
                    this.style.filter = 'invert(1)';
                };
            } else {
                editImg.src = 'icons/edit.svg';
                editImg.style.filter = '';
            }
        }
    }
}

function exportUserData() {
    const dataStr = JSON.stringify(AppState, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `lingua_backup_${new Date().toISOString().split('T')[0]}.json`);
    linkElement.click();
}

function importUserData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            Object.assign(AppState, imported);
            saveState();
            updateProfileDisplay();
            showNotification('Данные импортированы');
        } catch (error) {
            showNotification('Ошибка импорта', 'error');
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('Все данные будут удалены. Продолжить?')) {
        localStorage.removeItem('linguaState');
        location.reload();
    }
}

// Удалить эту функцию - используется logout из auth.js

function deleteAccount() {
    if (confirm('Это действие нельзя отменить. Удалить аккаунт?')) {
        ApiService.deleteAccount()
            .then(() => {
                localStorage.removeItem('lexy_token');
                localStorage.removeItem('lexy_user');
                localStorage.removeItem('linguaState');
                showNotification('Аккаунт удален');
                setTimeout(() => {
                    location.reload();
                }, 1000);
            })
            .catch(error => {
                showNotification(error.message, 'error');
            });
    }
}
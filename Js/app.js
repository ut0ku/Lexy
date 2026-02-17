// Навигация между вкладками
document.addEventListener('DOMContentLoaded', () => {
    // Скрываем экран загрузки через 2 секунды
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.remove();
            }, 500);
        }, 2000);
    }
    
    loadPage('library');
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const tab = e.target.dataset.tab;
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            await loadPage(tab);
        });
    });
    
    // Footer modal functionality
    initFooterModals();
});

// Footer modal data
const footerModalData = {
    'terms-conditions': {
        title: 'Terms and Conditions',
        content: 'Правила и условия использования приложения LinguaCards. Используя приложение, вы соглашаетесь с условиями использования.'
    },
    'terms-of-use': {
        title: 'Terms of Use',
        content: 'Условия использования. Пожалуйста, ознакомьтесь с правилами использования приложения перед началом работы.'
    },
    'privacy-policy': {
        title: 'Privacy Policy',
        content: 'Политика конфиденциальности. Мы заботимся о вашей конфиденциальности. Ваши данные хранятся локально и не передаются третьим лицам.'
    },
    'faq': {
        title: 'FAQ',
        content: 'Часто задаваемые вопросы:\n\nКак начать изучение?\nВыберите колоду и нажмите "Начать изучение".\n\nКак добавить свои карточки?\nПерейдите в "Мои колоды" и создайте новую колоду.\n\nКак работают интервальные повторения?\nАлгоритм показывает карточки через увеличивающиеся интервалы времени.'
    },
    'contact': {
        title: 'Contact',
        content: 'Связаться с нами: support@linguacards.app\n\nМы ответим на ваши вопросы в течение 24 часов.'
    }
};

// Initialize footer modals
function initFooterModals() {
    document.addEventListener('click', (e) => {
        const modalLink = e.target.closest('[data-modal]');
        if (modalLink) {
            e.preventDefault();
            const modalId = modalLink.dataset.modal;
            showFooterModal(modalId);
        }
    });
}

// Show footer modal
function showFooterModal(modalId) {
    const data = footerModalData[modalId];
    if (!data) return;
    
    // Remove existing footer modal if any
    const existingModal = document.querySelector('.footer-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div class="footer-modal-overlay">
            <div class="footer-modal">
                <div class="footer-modal-header">
                    <h3>${data.title}</h3>
                    <span class="footer-modal-close">×</span>
                </div>
                <div class="footer-modal-content">
                    ${data.content.replace(/\n/g, '<br>')}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Small delay to allow CSS transitions to work
    requestAnimationFrame(() => {
        const overlay = document.querySelector('.footer-modal-overlay');
        overlay.classList.add('active');
    });
    
    const overlay = document.querySelector('.footer-modal-overlay');
    const closeBtn = overlay.querySelector('.footer-modal-close');
    
    closeBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        }
    });
}

// Загрузка страницы
async function loadPage(pageName) {
    const content = document.getElementById('content');
    
    try {
        const response = await fetch(`pages/${pageName}.html`);
        const html = await response.text();
        
        content.innerHTML = html;
        content.style.animation = 'none';
        content.offsetHeight;
        content.style.animation = 'fadeSlide 0.3s ease';
        
        switch(pageName) {
            case 'library':
                // Принудительно обновляем данные при каждом переходе на библиотеку
                if (typeof loadPublicDecksFromServer === 'function') loadPublicDecksFromServer();
                if (typeof initLibraryPage === 'function') initLibraryPage();
                break;
            case 'home':
                // Обновляем данные при переходе
                if (typeof loadState === 'function') loadState();
                if (typeof initHomePage === 'function') initHomePage();
                break;
            case 'mydecks':
                // Обновляем данные колод при переходе
                if (typeof loadState === 'function') loadState();
                if (typeof initMyDecksPage === 'function') initMyDecksPage();
                break;
            case 'stats':
                // Обновляем данные при переходе
                if (typeof loadState === 'function') loadState();
                if (typeof initStatsPage === 'function') initStatsPage();
                break;
            case 'profile':
                // Обновляем данные при переходе
                if (typeof loadState === 'function') loadState();
                if (typeof initProfilePage === 'function') initProfilePage();
                break;
            case 'admin':
                // Обновляем данные при переходе
                if (typeof loadState === 'function') loadState();
                if (typeof initAdminPage === 'function') initAdminPage();
                break;
        }
    } catch (error) {
        console.error('Error loading page:', error);
        content.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">Ошибка загрузки страницы</p>';
    }
}

// Показ модального окна
function showModal(content, options = {}) {
    const modalContainer = document.getElementById('modalContainer');
    const isStudyMode = content.title?.includes('Карточка');
    
    modalContainer.innerHTML = `
        <div class="modal-overlay ${isStudyMode ? 'study-mode' : ''}">
            <div class="modal-content ${isStudyMode ? 'study-mode' : ''}">
                <div class="modal-header">
                    <h2>${content.title || ''}</h2>
                    ${!isStudyMode ? '<span class="close-btn">×</span>' : ''}
                </div>
                <div class="modal-body">
                    ${content.body}
                </div>
            </div>
        </div>
    `;
    
    const overlay = modalContainer.querySelector('.modal-overlay');
    const closeBtn = modalContainer.querySelector('.close-btn');
    
    // Закрытие только по крестику, не по оверлею
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                modalContainer.innerHTML = '';
            }, 300);
        });
    }
    
    // Для режима изучения оставляем затемнение, но добавляем кнопку закрытия
    if (isStudyMode) {
        // Оверлей остаётся активным с затемнением
        const modalContent = overlay.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.pointerEvents = 'auto';
        }
    }
    
     // Показываем модалку
     overlay.classList.add('active');
     
     return overlay;
}

// Уведомления
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--accent)'};
        color: white;
        padding: 12px 24px;
        border-radius: 30px;
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        animation: slideUp 0.3s;
        box-shadow: var(--shadow);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Добавляем анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { transform: translate(-50%, 100px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes fadeOut {
        to { opacity: 0; transform: translate(-50%, 20px); }
    }
`;
document.head.appendChild(style);

window.showModal = showModal;
window.showNotification = showNotification;
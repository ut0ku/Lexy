// Admin page functionality

let currentEditingDeckId = null;
let currentCardsDeckId = null;
let selectedAdminImageFile = null;
let selectedAdminImageString = null;

function resetAdminImagePreview() {
    selectedAdminImageFile = null;
    selectedAdminImageString = null;
    document.getElementById('adminDeckImageInput').value = '';
    document.getElementById('adminDeckImagePreview').innerHTML = `
        <div class="deck-image-placeholder">
            <span class="deck-image-icon">🖼️</span>
            <span class="deck-image-text">Нажмите для загрузки</span>
        </div>
    `;
    document.getElementById('removeAdminDeckImage').style.display = 'none';
}

function initAdminPage() {
    const userStr = localStorage.getItem('lexy_user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    // Check if user is admin
    if (!user || user.role !== 'admin') {
        showNotification('Доступ запрещён', 'error');
        document.querySelector('[data-tab="home"]').click();
        return;
    }
    
    loadPublicDecks();
    
    // Initialize image upload
    const adminDeckImageInput = document.getElementById('adminDeckImageInput');
    const adminDeckImagePreview = document.getElementById('adminDeckImagePreview');
    const removeAdminDeckImage = document.getElementById('removeAdminDeckImage');

    if (adminDeckImagePreview && adminDeckImageInput) {
        adminDeckImagePreview.addEventListener('click', () => adminDeckImageInput.click());
        
        adminDeckImageInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                if (!file.type.startsWith('image/')) {
                    showNotification('Пожалуйста, выберите изображение', 'error');
                    return;
                }
                
                selectedAdminImageFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    selectedAdminImageString = e.target.result;
                    adminDeckImagePreview.innerHTML = `<img src="${selectedAdminImageString}" alt="Обложка" style="width: 100%; height: 100%; object-fit: cover;">`;
                    removeAdminDeckImage.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
        
        if (removeAdminDeckImage) {
            removeAdminDeckImage.addEventListener('click', resetAdminImagePreview);
        }
    }

    // Create deck button
    document.getElementById('createPublicDeckBtn').addEventListener('click', () => {
        currentEditingDeckId = null;
        document.getElementById('publicDeckModalTitle').textContent = 'Создать колоду';
        document.getElementById('publicDeckName').value = '';
        document.getElementById('publicDeckDescription').value = '';
        document.getElementById('publicDeckLang').value = 'Английский';
        // Сброс чекбоксов
        document.getElementById('publicDeckCategoryNew').checked = false;
        document.getElementById('publicDeckCategoryPopular').checked = false;
        document.getElementById('publicDeckCategoryRecommended').checked = false;
        resetAdminImagePreview();
        document.getElementById('publicDeckModal').classList.add('active');
    });
    
    // Save deck
    document.getElementById('savePublicDeckBtn').addEventListener('click', savePublicDeck);
    
    // Cancel
    document.getElementById('cancelPublicDeckBtn').addEventListener('click', () => {
        document.getElementById('publicDeckModal').classList.remove('active');
    });
    
    // Close cards modal
    document.getElementById('closePublicCardsModal').addEventListener('click', () => {
        document.getElementById('publicDeckCardsModal').classList.remove('active');
    });
    
    // Add card
    document.getElementById('addPublicCardBtn').addEventListener('click', addPublicCard);
}

async function loadPublicDecks() {
    const container = document.getElementById('adminDecksList');
    
    try {
        const result = await ApiService.getAdminPublicDecks();
        
        if (result.decks.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">Публичных колод пока нет</p>';
            return;
        }
        
        container.innerHTML = result.decks.map(deck => `
            <div class="deck-card admin-deck-card" data-deck-id="${deck.id}">
                <div class="deck-preview" style="${deck.custom_image ? 'background: none;' : ''}">
                    ${deck.custom_image ? `<img src="${deck.custom_image}" alt="${deck.name.replace(/"/g, '&quot;')}" style="width: 100%; height: 100%; object-fit: cover;">` : ''}
                    <div class="deck-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); editPublicDeck(${deck.id}, '${deck.name.replace(/'/g, "\\'")}', '${(deck.description || '').replace(/'/g, "\\'")}', '${deck.lang}', '${deck.category || ''}', '${deck.custom_image || ''}')" title="Редактировать">✎</button>
                        <button class="btn-icon" onclick="event.stopPropagation(); deletePublicDeck(${deck.id})" title="Удалить">×</button>
                    </div>
                </div>
                <div class="deck-info" onclick="openPublicDeckCards(${deck.id}, '${deck.name}')">
                    <div class="deck-name">${deck.name}</div>
                    <div class="deck-meta">${deck.lang || 'Английский'}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p style="color: var(--danger);">Ошибка загрузки: ' + error.message + '</p>';
    }
}

function editPublicDeck(id, name, description, lang, category = '', custom_image = '') {
    currentEditingDeckId = id;
    document.getElementById('publicDeckModalTitle').textContent = 'Редактировать колоду';
    document.getElementById('publicDeckName').value = name;
    document.getElementById('publicDeckDescription').value = description;
    document.getElementById('publicDeckLang').value = lang || 'Английский';
    
    // Установить чекбоксы на основе сохранённых категорий
    const categories = category ? category.split(',') : [];
    document.getElementById('publicDeckCategoryNew').checked = categories.includes('new');
    document.getElementById('publicDeckCategoryPopular').checked = categories.includes('popular');
    document.getElementById('publicDeckCategoryRecommended').checked = categories.includes('recommended');
    
    resetAdminImagePreview();
    if (custom_image) {
        selectedAdminImageString = custom_image;
        document.getElementById('adminDeckImagePreview').innerHTML = `<img src="${custom_image}" alt="Обложка" style="width: 100%; height: 100%; object-fit: cover;">`;
        document.getElementById('removeAdminDeckImage').style.display = 'block';
    }

    document.getElementById('publicDeckModal').classList.add('active');
}

// Функция для получения выбранных категорий
function getSelectedCategories() {
    const categories = [];
    if (document.getElementById('publicDeckCategoryNew').checked) categories.push('new');
    if (document.getElementById('publicDeckCategoryPopular').checked) categories.push('popular');
    if (document.getElementById('publicDeckCategoryRecommended').checked) categories.push('recommended');
    return categories.join(',');
}

async function savePublicDeck() {
    const name = document.getElementById('publicDeckName').value.trim();
    const description = document.getElementById('publicDeckDescription').value.trim();
    const lang = document.getElementById('publicDeckLang').value;
    const category = getSelectedCategories();
    
    if (!name) {
        showNotification('Введите название', 'error');
        return;
    }
    
    try {
        let deckId = currentEditingDeckId;

        if (deckId) {
            await ApiService.updatePublicDeck(deckId, name, description, lang, category, selectedAdminImageFile ? null : selectedAdminImageString);
            showNotification('Колода обновлена');
        } else {
            const createResult = await ApiService.createPublicDeck(name, description, lang, category);
            deckId = createResult.deck.id;
            showNotification('Колода создана');
        }
        
        if (selectedAdminImageFile) {
            try {
                await ApiService.uploadPublicDeckImage(deckId, selectedAdminImageFile);
            } catch (imageErr) {
                console.error('Failed to upload image:', imageErr);
                showNotification('Колода сохранена, но обложку загрузить не удалось', 'error');
            }
        }

        document.getElementById('publicDeckModal').classList.remove('active');
        loadPublicDecks();
        
        // Также обновить данные в библиотеке если она загружена
        if (typeof loadPublicDecksFromServer === 'function') {
            loadPublicDecksFromServer();
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function deletePublicDeck(id) {
    if (!confirm('Удалить эту колоду и все её карточки?')) return;
    
    try {
        await ApiService.deletePublicDeck(id);
        showNotification('Колода удалена');
        loadPublicDecks();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function openPublicDeckCards(deckId, deckName) {
    currentCardsDeckId = deckId;
    document.getElementById('publicDeckCardsTitle').textContent = `Карточки: ${deckName}`;
    document.getElementById('newPublicCardFront').value = '';
    document.getElementById('newPublicCardBack').value = '';
    document.getElementById('publicDeckCardsModal').classList.add('active');
    loadPublicDeckCards();
}

async function loadPublicDeckCards() {
    const container = document.getElementById('publicCardsList');
    
    try {
        const result = await ApiService.getAdminPublicDeckCards(currentCardsDeckId);
        
        if (result.cards.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">Карточек пока нет</p>';
            return;
        }
        
        container.innerHTML = result.cards.map(card => `
            <div class="public-card-item">
                <div class="card-content">
                    <span class="card-word">${card.front}</span>
                    <span class="card-translation">→ ${card.back}</span>
                </div>
                <button class="delete-btn" onclick="deletePublicCard(${card.id})">×</button>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p style="color: var(--danger);">Ошибка: ' + error.message + '</p>';
    }
}

async function addPublicCard() {
    const front = document.getElementById('newPublicCardFront').value.trim();
    const back = document.getElementById('newPublicCardBack').value.trim();
    
    if (!front || !back) {
        showNotification('Заполните оба поля', 'error');
        return;
    }
    
    try {
        await ApiService.createPublicCard(currentCardsDeckId, front, back);
        document.getElementById('newPublicCardFront').value = '';
        document.getElementById('newPublicCardBack').value = '';
        showNotification('Карточка добавлена');
        loadPublicDeckCards();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function deletePublicCard(id) {
    if (!confirm('Удалить карточку?')) return;
    
    try {
        await ApiService.deletePublicCard(id);
        showNotification('Карточка удалена');
        loadPublicDeckCards();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Export functions to window
window.editPublicDeck = editPublicDeck;
window.deletePublicDeck = deletePublicDeck;
window.openPublicDeckCards = openPublicDeckCards;
window.deletePublicCard = deletePublicCard;

// Library page functionality

let publicDecksData = [];

function initLibraryPage() {
    loadPublicDecksFromServer();
}

async function loadPublicDecksFromServer() {
    try {
        const result = await ApiService.getPublicDecks();
        publicDecksData = result.decks || [];
        
        // Also keep static decks as fallback
        if (publicDecksData.length === 0) {
            publicDecksData = AppState.publicDecks.map(d => ({
                id: d.id,
                name: d.name,
                lang: d.lang,
                cards_count: d.cardsCount || 0
            }));
        }
        
        renderAllDecks();
    } catch (error) {
        console.error('Error loading public decks:', error);
        // Use static decks as fallback
        publicDecksData = AppState.publicDecks.map(d => ({
            id: d.id,
            name: d.name,
            lang: d.lang,
            cards_count: d.cardsCount || 0
        }));
        renderAllDecks();
    }
}

function renderAllDecks() {
    // Фильтруем по категориям (колода может быть в нескольких категориях через запятую)
    const recommended = publicDecksData.filter(d => d.category && d.category.split(',').includes('recommended'));
    const popular = publicDecksData.filter(d => d.category && d.category.split(',').includes('popular'));
    const newDecks = publicDecksData.filter(d => d.category && d.category.split(',').includes('new'));
    
    renderRecommendedDecks(recommended);
    renderPopularDecks(popular);
    renderNewDecks(newDecks);
}

function getAdminButtons(deck) {
    const userStr = localStorage.getItem('lexy_user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    if (user && user.role === 'admin') {
        return `
            <div class="admin-deck-actions" style="position: absolute; top: 8px; right: 8px; display: flex; gap: 5px; z-index: 10;">
                <button class="btn-icon" onclick="event.stopPropagation(); editLibraryDeck(${deck.id}, '${deck.name}', '${deck.description || ''}', '${deck.lang}', '${deck.category || ''}')" title="Редактировать">✎</button>
                <button class="btn-icon" onclick="event.stopPropagation(); deleteLibraryDeck(${deck.id})" title="Удалить">×</button>
            </div>
        `;
    }
    return '';
}

function renderRecommendedDecks(decks = []) {
    const container = document.getElementById('recommendedDecks');
    if (!container) return;
    
    if (decks.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Пока нет рекомендуемых колод</p>';
        return;
    }
    
    const decksToRender = decks;
    if (decksToRender.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Пока нет рекомендуемых колод</p>';
        return;
    }
    
    container.innerHTML = decksToRender.map(deck => `
        <div class="deck-card" onclick="addPublicDeck('${deck.id}')">
            <div class="deck-preview" style="background: linear-gradient(135deg, var(--accent), var(--accent-hover));">
                ${getAdminButtons(deck)}
                <div class="deck-actions">
                    <button class="btn-icon">+</button>
                </div>
            </div>
            <div class="deck-info">
                <div class="deck-name">${deck.name}</div>
                <div class="deck-meta">${deck.cards_count || 0} карт • ${deck.lang || 'Английский'}</div>
            </div>
        </div>
    `).join('');
}

function renderPopularDecks(decks = []) {
    const container = document.getElementById('popularDecks');
    if (!container) return;
    
    if (decks.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const decksToRender = decks;
    if (decksToRender.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = decksToRender.map(deck => `
        <div class="deck-card" onclick="addPublicDeck('${deck.id}')">
            <div class="deck-preview" style="background: linear-gradient(135deg, #ff9f0a, #ff6b0a);">
                ${getAdminButtons(deck)}
                <div class="deck-actions">
                    <button class="btn-icon">+</button>
                </div>
            </div>
            <div class="deck-info">
                <div class="deck-name">${deck.name}</div>
                <div class="deck-meta">${deck.cards_count || 0} карт • ${deck.lang || 'Английский'}</div>
            </div>
        </div>
    `).join('');
}

function renderNewDecks(decks = []) {
    const container = document.getElementById('newDecks');
    if (!container) return;
    
    if (decks.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const decksToRender = decks;
    if (decksToRender.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = decksToRender.map(deck => `
        <div class="deck-card" onclick="addPublicDeck('${deck.id}')">
            <div class="deck-preview" style="background: linear-gradient(135deg, #34c759, #30b753);">
                ${getAdminButtons(deck)}
                <div class="deck-actions">
                    <button class="btn-icon">+</button>
                </div>
            </div>
            <div class="deck-info">
                <div class="deck-name">${deck.name}</div>
                <div class="deck-meta">${deck.cards_count || 0} карт • ${deck.lang || 'Английский'}</div>
            </div>
        </div>
    `).join('');
}

async function addPublicDeck(deckId) {
    const deck = publicDecksData.find(d => d.id == deckId);
    if (!deck) {
        // Try static decks
        const staticDeck = AppState.publicDecks.find(d => d.id === deckId);
        if (!staticDeck) return;
        
        // Check if already added
        const existingDeck = AppState.userDecks.find(d => d.source === 'public' && d.name === staticDeck.name);
        if (existingDeck) {
            showNotification('Колода уже добавлена', 'error');
            return;
        }
        
        if (!canCreateDeck()) {
            showNotification('Слишком много созданий колод. Подождите час', 'error');
            return;
        }
        
        AppState.deckCreateTimes.push(Date.now());
        
        const newDeck = {
            id: 'deck_' + Date.now(),
            name: staticDeck.name,
            cards: [],
            createdAt: new Date().toISOString(),
            isFavorite: false,
            source: 'public',
            publicDeckId: staticDeck.id
        };
        
        AppState.userDecks.push(newDeck);
        saveState();
        
        showNotification('Колода добавлена в Мои колоды');
        return;
    }
    
    // Check if already added
    const existingDeck = AppState.userDecks.find(d => d.source === 'public' && d.name === deck.name);
    if (existingDeck) {
        showNotification('Колода уже добавлена', 'error');
        return;
    }
    
    if (!canCreateDeck()) {
        showNotification('Слишком много созданий колод. Подождите час', 'error');
        return;
    }
    
    AppState.deckCreateTimes.push(Date.now());
    
    // Try to load cards from the public deck
    let cards = [];
    try {
        const result = await ApiService.getPublicDeckCards(deckId);
        if (result.cards && result.cards.length > 0) {
            cards = result.cards.map(card => ({
                id: 'card_' + Date.now() + Math.random(),
                word: card.front,
                translation: card.back,
                repetitions: 0,
                interval: 1,
                ease: 2.5,
                nextReview: new Date().toISOString()
            }));
        }
    } catch (e) {
        console.log('Could not load cards from public deck');
    }
    
    const newDeck = {
        id: 'deck_' + Date.now(),
        name: deck.name,
        cards: cards,
        createdAt: new Date().toISOString(),
        isFavorite: false,
        source: 'public',
        publicDeckId: deck.id
    };
    
    AppState.userDecks.push(newDeck);
    saveState();
    
    showNotification(`Колода добавлена в Мои колоды с ${cards.length} картами`);
}

// Admin functions for library

function editLibraryDeck(id, name, description, lang, category = '') {
    currentEditingDeckId = id;
    document.getElementById('libraryDeckModalTitle').textContent = 'Редактировать колоду';
    document.getElementById('libraryDeckName').value = name;
    document.getElementById('libraryDeckDescription').value = description || '';
    document.getElementById('libraryDeckLang').value = lang || 'Английский';
    
    // Установить чекбоксы на основе сохранённых категорий
    const categories = category ? category.split(',') : [];
    const categoryNew = document.getElementById('libraryDeckCategoryNew');
    const categoryPopular = document.getElementById('libraryDeckCategoryPopular');
    const categoryRecommended = document.getElementById('libraryDeckCategoryRecommended');
    
    if (categoryNew) categoryNew.checked = categories.includes('new');
    if (categoryPopular) categoryPopular.checked = categories.includes('popular');
    if (categoryRecommended) categoryRecommended.checked = categories.includes('recommended');
    
    document.getElementById('libraryDeckModal').classList.add('active');
}

// Функция для получения выбранных категорий в библиотеке
function getLibrarySelectedCategories() {
    const categories = [];
    const categoryNew = document.getElementById('libraryDeckCategoryNew');
    const categoryPopular = document.getElementById('libraryDeckCategoryPopular');
    const categoryRecommended = document.getElementById('libraryDeckCategoryRecommended');
    
    if (categoryNew && categoryNew.checked) categories.push('new');
    if (categoryPopular && categoryPopular.checked) categories.push('popular');
    if (categoryRecommended && categoryRecommended.checked) categories.push('recommended');
    return categories.join(',');
}

async function saveLibraryDeck() {
    const name = document.getElementById('libraryDeckName').value.trim();
    const description = document.getElementById('libraryDeckDescription').value.trim();
    const lang = document.getElementById('libraryDeckLang').value;
    const category = getLibrarySelectedCategories();
    
    if (!name) {
        showNotification('Введите название', 'error');
        return;
    }
    
    try {
        await ApiService.updatePublicDeck(currentEditingDeckId, name, description, lang, category);
        showNotification('Колода обновлена');
        document.getElementById('libraryDeckModal').classList.remove('active');
        loadPublicDecksFromServer();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function deleteLibraryDeck(id) {
    if (!confirm('Удалить эту колоду и все её карточки?')) return;
    
    try {
        await ApiService.deletePublicDeck(id);
        showNotification('Колода удалена');
        loadPublicDecksFromServer();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function openLibraryDeckCards(deckId, deckName) {
    currentCardsDeckId = deckId;
    document.getElementById('libraryCardsModalTitle').textContent = `Карточки: ${deckName}`;
    document.getElementById('newLibraryCardFront').value = '';
    document.getElementById('newLibraryCardBack').value = '';
    document.getElementById('libraryCardsModal').classList.add('active');
    loadLibraryDeckCards();
}

async function loadLibraryDeckCards() {
    const container = document.getElementById('libraryCardsList');
    
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
                <button class="delete-btn" onclick="deleteLibraryCard(${card.id})">×</button>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p style="color: var(--danger);">Ошибка: ' + error.message + '</p>';
    }
}

async function addLibraryCard() {
    const front = document.getElementById('newLibraryCardFront').value.trim();
    const back = document.getElementById('newLibraryCardBack').value.trim();
    
    if (!front || !back) {
        showNotification('Заполните оба поля', 'error');
        return;
    }
    
    try {
        await ApiService.createPublicCard(currentCardsDeckId, front, back);
        document.getElementById('newLibraryCardFront').value = '';
        document.getElementById('newLibraryCardBack').value = '';
        showNotification('Карточка добавлена');
        loadLibraryDeckCards();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function deleteLibraryCard(id) {
    if (!confirm('Удалить карточку?')) return;
    
    try {
        await ApiService.deletePublicCard(id);
        showNotification('Карточка удалена');
        loadLibraryDeckCards();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Initialize modals when library loads
document.addEventListener('DOMContentLoaded', () => {
    // Create modals dynamically if they don't exist
    if (!document.getElementById('libraryDeckModal')) {
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = `
            <div class="modal-overlay" id="libraryDeckModal">
                <div class="modal-content">
                    <h3 id="libraryDeckModalTitle">Редактировать колоду</h3>
                    <div class="form-group">
                        <label>Название</label>
                        <input type="text" id="libraryDeckName" placeholder="Название колоды">
                    </div>
                    <div class="form-group">
                        <label>Описание</label>
                        <textarea id="libraryDeckDescription" placeholder="Описание колоды" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Язык</label>
                        <select id="libraryDeckLang">
                            <option value="Английский">Английский</option>
                            <option value="Немецкий">Немецкий</option>
                            <option value="Французский">Французский</option>
                            <option value="Испанский">Испанский</option>
                            <option value="Итальянский">Итальянский</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Категории</label>
                        <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 8px;">
                            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                                <input type="checkbox" id="libraryDeckCategoryNew" value="new">
                                Новые
                            </label>
                            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                                <input type="checkbox" id="libraryDeckCategoryPopular" value="popular">
                                Популярные
                            </label>
                            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                                <input type="checkbox" id="libraryDeckCategoryRecommended" value="recommended">
                                Рекомендуемые
                            </label>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn" id="saveLibraryDeckBtn">Сохранить</button>
                        <button class="btn btn-outline" id="cancelLibraryDeckBtn">Отмена</button>
                    </div>
                </div>
            </div>
            
            <div class="modal-overlay" id="libraryCardsModal">
                <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
                    <h3 id="libraryCardsModalTitle">Управление карточками</h3>
                    <div class="form-group" style="margin-top: 15px;">
                        <label>Добавить карточку</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="newLibraryCardFront" placeholder="Слово" style="flex: 1; min-width: 150px;">
                            <input type="text" id="newLibraryCardBack" placeholder="Перевод" style="flex: 1; min-width: 150px;">
                            <button class="btn" id="addLibraryCardBtn">+</button>
                        </div>
                    </div>
                    <div id="libraryCardsList" style="margin-top: 20px;"></div>
                    <button class="btn btn-outline" id="closeLibraryCardsModal" style="margin-top: 20px;">Закрыть</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalContainer);
        
        // Add event listeners
        document.getElementById('saveLibraryDeckBtn').addEventListener('click', saveLibraryDeck);
        document.getElementById('cancelLibraryDeckBtn').addEventListener('click', () => {
            document.getElementById('libraryDeckModal').classList.remove('active');
        });
        document.getElementById('addLibraryCardBtn').addEventListener('click', addLibraryCard);
        document.getElementById('closeLibraryCardsModal').addEventListener('click', () => {
            document.getElementById('libraryCardsModal').classList.remove('active');
        });
    }
});

// Export functions
window.addPublicDeck = addPublicDeck;
window.editLibraryDeck = editLibraryDeck;
window.deleteLibraryDeck = deleteLibraryDeck;
window.openLibraryDeckCards = openLibraryDeckCards;
window.deleteLibraryCard = deleteLibraryCard;

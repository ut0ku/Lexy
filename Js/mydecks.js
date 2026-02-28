function initMyDecksPage() {
    renderUserDecks();
    updatePermanentDecks();
    
    const createBtn = document.getElementById('createDeckBtn');
    if (createBtn) {
        createBtn.addEventListener('click', showCreateDeckModal);
    }
    
    const favoriteDeck = document.getElementById('favoriteDeck');
    if (favoriteDeck) {
        favoriteDeck.addEventListener('click', () => openDeck('favorite'));
    }
    
    const forgottenDeck = document.getElementById('forgottenDeck');
    if (forgottenDeck) {
        forgottenDeck.addEventListener('click', () => openDeck('forgotten'));
    }
}

function renderUserDecks() {
    const createdContainer = document.getElementById('createdDecksList');
    const addedContainer = document.getElementById('addedDecksList');
    
    if (!createdContainer || !addedContainer) return;
    
    // Разделяем колоды на созданные и добавленные
    const createdDecks = AppState.userDecks.filter(deck => deck.source !== 'public');
    const addedDecks = AppState.userDecks.filter(deck => deck.source === 'public');
    
    // Сортируем: избранные колоды в начале
    createdDecks.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
    addedDecks.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
    
    // Рендерим созданные колоды
    if (createdDecks.length === 0) {
        createdContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">У вас пока нет созданных колод</p>';
    } else {
        createdContainer.innerHTML = createdDecks.map(deck => `
            <div class="deck-card" data-deck-id="${deck.id}">
                <div class="deck-preview" style="${deck.customImage ? 'background: none;' : 'background: linear-gradient(135deg, var(--accent), var(--accent-hover));'}">
                    ${deck.customImage ? `<img src="${deck.customImage}" alt="${deck.name}" style="width: 100%; height: 100%; object-fit: cover;">` : ''}
                    <div class="deck-actions">
                        <button class="btn-icon star-btn ${deck.isFavorite ? 'filled' : ''}" onclick="event.stopPropagation(); toggleFavorite('${deck.id}')">${deck.isFavorite ? '★' : '☆'}</button>
                        <button class="btn-icon menu-btn" onclick="event.stopPropagation(); showDeckMenu('${deck.id}')">⋯</button>
                    </div>
                </div>
                <div class="deck-info">
                    <div class="deck-name">${deck.name}</div>
                    <div class="deck-meta">${deck.cards?.length || 0} карт</div>
                </div>
            </div>
        `).join('');
    }
    
    // Рендерим добавленные колоды
    if (addedDecks.length === 0) {
        addedContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">У вас пока нет добавленных колод</p>';
    } else {
        addedContainer.innerHTML = addedDecks.map(deck => `
            <div class="deck-card" data-deck-id="${deck.id}">
                <div class="deck-preview" style="${deck.customImage ? 'background: none;' : 'background: linear-gradient(135deg, #34c759, #30b753);'}">
                    ${deck.customImage ? `<img src="${deck.customImage}" alt="${deck.name}" style="width: 100%; height: 100%; object-fit: cover;">` : ''}
                    <div class="deck-actions">
                        <button class="btn-icon star-btn ${deck.isFavorite ? 'filled' : ''}" onclick="event.stopPropagation(); toggleFavorite('${deck.id}')">${deck.isFavorite ? '★' : '☆'}</button>
                        <button class="btn-icon menu-btn" onclick="event.stopPropagation(); showDeckMenu('${deck.id}')">⋯</button>
                    </div>
                </div>
                <div class="deck-info">
                    <div class="deck-name">${deck.name}</div>
                    <div class="deck-meta">${deck.cards?.length || 0} карт</div>
                </div>
            </div>
        `).join('');
    }
    
    // Добавляем обработчики открытия колоды
    document.querySelectorAll('.deck-card[data-deck-id]').forEach(card => {
        card.addEventListener('click', (e) => {
            // Не открываем если кликнули по кнопке
            if (e.target.closest('.btn-icon')) return;
            const deckId = card.dataset.deckId;
            openDeck(deckId);
        });
    });
}

function updatePermanentDecks() {
    const favoriteCount = document.getElementById('favoriteCount');
    const forgottenCount = document.getElementById('forgottenCount');
    
    if (favoriteCount) {
        favoriteCount.textContent = `${AppState.favoriteDeck.cards.length} карт`;
    }
    if (forgottenCount) {
        forgottenCount.textContent = `${AppState.forgottenDeck.cards.length} карт`;
    }
}

function showCreateDeckModal() {
    if (!canCreateDeck()) {
        showNotification('Лимит создания колод: не более 10 в час', 'error');
        return;
    }
    
    const modal = showModal({
        title: 'Создать колоду',
        body: `
            <div class="form-group">
                <label>Название колоды</label>
                <input type="text" id="newDeckName" placeholder="Введите название">
            </div>
            <div class="form-group">
                <label>Обложка колоды</label>
                <div class="deck-image-upload" id="deckImageUpload">
                    <div class="deck-image-preview" id="deckImagePreview">
                        <div class="deck-image-placeholder">
                            <span class="deck-image-icon">🖼️</span>
                            <span class="deck-image-text">Нажмите для загрузки</span>
                        </div>
                    </div>
                    <input type="file" id="deckImageInput" accept="image/*" style="display: none;">
                </div>
                <button class="btn-small btn-outline" id="removeDeckImage" style="display: none; margin-top: 8px;">Удалить изображение</button>
            </div>
            <div class="form-group">
                <label>Или импортировать</label>
                <div class="drop-zone" id="dropZone">
                    <div class="drop-zone-content">
                        <div class="drop-zone-icon">📁</div>
                        <div class="drop-zone-text">Перетащите файл сюда</div>
                        <div class="drop-zone-hint">или нажмите для выбора .json файла</div>
                    </div>
                    <input type="file" id="importDeck" accept=".json" style="display: none;">
                </div>
                <div class="drop-zone-success" id="dropZoneSuccess" style="display: none;">
                    <span class="success-icon">✓</span>
                    <span id="fileName"></span>
                </div>
            </div>
            <button class="btn" id="createDeckConfirm">Создать</button>
        `
    });
    
    // Обработчик загрузки изображения
    let selectedImage = null;
    const deckImageInput = document.getElementById('deckImageInput');
    const deckImagePreview = document.getElementById('deckImagePreview');
    const removeDeckImage = document.getElementById('removeDeckImage');
    
    if (deckImagePreview && deckImageInput) {
        deckImagePreview.addEventListener('click', () => deckImageInput.click());
        
        deckImageInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleImageUpload(e.target.files[0]);
            }
        });
        
        function handleImageUpload(file) {
            if (!file.type.startsWith('image/')) {
                showNotification('Пожалуйста, выберите изображение', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedImage = e.target.result;
                deckImagePreview.innerHTML = `<img src="${selectedImage}" alt="Обложка" style="width: 100%; height: 100%; object-fit: cover;">`;
                removeDeckImage.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
        
        if (removeDeckImage) {
            removeDeckImage.addEventListener('click', () => {
                selectedImage = null;
                deckImagePreview.innerHTML = `
                    <div class="deck-image-placeholder">
                        <span class="deck-image-icon">🖼️</span>
                        <span class="deck-image-text">Нажмите для загрузки</span>
                    </div>
                `;
                removeDeckImage.style.display = 'none';
                deckImageInput.value = '';
            });
        }
    }
    
    // Drag and drop functionality
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('importDeck');
    const dropZoneSuccess = document.getElementById('dropZoneSuccess');
    const fileNameSpan = document.getElementById('fileName');
    let selectedFile = null;
    
    if (dropZone && fileInput) {
        // Click to open file dialog
        dropZone.addEventListener('click', () => fileInput.click());
        
        // Drag events
        dropZone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only remove class if leaving the drop zone entirely
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
            }
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });
        
        function handleFile(file) {
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                selectedFile = file;
                dropZone.style.display = 'none';
                dropZoneSuccess.style.display = 'flex';
                fileNameSpan.textContent = file.name;
                
                // Success animation
                dropZoneSuccess.style.animation = 'none';
                dropZoneSuccess.offsetHeight; // Trigger reflow
                dropZoneSuccess.style.animation = 'popIn 0.3s ease-out';
            } else {
                showNotification('Пожалуйста, выберите JSON файл', 'error');
            }
        }
    }
    
    document.getElementById('createDeckConfirm').addEventListener('click', async () => {
        const name = document.getElementById('newDeckName').value.trim();
        if (!name) return;
        
        AppState.deckCreateTimes.push(Date.now());
        
        // Если выбран файл, импортируем его
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importedDeck = JSON.parse(e.target.result);
                    const newDeck = {
                        id: 'deck_' + Date.now(),
                        name: name,
                        cards: importedDeck.cards || [],
                        createdAt: new Date().toISOString(),
                        isFavorite: false,
                        customImage: selectedImage
                    };
                    
                    // Sync with server if user is registered
                    if (AppState.user && AppState.user.isRegistered) {
                        try {
                            const result = await ApiService.createDeck(name, '');
                            newDeck.id = result.deck.id;
                            
                            // Add cards to server
                            for (const card of newDeck.cards) {
                                try {
                                    const cardResult = await ApiService.createCard(newDeck.id, card.word || card.front, card.translation || card.back);
                                    card.id = cardResult.card.id;
                                } catch (e) {
                                    console.error('Failed to sync card to server:', e);
                                }
                            }
                            
                            if (selectedImage) {
                                await ApiService.updateDeck(newDeck.id, name, '', selectedImage);
                            }
                        } catch (e) {
                            console.error('Failed to sync deck to server:', e);
                        }
                    }
                    
                    AppState.userDecks.push(newDeck);
                    saveState();
                    
                    modal.classList.remove('active');
                    renderUserDecks();
                    showNotification(`Колода "${name}" импортирована с ${newDeck.cards.length} картами`);
                } catch (err) {
                    showNotification('Ошибка при чтении файла', 'error');
                }
            };
            reader.readAsText(selectedFile);
        } else {
            // Создаем новую колоду без импорта
            const newDeck = {
                id: 'deck_' + Date.now(),
                name: name,
                cards: [],
                createdAt: new Date().toISOString(),
                isFavorite: false,
                customImage: selectedImage
            };
            
            // Send to server
            if (AppState.user && AppState.user.isRegistered) {
                try {
                    const result = await ApiService.createDeck(name, '');
                    newDeck.id = result.deck.id;
                    // Update custom image
                    if (selectedImage) {
                        await ApiService.updateDeck(newDeck.id, name, '', selectedImage);
                    }
                } catch (e) {
                    console.error('Failed to create deck on server:', e);
                }
            }
            
            AppState.userDecks.push(newDeck);
            saveState();
            
            modal.classList.remove('active');
            renderUserDecks();
            showNotification('Колода создана');
        }
    });
}

function openDeck(deckId) {
    const deck = getUserDeck(deckId);
    if (!deck) return;
    
    if (deck.cards.length === 0) {
        showNotification('В этой колоде нет карт', 'error');
        return;
    }
    
    showStudyTypeSelection(deckId);
}

function getUserDeck(deckId) {
    if (deckId === 'favorite') return AppState.favoriteDeck;
    if (deckId === 'forgotten') return AppState.forgottenDeck;
    // Handle both string and number comparison
    const numericDeckId = Number(deckId);
    return AppState.userDecks.find(d => d.id == deckId || d.id === numericDeckId);
}

function showStudyTypeSelection(deckId) {
    const modal = showModal({
        title: 'Выберите режим',
        body: `
            <div class="study-types">
                <button class="type-btn" onclick="startStudy('${deckId}', 1)">Слово → устно</button>
                <button class="type-btn" onclick="startStudy('${deckId}', 2)">Перевод → устно</button>
                <button class="type-btn" onclick="startStudy('${deckId}', 3)">Слово → письменно</button>
                <button class="type-btn" onclick="startStudy('${deckId}', 4)">Перевод → письменно</button>
            </div>
        `
    });
}

function showDeckMenu(deckId) {
    const numericDeckId = Number(deckId);
    const deck = AppState.userDecks.find(d => d.id == deckId || d.id === numericDeckId);
    if (!deck) {
        console.log('Deck not found:', deckId, AppState.userDecks);
        return;
    }
    
    const modal = showModal({
        title: deck.name,
        body: `
            <div class="deck-menu">
                <button class="menu-item" onclick="editDeckName('${deckId}')">Редактировать название</button>
                <button class="menu-item" onclick="changeDeckImage('${deckId}')">Изменить обложку</button>
                <button class="menu-item" onclick="viewCards('${deckId}')">Список карт</button>
                <button class="menu-item" onclick="exportDeck('${deckId}')">Экспортировать</button>
                <button class="menu-item danger" onclick="deleteDeck('${deckId}')">Удалить колоду</button>
            </div>
        `
    });
}

function viewCards(deckId) {
    const deck = getUserDeck(deckId);
    if (!deck) return;
    
    const modal = showModal({
        title: `${deck.name} — карты`,
        body: `
            <div class="cards-list" id="cardsList">
                ${deck.cards.map(card => `
                    <div class="card-item" data-card-id="${card.id}">
                        <div>
                            <div class="card-word">${card.word}</div>
                            <div class="card-translation">${card.translation}</div>
                        </div>
                        <div class="card-actions">
                            <button class="btn-icon favorite-btn ${isCardFavorite(card.id) ? 'filled' : ''}" onclick="toggleCardFavorite('${deckId}', '${card.id}')" title="${isCardFavorite(card.id) ? 'Убрать из избранного' : 'Добавить в избранное'}">
                                ${isCardFavorite(card.id) ? '★' : '☆'}
                            </button>
                            <button class="btn-icon" onclick="editCard('${deckId}', '${card.id}')">✎</button>
                            <button class="btn-icon" onclick="deleteCard('${deckId}', '${card.id}')">×</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="btn" style="margin-top: 20px;" onclick="showAddCardModal('${deckId}')">+ Добавить карточку</button>
        `
    });
}

function showAddCardModal(deckId) {
    if (!canCreateCard()) {
        showNotification('Лимит создания карт: 100 в час', 'error');
        return;
    }
    
    const modal = showModal({
        title: 'Новая карточка',
        body: `
            <div class="form-group">
                <label>Слово</label>
                <input type="text" id="newWord" placeholder="Например: dog">
            </div>
            <div class="form-group">
                <label>Перевод</label>
                <input type="text" id="newTranslation" placeholder="Например: собака">
            </div>
            <button class="btn" id="addCardConfirm">Добавить</button>
        `
    });
    
    document.getElementById('addCardConfirm').addEventListener('click', async () => {
        const word = document.getElementById('newWord').value.trim();
        const translation = document.getElementById('newTranslation').value.trim();
        
        if (!word || !translation) return;
        
        AppState.cardCreateTimes.push(Date.now());
        
        const deck = getUserDeck(deckId);
        console.log('Creating card in deck:', deckId, 'deck.id:', deck?.id, 'type:', typeof deck?.id);
        
        if (deck) {
            const newCard = {
                id: 'card_' + Date.now() + Math.random(),
                word: word,
                translation: translation,
                repetitions: 0,
                interval: 1,
                ease: 2.5,
                nextReview: new Date().toISOString()
            };
            
            deck.cards.push(newCard);
            
            // Send to server if deck has server ID (numeric)
            if (AppState.user && AppState.user.isRegistered && typeof deck.id === 'number') {
                try {
                    const result = await ApiService.createCard(deck.id, word, translation);
                    // Update card ID with server ID
                    newCard.id = result.card.id;
                } catch (e) {
                    console.error('Failed to create card on server:', e);
                }
            }
            
            saveState();
            
            modal.classList.remove('active');
            viewCards(deckId);
            showNotification('Карточка добавлена');
        }
    });
}

function startStudy(deckId, mode) {
    document.querySelector('.modal-overlay')?.classList.remove('active');
    
    const deck = getUserDeck(deckId);
    if (!deck || deck.cards.length === 0) return;
    
    AppState.currentStudy = {
        deckId: deckId,
        mode: mode,
        cards: [...deck.cards],
        currentIndex: 0,
        results: [],
        startTime: Date.now(),
        cardsStudied: 0
    };
    
    showStudySession();
}

function showStudySession() {
    const study = AppState.currentStudy;
    if (!study || study.cards.length === 0) return;
    
    const currentCard = study.cards[study.currentIndex];
    const isWordToTranslation = study.mode === 1 || study.mode === 3;
    const isWritten = study.mode === 3 || study.mode === 4;
    
    const displayText = isWordToTranslation ? currentCard.word : currentCard.translation;
    const correctAnswer = isWordToTranslation ? currentCard.translation : currentCard.word;
    const cardId = currentCard.id;
    const isCardFav = isCardFavorite(cardId);
    
    const modal = showModal({
        title: `Карточка ${study.currentIndex + 1}`,
        body: `
            <div>
                <div class="study-card" id="studyCard">${displayText}</div>
                
                <div style="display: flex; justify-content: center; margin-top: 15px;">
                    <button class="btn-icon favorite-btn-large ${isCardFav ? 'filled' : ''}" id="studyFavBtn" onclick="toggleFavoriteFromStudy('${study.deckId}', '${cardId}')" title="${isCardFav ? 'Убрать из избранного' : 'Добавить в избранное'}" style="font-size: 24px; width: 40px; height: 40px;">
                        ${isCardFav ? '★' : '☆'}
                    </button>
                </div>
                
                ${isWritten ? `
                    <div style="margin-top: 20px; min-height: 150px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 30px;">
                        <input type="text" id="writtenAnswer" placeholder="Введите перевод..." style="max-width: 250px; width: 100%; background: var(--bg-primary); border-color: var(--border);">
                        <button class="btn" style="margin-top: 10px; max-width: 250px; margin-bottom: 25px;" id="checkAnswer">Проверить</button>
                    </div>
                ` : `
                    <div class="study-controls">
                        <button class="control-btn left" id="dontKnowBtn">← Не знаю</button>
                        <button class="control-btn right" id="knowBtn">Знаю →</button>
                    </div>
                `}
                
                <div style="text-align: center; margin-top: 20px; color: var(--text-secondary);">
                    ${study.currentIndex + 1} / ${study.cards.length}
                </div>
            </div>
        `
    });
    
    // Добавляем кнопку закрытия
    const modalContent = modal.querySelector('.modal-content');
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 15px;
        right: 20px;
        font-size: 24px;
        cursor: pointer;
        color: var(--text-secondary);
        z-index: 1001;
    `;
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        setTimeout(() => {
            document.getElementById('modalContainer').innerHTML = '';
            AppState.currentStudy = null;
        }, 300);
    });
    modalContent.appendChild(closeBtn);
    
    // Отключаем закрытие модалки при клике на оверлей
    modal.style.pointerEvents = 'none'; // Отключаем клики по оверлею
    modalContent.style.pointerEvents = 'auto'; // Включаем клики только на контенте
    modalContent.style.maxWidth = '600px'; // Ограничиваем ширину для всех устройств
    modalContent.style.margin = 'auto'; // Центрируем

    
    if (!isWritten) {
        // Свайпы для ПК (мышь) и мобильных (тач)
        const studyCard = document.getElementById('studyCard');
        let startX = 0;
        let startY = 0;
        let isDragging = false;
        
        // Функция анимации свайпа при нажатии на кнопки
        function animateSwipe(direction, callback) {
            const startPos = 0;
            const endPos = direction === 'right' ? 300 : -300;
            const startTime = performance.now();
            const duration = 450;
            
            // Добавляем цветную обводку
            studyCard.style.borderColor = direction === 'right' ? 'var(--success)' : 'var(--danger)';
            studyCard.style.boxShadow = direction === 'right' 
                ? '-10px 0 30px rgba(52, 199, 89, 0.5)' 
                : '10px 0 30px rgba(255, 59, 48, 0.5)';
            
            studyCard.style.transition = 'none';
            
            function animate(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                const currentPos = startPos + (endPos - startPos) * easeProgress;
                
                studyCard.style.transform = `translateX(${currentPos}px) rotate(${currentPos * 0.1}deg)`;
                studyCard.style.opacity = 1 - progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    studyCard.style.transition = '';
                    studyCard.style.transform = '';
                    studyCard.style.opacity = '';
                    callback();
                }
            }
            
            requestAnimationFrame(animate);
        }
        
        // Функция драга для свайпа
        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();
            e.stopPropagation();
            
            let currentX;
            if (e.type === 'mousemove') {
                currentX = e.clientX;
            } else {
                currentX = e.touches[0].clientX;
            }
            
            const diff = currentX - startX;
            const maxDiff = 150;
            const limitedDiff = Math.max(-maxDiff, Math.min(maxDiff, diff));
            const opacity = Math.min(Math.abs(limitedDiff) / maxDiff, 0.8);
            
            if (limitedDiff > 0) {
                studyCard.style.transform = `translateX(${limitedDiff}px) rotate(${limitedDiff * 0.1}deg)`;
                studyCard.style.boxShadow = `-10px 0 20px rgba(52, 199, 89, ${opacity})`;
                studyCard.style.borderColor = 'var(--success)';
            } else {
                studyCard.style.transform = `translateX(${limitedDiff}px) rotate(${limitedDiff * 0.1}deg)`;
                studyCard.style.boxShadow = `10px 0 20px rgba(255, 59, 48, ${opacity})`;
                studyCard.style.borderColor = 'var(--danger)';
            }
            
            if (Math.abs(diff) >= maxDiff) {
                isDragging = false;
                const direction = diff > 0 ? 'right' : 'left';
                animateSwipe(direction, () => handleStudyResult(direction === 'right', correctAnswer));
            }
        }
        
        function startDrag(e) {
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            studyCard.style.transition = 'none';
            studyCard.style.cursor = 'grabbing';
            
            if (e.type === 'mousedown') {
                startX = e.clientX;
                startY = e.clientY;
            } else {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }
        }
        
        function endDrag(e) {
            if (!isDragging) return;
            e.preventDefault();
            e.stopPropagation();
            
            let endX;
            if (e.type === 'mouseup') {
                endX = e.clientX;
            } else {
                endX = e.changedTouches[0].clientX;
            }
            
            const diff = endX - startX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    animateSwipe('right', () => handleStudyResult(true, correctAnswer));
                } else {
                    animateSwipe('left', () => handleStudyResult(false, correctAnswer));
                }
            } else {
                studyCard.style.transition = 'all 0.2s';
                studyCard.style.transform = '';
                studyCard.style.boxShadow = '';
                studyCard.style.borderColor = '';
                studyCard.style.cursor = 'grab';
            }
            
            isDragging = false;
        }
        
        function cancelDrag() {
            if (!isDragging) return;
            
            studyCard.style.transition = 'all 0.3s';
            studyCard.style.transform = '';
            studyCard.style.boxShadow = '';
            studyCard.style.borderColor = '';
            studyCard.style.cursor = 'grab';
            isDragging = false;
        }
        
        // Удаляем старые обработчики перед добавлением новых
        studyCard.removeEventListener('mousedown', startDrag);
        studyCard.removeEventListener('mousemove', drag);
        studyCard.removeEventListener('mouseup', endDrag);
        studyCard.removeEventListener('mouseleave', cancelDrag);
        studyCard.removeEventListener('touchstart', startDrag);
        studyCard.removeEventListener('touchmove', drag);
        studyCard.removeEventListener('touchend', endDrag);
        studyCard.removeEventListener('touchcancel', cancelDrag);
        
        // Добавляем обработчики для мыши
        studyCard.addEventListener('mousedown', startDrag);
        studyCard.addEventListener('mousemove', drag);
        studyCard.addEventListener('mouseup', endDrag);
        studyCard.addEventListener('mouseleave', cancelDrag);
        
        // Добавляем обработчики для тач-устройств
        studyCard.addEventListener('touchstart', startDrag);
        studyCard.addEventListener('touchmove', drag);
        studyCard.addEventListener('touchend', endDrag);
        studyCard.addEventListener('touchcancel', cancelDrag);
        
        // Кнопки "Знаю" и "Не знаю"
        const dontKnowBtn = document.getElementById('dontKnowBtn');
        const knowBtn = document.getElementById('knowBtn');
        
        if (dontKnowBtn) {
            dontKnowBtn.onclick = null;
            dontKnowBtn.addEventListener('click', () => {
                animateSwipe('left', () => handleStudyResult(false, correctAnswer));
            });
        }
        
        if (knowBtn) {
            knowBtn.onclick = null;
            knowBtn.addEventListener('click', () => {
                animateSwipe('right', () => handleStudyResult(true, correctAnswer));
            });
        }
    } else {
        document.getElementById('checkAnswer')?.addEventListener('click', () => {
            const answer = document.getElementById('writtenAnswer').value.trim().toLowerCase();
            const isCorrect = answer === correctAnswer.toLowerCase();
            
            // Анимация для письменного режима
            const studyCard = document.getElementById('studyCard');
            if (studyCard) {
                studyCard.style.transition = 'all 0.3s';
                studyCard.style.transform = isCorrect ? 'scale(1.05)' : 'scale(0.95)';
                studyCard.style.backgroundColor = isCorrect ? 'var(--success)' : 'var(--danger)';
                
                setTimeout(() => {
                    studyCard.style.transform = '';
                    studyCard.style.backgroundColor = '';
                    handleStudyResult(isCorrect, correctAnswer);
                }, 300);
            } else {
                handleStudyResult(isCorrect, correctAnswer);
            }
        });
    }
}

function handleStudyResult(knew, correctAnswer) {
    const study = AppState.currentStudy;
    const currentCard = study.cards[study.currentIndex];
    const isForgottenDeck = study.deckId === 'forgotten';
    
    // Увеличиваем счётчик изученных карточек
    study.cardsStudied = (study.cardsStudied || 0) + 1;
    
    if (knew) {
        console.log('User clicked Know');
        currentCard.repetitions++;
        currentCard.interval = Math.min(currentCard.interval * 2, 365);
        
        // Если изучаем колоду "Забытые" и нажали "Знаю" - удаляем из забытых
        if (isForgottenDeck) {
            AppState.forgottenDeck.cards = AppState.forgottenDeck.cards.filter(c => c.id !== currentCard.id);
            
            // Синхронизация с сервером - переключаем флаг is_forgotten
            if (currentCard.id) {
                ApiService.syncUpdateCardForgotten(currentCard.id, false).catch(err => console.error('Sync forgotten error:', err));
            }
            
            saveState();
        }
        
        // Удаляем карточку
        study.cards.splice(study.currentIndex, 1);
        console.log('After splice, cards:', study.cards.length);
        
        AppState.user.learnedWords++;
        saveState();
    } else {
        currentCard.repetitions = 0;
        currentCard.interval = 1;
        
        // Если изучаем НЕ колоду "Забытые" и нажали "Не знаю" - добавляем в забытые
        if (!isForgottenDeck) {
            const cardId = currentCard.id;
            const alreadyInForgotten = AppState.forgottenDeck.cards.some(c => c.id === cardId || c.id === Number(cardId));
            if (!alreadyInForgotten) {
                AppState.forgottenDeck.cards.push({...currentCard});
                
                // Синхронизация с сервером - переключаем флаг is_forgotten
                if (cardId) {
                    ApiService.syncUpdateCardForgotten(cardId, true).catch(err => console.error('Sync forgotten error:', err));
                }
                
                console.log('Added to forgotten deck:', currentCard.id);
                saveState();
            }
        }
        
        // Возвращаем в конец очереди ТОЛЬКО ОДИН раз
        const cardId = currentCard.id;
        const alreadyInQueue = study.cards.some(c => c.id === cardId || c.id === Number(cardId));
        if (!alreadyInQueue) {
            study.cards.push(currentCard);
        }
        study.currentIndex++;
        
        showNotification(`Правильно: ${correctAnswer}`, 'info');
    }
    
    console.log('Before check - cards.length:', study.cards.length, 'currentIndex:', study.currentIndex);
    
    // Если карточек не осталось, показываем модалку завершения
    if (study.cards.length === 0) {
        showCompletionModal();
        return;
    }
    
    // Если индекс вышел за пределы, сбрасываем
    if (study.currentIndex >= study.cards.length) {
        study.currentIndex = 0;
    }
    
    document.querySelector('.modal-overlay')?.classList.remove('active');
    showStudySession();
}

function showCompletionModal() {
    console.log('showCompletionModal called');
    
    // Сохраняем время занятий
    const study = AppState.currentStudy;
    console.log('study:', study);
    console.log('cards:', study ? study.cards : 'none');
    
    if (study && study.startTime) {
        const sessionTime = Math.floor((Date.now() - study.startTime) / 1000); // в секундах
        AppState.user.studyTime += sessionTime;
    }
    
    // Подсчитываем сколько карточек изучено
    const cardsStudied = study ? study.cardsStudied || 0 : 0;
    console.log('cardsStudied:', cardsStudied);
    
    updateStreak();
    
    // Обновляем accuracy
    if (AppState.user.learnedWords > 0) {
        AppState.user.accuracy = Math.min(95, 70 + Math.floor(AppState.user.streak * 0.5));
    } else {
        AppState.user.accuracy = 0;
    }
    
    saveState();
    saveStatsToServer();
    
    // Записываем активность - день стал активным
    if (cardsStudied > 0) {
        // Инициализируем activity если её нет
        if (!AppState.user.activity) {
            AppState.user.activity = {};
        }
        
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        AppState.user.activity[todayStr] = true;
        saveState();
        
        // Записываем в БД
        if (typeof ApiService !== 'undefined') {
            ApiService.recordActivity(cardsStudied, todayStr)
                .catch(err => console.error('Failed to record activity:', err));
        }
    }
    
    console.log('Showing modal...');
    
    const modal = showModal({
        title: 'Поздравляем!',
        body: `
            <div style="text-align: center;">
                <p style="font-size: 20px; color: var(--text-primary); margin-bottom: 20px;">
                    Вы успешно решили все карты! 🎉
                </p>
                <button class="btn" id="closeCompletionBtn">Закрыть</button>
            </div>
        `
    });
    
    // Обработчик для кнопки "Закрыть"
    document.getElementById('closeCompletionBtn').addEventListener('click', () => {
        modal.classList.remove('active');
        setTimeout(() => {
            document.getElementById('modalContainer').innerHTML = '';
            AppState.currentStudy = null;
        }, 300);
    });
    
    // Отключаем закрытие модалки при клике на оверлей
    const modalContent = modal.querySelector('.modal-content');
    modal.style.pointerEvents = 'none';
    modalContent.style.pointerEvents = 'auto';
    modalContent.style.maxWidth = '600px';
    modalContent.style.margin = 'auto';
}

function toggleFavorite(deckId) {
    const numericDeckId = Number(deckId);
    const deck = AppState.userDecks.find(d => d.id == deckId || d.id === numericDeckId);
    if (deck) {
        deck.isFavorite = !deck.isFavorite;
        
        if (deck.isFavorite) {
            deck.cards.forEach(card => {
                if (!AppState.favoriteDeck.cards.some(c => c.id === card.id)) {
                    AppState.favoriteDeck.cards.push({...card});
                    
                    // Sync with server if card has numeric ID
                    if (AppState.user && AppState.user.isRegistered && typeof card.id === 'number') {
                        try {
                            ApiService.toggleFavorite(card.id);
                        } catch (e) {
                            console.error('Failed to sync favorite to server:', e);
                        }
                    }
                }
            });
        } else {
            AppState.favoriteDeck.cards = AppState.favoriteDeck.cards.filter(
                c => !deck.cards.some(dc => dc.id === c.id)
            );
            
            // Sync with server - toggle off for all cards
            deck.cards.forEach(card => {
                if (AppState.user && AppState.user.isRegistered && typeof card.id === 'number') {
                    try {
                        ApiService.toggleFavorite(card.id);
                    } catch (e) {
                        console.error('Failed to sync favorite to server:', e);
                    }
                }
            });
        }
        
        saveState();
        renderUserDecks();
        updatePermanentDecks();
        showNotification(deck.isFavorite ? 'Добавлено в избранное' : 'Удалено из избранного');
    }
}

function isCardFavorite(cardId) {
    // Check both in favoriteDeck and card's is_favorite property
    const inFavorites = AppState.favoriteDeck.cards.some(c => c.id == cardId || c.id === Number(cardId));
    
    // Also check in user decks
    for (const deck of AppState.userDecks) {
        const card = deck.cards?.find(c => c.id == cardId || c.id === Number(cardId));
        if (card && card.is_favorite === true) return true;
    }
    
    return inFavorites;
}

function toggleCardFavorite(deckId, cardId) {
    const deck = getUserDeck(deckId);
    if (!deck) return;
    
    const card = deck.cards.find(c => c.id === cardId);
    if (!card) return;
    
    const isFavorite = isCardFavorite(cardId);
    
    if (isFavorite) {
        // Удаляем из избранного
        AppState.favoriteDeck.cards = AppState.favoriteDeck.cards.filter(c => c.id !== cardId);
        showNotification('Удалено из избранного');
    } else {
        // Добавляем в избранное
        AppState.favoriteDeck.cards.push({...card});
        showNotification('Добавлено в избранное');
    }
    
    saveState();
    
    // Sync with server if card has numeric ID
    if (AppState.user && AppState.user.isRegistered && typeof card.id === 'number') {
        try {
            ApiService.toggleFavorite(card.id);
        } catch (e) {
            console.error('Failed to sync favorite to server:', e);
        }
    }
    
    // Обновляем отображение карточек
    viewCards(deckId);
}

function toggleFavoriteFromStudy(deckId, cardId) {
    const deck = getUserDeck(deckId);
    if (!deck) return;
    
    const card = deck.cards.find(c => c.id == cardId);
    if (!card) return;
    
    const isFavorite = isCardFavorite(cardId);
    
    if (isFavorite) {
        AppState.favoriteDeck.cards = AppState.favoriteDeck.cards.filter(c => c.id !== cardId);
        showNotification('Удалено из избранного');
    } else {
        AppState.favoriteDeck.cards.push({...card});
        showNotification('Добавлено в избранное');
    }
    
    saveState();
    updatePermanentDecks();
    
    // Sync with server if card has numeric ID
    if (AppState.user && AppState.user.isRegistered && typeof card.id === 'number') {
        try {
            ApiService.toggleFavorite(card.id);
        } catch (e) {
            console.error('Failed to sync favorite to server:', e);
        }
    }
    
    // Обновляем кнопку в study-режиме
    const favBtn = document.getElementById('studyFavBtn');
    if (favBtn) {
        // После изменения состояния проверяем актуальное значение
        const newIsFav = !isFavorite; // Инвертируем значение, так как состояние уже изменилось
        favBtn.classList.toggle('filled', newIsFav);
        favBtn.innerHTML = newIsFav ? '★' : '☆';
        favBtn.title = newIsFav ? 'Убрать из избранного' : 'Добавить в избранное';
    }
}

function deleteDeck(deckId) {
    if (confirm('Удалить эту колоду?')) {
        // Convert deckId to number for proper comparison (since IDs from server are numbers)
        const numericDeckId = Number(deckId);
        const deck = AppState.userDecks.find(d => d.id == deckId || d.id === numericDeckId);
        
        // Delete from server - use deck.id (server ID)
        if (AppState.user && AppState.user.isRegistered && deck) {
            try {
                const serverId = typeof deck.id === 'number' ? deck.id : numericDeckId;
                ApiService.deleteDeck(serverId);
            } catch (e) {
                console.error('Failed to delete deck on server:', e);
            }
        }
        
        // Filter using both string and number comparison
        AppState.userDecks = AppState.userDecks.filter(d => d.id != deckId && d.id != numericDeckId);
        saveState();
        document.querySelector('.modal-overlay')?.classList.remove('active');
        renderUserDecks();
        showNotification('Колода удалена');
    }
}

function exportDeck(deckId) {
    const numericDeckId = Number(deckId);
    const deck = AppState.userDecks.find(d => d.id == deckId || d.id === numericDeckId);
    if (!deck) return;
    
    const dataStr = JSON.stringify(deck, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `${deck.name}.json`);
    linkElement.click();
}

function editDeckName(deckId) {
    const numericDeckId = Number(deckId);
    const deck = AppState.userDecks.find(d => d.id == deckId || d.id === numericDeckId);
    if (!deck) return;
    
    const modal = showModal({
        title: 'Редактировать название',
        body: `
            <div class="form-group">
                <input type="text" id="newDeckName" value="${deck.name}">
            </div>
            <button class="btn" id="saveDeckName">Сохранить</button>
        `
    });
    
    document.getElementById('saveDeckName').addEventListener('click', async () => {
        const newName = document.getElementById('newDeckName').value.trim();
        if (newName) {
            deck.name = newName;
            
            // Send to server only if deck has numeric server ID
            if (AppState.user && AppState.user.isRegistered && typeof deck.id === 'number') {
                try {
                    await ApiService.updateDeck(deck.id, deck.name, deck.description || '', deck.customImage || null);
                } catch (e) {
                    console.error('Failed to update deck on server:', e);
                }
            }
            
            saveState();
            modal.classList.remove('active');
            renderUserDecks();
            showNotification('Название обновлено');
        }
    });
}

function changeDeckImage(deckId) {
    const numericDeckId = Number(deckId);
    const deck = AppState.userDecks.find(d => d.id == deckId || d.id === numericDeckId);
    if (!deck) return;
    
    const modal = showModal({
        title: 'Изменить обложку',
        body: `
            <div class="form-group">
                <div class="deck-image-upload" id="deckImageUpload">
                    <div class="deck-image-preview" id="deckImagePreview">
                        ${deck.customImage ? 
                            `<img src="${deck.customImage}" alt="Обложка" style="width: 100%; height: 100%; object-fit: cover;">` :
                            `<div class="deck-image-placeholder">
                                <span class="deck-image-icon">🖼️</span>
                                <span class="deck-image-text">Нажмите для загрузки</span>
                            </div>`
                        }
                    </div>
                    <input type="file" id="deckImageInput" accept="image/*" style="display: none;">
                </div>
                <button class="btn-small btn-outline" id="removeDeckImage" style="${deck.customImage ? 'display: block; margin-top: 8px;' : 'display: none; margin-top: 8px;'}">Удалить изображение</button>
            </div>
            <button class="btn" id="saveDeckImage">Сохранить</button>
        `
    });
    
    let selectedImage = deck.customImage || null;
    const deckImageInput = document.getElementById('deckImageInput');
    const deckImagePreview = document.getElementById('deckImagePreview');
    const removeDeckImage = document.getElementById('removeDeckImage');
    
    if (deckImagePreview && deckImageInput) {
        deckImagePreview.addEventListener('click', () => deckImageInput.click());
        
        deckImageInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleImageUpload(e.target.files[0]);
            }
        });
        
        function handleImageUpload(file) {
            if (!file.type.startsWith('image/')) {
                showNotification('Пожалуйста, выберите изображение', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedImage = e.target.result;
                deckImagePreview.innerHTML = `<img src="${selectedImage}" alt="Обложка" style="width: 100%; height: 100%; object-fit: cover;">`;
                removeDeckImage.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
        
        if (removeDeckImage) {
            removeDeckImage.addEventListener('click', () => {
                selectedImage = null;
                deckImagePreview.innerHTML = `
                    <div class="deck-image-placeholder">
                        <span class="deck-image-icon">🖼️</span>
                        <span class="deck-image-text">Нажмите для загрузки</span>
                    </div>
                `;
                removeDeckImage.style.display = 'none';
                deckImageInput.value = '';
            });
        }
    }
    
    document.getElementById('saveDeckImage').addEventListener('click', async () => {
        deck.customImage = selectedImage;
        
        // Send to server only if deck has numeric server ID
        if (AppState.user && AppState.user.isRegistered && typeof deck.id === 'number') {
            try {
                await ApiService.updateDeck(deck.id, deck.name, deck.description || '', deck.customImage || null);
            } catch (e) {
                console.error('Failed to update deck on server:', e);
            }
        }
        
        saveState();
        modal.classList.remove('active');
        renderUserDecks();
        showNotification('Обложка обновлена');
    });
}

function deleteCard(deckId, cardId) {
    if (confirm('Удалить эту карточку?')) {
        const deck = getUserDeck(deckId);
        const card = deck?.cards.find(c => c.id == cardId);
        
        if (deck) {
            deck.cards = deck.cards.filter(c => c.id != cardId);
            
            // Delete from server only if card has numeric server ID
            if (AppState.user && AppState.user.isRegistered && card && typeof card.id === 'number') {
                try {
                    ApiService.deleteCard(card.id);
                } catch (e) {
                    console.error('Failed to delete card on server:', e);
                }
            }
            
            saveState();
            viewCards(deckId);
        }
    }
}

function editCard(deckId, cardId) {
    const deck = getUserDeck(deckId);
    const card = deck?.cards.find(c => c.id == cardId);
    if (!card) return;
    
    const modal = showModal({
        title: 'Редактировать карточку',
        body: `
            <div class="form-group">
                <label>Слово</label>
                <input type="text" id="editWord" value="${card.word}">
            </div>
            <div class="form-group">
                <label>Перевод</label>
                <input type="text" id="editTranslation" value="${card.translation}">
            </div>
            <button class="btn" id="saveCard">Сохранить</button>
        `
    });
    
    document.getElementById('saveCard').addEventListener('click', async () => {
        const newWord = document.getElementById('editWord').value.trim();
        const newTranslation = document.getElementById('editTranslation').value.trim();
        
        if (newWord && newTranslation) {
            card.word = newWord;
            card.translation = newTranslation;
            
            // Send to server only if card has numeric server ID
            if (AppState.user && AppState.user.isRegistered && typeof card.id === 'number') {
                try {
                    await ApiService.updateCard(card.id, newWord, newTranslation);
                } catch (e) {
                    console.error('Failed to update card on server:', e);
                }
            }
            
            saveState();
            modal.classList.remove('active');
            viewCards(deckId);
            showNotification('Карточка обновлена');
        }
    });
}

// Экспорт функций в глобальную область видимости
window.toggleFavorite = toggleFavorite;
window.showDeckMenu = showDeckMenu;
window.startStudy = startStudy;
window.viewCards = viewCards;
window.editCard = editCard;
window.deleteCard = deleteCard;
window.showAddCardModal = showAddCardModal;
window.editDeckName = editDeckName;
window.exportDeck = exportDeck;
window.deleteDeck = deleteDeck;
window.isCardFavorite = isCardFavorite;
window.toggleCardFavorite = toggleCardFavorite;
window.toggleFavoriteFromStudy = toggleFavoriteFromStudy;
window.changeDeckImage = changeDeckImage;
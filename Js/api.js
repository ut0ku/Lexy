// API Service for connecting to backend
const API_URL = '/api';

const ApiService = {
    // Auth endpoints
    async register(name, username, password) {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Registration failed');
        return data;
    },

    async login(username, password) {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');
        return data;
    },

    async getMe() {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get user');
        return data;
    },

    async updateProfile(name, avatar) {
        const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ name, avatar })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update profile');
        return data;
    },

    async changePassword(currentPassword, newPassword) {
        const response = await fetch(`${API_URL}/auth/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to change password');
        return data;
    },

    async deleteAccount() {
        const response = await fetch(`${API_URL}/auth/account`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete account');
        return data;
    },

    // Activity endpoints
    async getActivity() {
        const response = await fetch(`${API_URL}/activity`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get activity');
        return data;
    },

    async recordActivity(cardsStudied = 1) {
        const response = await fetch(`${API_URL}/activity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ cardsStudied })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to record activity');
        return data;
    },

    // Decks endpoints
    async getDecks() {
        const response = await fetch(`${API_URL}/decks`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get decks');
        return data;
    },

    async createDeck(name, description) {
        const response = await fetch(`${API_URL}/decks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ name, description })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create deck');
        return data;
    },

    async deleteDeck(id) {
        const response = await fetch(`${API_URL}/decks/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete deck');
        return data;
    },

    // Cards endpoints
    async getCards(deckId) {
        const response = await fetch(`${API_URL}/decks/${deckId}/cards`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get cards');
        return data;
    },

    async createCard(deckId, front, back) {
        const response = await fetch(`${API_URL}/decks/${deckId}/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ front, back })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create card');
        return data;
    },

    async toggleFavorite(cardId) {
        const response = await fetch(`${API_URL}/cards/${cardId}/favorite`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to toggle favorite');
        return data;
    },

    async deleteCard(id) {
        const response = await fetch(`${API_URL}/cards/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete card');
        return data;
    },

    // Sync endpoints
    async syncGet() {
        const response = await fetch(`${API_URL}/sync`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to sync');
        return data;
    },

    async syncSave(decks) {
        const response = await fetch(`${API_URL}/sync`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ decks })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to save');
        return data;
    },

    // Public decks (for all users)
    async getPublicDecks() {
        const response = await fetch(`${API_URL}/public-decks`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get public decks');
        return data;
    },

    async getPublicDeckCards(deckId) {
        const response = await fetch(`${API_URL}/public-decks/${deckId}/cards`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get cards');
        return data;
    },

    // Admin: Public decks management
    async getAdminPublicDecks() {
        const response = await fetch(`${API_URL}/admin/public-decks`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get decks');
        return data;
    },

    async createPublicDeck(name, description, lang, category = '') {
        const response = await fetch(`${API_URL}/admin/public-decks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ name, description, lang, category })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create deck');
        return data;
    },

    async updatePublicDeck(id, name, description, lang, category = '') {
        const response = await fetch(`${API_URL}/admin/public-decks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ name, description, lang, category })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update deck');
        return data;
    },

    async deletePublicDeck(id) {
        const response = await fetch(`${API_URL}/admin/public-decks/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete deck');
        return data;
    },

    async getAdminPublicDeckCards(deckId) {
        const response = await fetch(`${API_URL}/admin/public-decks/${deckId}/cards`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get cards');
        return data;
    },

    async createPublicCard(deckId, front, back) {
        const response = await fetch(`${API_URL}/admin/public-decks/${deckId}/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ front, back })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create card');
        return data;
    },

    async deletePublicCard(id) {
        const response = await fetch(`${API_URL}/admin/public-cards/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete card');
        return data;
    },

    // Admin endpoints
    async getAllUsers() {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get users');
        return data;
    },

    async updateUserRole(userId, role) {
        const response = await fetch(`${API_URL}/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ role })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update role');
        return data;
    }
};

// Helper function to get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('lexy_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Export for use in other files
window.ApiService = ApiService;

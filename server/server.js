require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from root directory
app.use(express.static(path.join(__dirname, '..')));

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// PostgreSQL connection
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'lexy',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
    ssl: false
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'lexy-secret-key-2024';

// Database initialization
async function initDatabase() {
    try {
        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                avatar VARCHAR(10) DEFAULT '👤',
                streak INTEGER DEFAULT 0,
                learned_words INTEGER DEFAULT 0,
                study_time INTEGER DEFAULT 0,
                accuracy INTEGER DEFAULT 0,
                last_study_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migration: Add stats columns if they don't exist
        try {
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0`);
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS learned_words INTEGER DEFAULT 0`);
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS study_time INTEGER DEFAULT 0`);
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS accuracy INTEGER DEFAULT 0`);
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_study_date DATE`);
        } catch (e) {
            // Columns might already exist
        }

        // Create user_activity table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_activity (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                cards_studied INTEGER DEFAULT 0,
                UNIQUE(user_id, date)
            )
        `);

        // Create user_decks table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_decks (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                custom_image TEXT,
                source TEXT DEFAULT 'created',
                public_deck_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add custom_image column if not exists (for existing databases)
        try {
            await pool.query(`
                ALTER TABLE user_decks ADD COLUMN IF NOT EXISTS custom_image TEXT
            `);
        } catch (e) {
            // Column might already exist
        }
        
        // Add source column if not exists
        try {
            await pool.query(`
                ALTER TABLE user_decks ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'created'
            `);
        } catch (e) {
            // Column might already exist
        }
        
        // Add public_deck_id column if not exists
        try {
            await pool.query(`
                ALTER TABLE user_decks ADD COLUMN IF NOT EXISTS public_deck_id INTEGER
            `);
        } catch (e) {
            // Column might already exist
        }

        // Add deck_images table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS deck_images (
                id SERIAL PRIMARY KEY,
                deck_id INTEGER REFERENCES user_decks(id) ON DELETE CASCADE UNIQUE,
                image_data BYTEA NOT NULL,
                mime_type VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create user_cards table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_cards (
                id SERIAL PRIMARY KEY,
                deck_id INTEGER REFERENCES user_decks(id) ON DELETE CASCADE,
                front TEXT NOT NULL,
                back TEXT NOT NULL,
                is_favorite BOOLEAN DEFAULT FALSE,
                is_forgotten BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Add is_forgotten column if it doesn't exist (for existing databases)
        try {
            await pool.query(`
                ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS is_forgotten BOOLEAN DEFAULT FALSE
            `);
        } catch (e) {
            // Column might already exist
        }
        
        // Fix is_forgotten column type if it's not boolean
        try {
            await pool.query(`
                ALTER TABLE user_cards ALTER COLUMN is_forgotten TYPE BOOLEAN USING (is_forgotten::boolean)
            `);
        } catch (e) {
            // Type might already be correct
        }
        
        // Fix is_favorite column type if it's not boolean
        try {
            await pool.query(`
                ALTER TABLE user_cards ALTER COLUMN is_favorite TYPE BOOLEAN USING (is_favorite::boolean)
            `);
        } catch (e) {
            // Type might already be correct
        }

        // Create public_decks table (for library)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public_decks (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                lang VARCHAR(50) DEFAULT 'Английский',
                category TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add category column if not exists (for existing databases)
        try {
            await pool.query(`
                ALTER TABLE public_decks ADD COLUMN IF NOT EXISTS category TEXT DEFAULT ''
            `);
        } catch (e) {
            // Column might already exist
        }
        
        // Set default category for existing rows that have NULL
        try {
            await pool.query(`
                UPDATE public_decks SET category = '' WHERE category IS NULL
            `);
        } catch (e) {
            // May fail if column doesn't exist
        }

        // Add custom_image column if not exists
        try {
            await pool.query(`
                ALTER TABLE public_decks ADD COLUMN IF NOT EXISTS custom_image TEXT
            `);
        } catch (e) {
            // Column might already exist
        }

        // Add public_deck_images table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public_deck_images (
                id SERIAL PRIMARY KEY,
                deck_id INTEGER REFERENCES public_decks(id) ON DELETE CASCADE UNIQUE,
                image_data BYTEA NOT NULL,
                mime_type VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create public_cards table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public_cards (
                id SERIAL PRIMARY KEY,
                deck_id INTEGER REFERENCES public_decks(id) ON DELETE CASCADE,
                front TEXT NOT NULL,
                back TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create admin user if not exists
        const adminExists = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
        if (adminExists.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                'INSERT INTO users (name, username, password, role, avatar) VALUES ($1, $2, $3, $4, $5)',
                ['Admin', 'admin', hashedPassword, 'admin', '👑']
            );
            console.log('Admin user created: admin / admin123');
        }

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

// Initialize database
initDatabase();

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Неверный токен' });
        }
        req.user = user;
        next();
    });
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, username, password } = req.body;

        if (!name || !username || !password) {
            return res.status(400).json({ error: 'Заполните все поля' });
        }

        // Check if user exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Determine role (first user is admin)
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        const role = userCount.rows[0].count === '0' ? 'admin' : 'user';

        // Create user
        const result = await pool.query(
            'INSERT INTO users (name, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, username, role, avatar',
            [name, username, hashedPassword, role]
        );

        const user = result.rows[0];

        // Generate token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Регистрация успешна',
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Введите логин и пароль' });
        }

        // Find user
        const result = await pool.query(
            'SELECT id, name, username, password, role, avatar FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Неверный логин или пароль' });
        }

        const user = result.rows[0];

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Неверный логин или пароль' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Вход выполнен',
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, username, role, avatar, streak, learned_words, study_time, accuracy, last_study_date, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Update profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const { name, avatar } = req.body;

        const result = await pool.query(
            'UPDATE users SET name = COALESCE($1, name), avatar = COALESCE($2, avatar) WHERE id = $3 RETURNING id, name, username, role, avatar',
            [name, avatar, req.user.id]
        );

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Update stats
app.put('/api/auth/stats', authenticateToken, async (req, res) => {
    try {
        const { streak, learned_words, study_time, accuracy, last_study_date } = req.body;

        const result = await pool.query(
            `UPDATE users SET 
                streak = $1, 
                learned_words = $2, 
                study_time = $3,
                accuracy = $4,
                last_study_date = $5
            WHERE id = $6 
            RETURNING id, name, username, role, avatar, streak, learned_words, study_time, accuracy, last_study_date`,
            [streak, learned_words, study_time, accuracy, last_study_date, req.user.id]
        );

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Update stats error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Get stats
app.get('/api/auth/stats', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT streak, learned_words, study_time, accuracy, last_study_date FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Change password
app.put('/api/auth/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Get current password
        const result = await pool.query(
            'SELECT password FROM users WHERE id = $1',
            [req.user.id]
        );

        const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Неверный текущий пароль' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hashedPassword, req.user.id]
        );

        res.json({ message: 'Пароль изменён' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Delete account
app.delete('/api/auth/account', authenticateToken, async (req, res) => {
    try {
        // Проверяем, что пользователь не админ
        if (req.user.role === 'admin') {
            return res.status(403).json({ error: 'Админ не может удалить свой профиль' });
        }
        
        // Удаляем пользователя (каскадно удалятся все связанные данные)
        await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
        res.json({ message: 'Аккаунт удалён' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ==================== ACTIVITY ROUTES ====================

// Get activity
app.get('/api/activity', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT date, cards_studied FROM user_activity WHERE user_id = $1 ORDER BY date DESC LIMIT 365',
            [req.user.id]
        );

        const activity = {};
        result.rows.forEach(row => {
            // Явно преобразуем дату в строку YYYY-MM-DD
            const d = new Date(row.date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            activity[dateStr] = row.cards_studied;
        });

        res.json({ activity });
    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Record activity
app.post('/api/activity', authenticateToken, async (req, res) => {
    try {
        const { cardsStudied = 1 } = req.body;
        
        // Используем локальное время пользователя (отправленное с клиента) или текущее локальное время сервера
        const clientDate = req.body.date;
        const today = clientDate || new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split('T')[0]; // Moscow time (UTC+3)

        await pool.query(
            `INSERT INTO user_activity (user_id, date, cards_studied) 
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, date) 
             DO UPDATE SET cards_studied = user_activity.cards_studied + $3`,
            [req.user.id, today, cardsStudied]
        );

        res.json({ message: 'Активность записана' });
    } catch (error) {
        console.error('Record activity error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ==================== DECKS & CARDS ROUTES ====================

// Sync all user data (decks and cards)
app.get('/api/sync', authenticateToken, async (req, res) => {
    try {
        // Get all decks
        const decksResult = await pool.query(
            'SELECT * FROM user_decks WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        
        // Get all cards
        const cardsResult = await pool.query(
            'SELECT uc.* FROM user_cards uc JOIN user_decks ud ON uc.deck_id = ud.id WHERE ud.user_id = $1',
            [req.user.id]
        );
        
        res.json({
            decks: decksResult.rows,
            cards: cardsResult.rows
        });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Save all user data (decks and cards)
app.put('/api/sync', authenticateToken, async (req, res) => {
    try {
        const { decks } = req.body;
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Backup existing deck images before deletion
            const imagesBackup = {};
            const imagesResult = await client.query(
                'SELECT di.deck_id, di.image_data, di.mime_type FROM deck_images di JOIN user_decks ud ON di.deck_id = ud.id WHERE ud.user_id = $1',
                [req.user.id]
            );
            imagesResult.rows.forEach(row => {
                imagesBackup[row.deck_id] = row;
            });

            // Delete existing decks and cards
            await client.query(
                'DELETE FROM user_cards WHERE deck_id IN (SELECT id FROM user_decks WHERE user_id = $1)',
                [req.user.id]
            );
            await client.query(
                'DELETE FROM user_decks WHERE user_id = $1',
                [req.user.id]
            );
            
            // Insert decks and cards
            if (decks && Array.isArray(decks)) {
                for (const deck of decks) {
                    let customImage = deck.customImage || null;
                    
                    const deckResult = await client.query(
                        'INSERT INTO user_decks (user_id, name, description, custom_image, source, public_deck_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                        [req.user.id, deck.name, deck.description || '', customImage, deck.source || 'created', deck.publicDeckId || null]
                    );
                    const newDeckId = deckResult.rows[0].id;
                    
                    // Recover image if it was pointing to an old deck ID
                    if (customImage && typeof customImage === 'string') {
                        const match = customImage.match(new RegExp('^/api/decks/(\\\\d+)/image'));
                        if (match) {
                            const oldDeckId = parseInt(match[1], 10);
                            const backup = imagesBackup[oldDeckId];
                            if (backup) {
                                await client.query(
                                    'INSERT INTO deck_images (deck_id, image_data, mime_type) VALUES ($1, $2, $3)',
                                    [newDeckId, backup.image_data, backup.mime_type]
                                );
                                const newImageUrl = `/api/decks/${newDeckId}/image?t=${Date.now()}`;
                                await client.query('UPDATE user_decks SET custom_image = $1 WHERE id = $2', [newImageUrl, newDeckId]);
                            }
                        }
                    }

                    // Insert cards for this deck
                    if (deck.cards && Array.isArray(deck.cards)) {
                        for (const card of deck.cards) {
                            await client.query(
                                'INSERT INTO user_cards (deck_id, front, back, is_favorite, is_forgotten) VALUES ($1, $2, $3, $4, $5)',
                                [newDeckId, card.front || card.word, card.back || card.translation, card.is_favorite || false, card.is_forgotten || false]
                            );
                        }
                    }
                }
            }
            
            await client.query('COMMIT');
            res.json({ message: 'Данные синхронизированы' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Sync save error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Get all decks
app.get('/api/decks', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM user_decks WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ decks: result.rows });
    } catch (error) {
        console.error('Get decks error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Create deck
app.post('/api/decks', authenticateToken, async (req, res) => {
    try {
        const { name, description, source, public_deck_id } = req.body;

        const result = await pool.query(
            'INSERT INTO user_decks (user_id, name, description, source, public_deck_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, name, description || '', source || 'created', public_deck_id || null]
        );

        res.json({ deck: result.rows[0] });
    } catch (error) {
        console.error('Create deck error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Delete deck
app.delete('/api/decks/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM user_decks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ message: 'Колода удалена' });
    } catch (error) {
        console.error('Delete deck error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Update deck
app.put('/api/decks/:id', authenticateToken, async (req, res) => {
    try {
        const { name, description, custom_image } = req.body;
        
        const result = await pool.query(
            'UPDATE user_decks SET name = $1, description = $2, custom_image = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
            [name, description || '', custom_image || null, req.params.id, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Колода не найдена' });
        }
        
        res.json({ deck: result.rows[0] });
    } catch (error) {
        console.error('Update deck error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Upload deck cover image
app.post('/api/decks/:id/image', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const deckCheck = await pool.query('SELECT id FROM user_decks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        if (deckCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Колода не найдена' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Изображение не загружено' });
        }

        const imageUrl = `/api/decks/${req.params.id}/image?t=${Date.now()}`;

        // Save binary data to separate table
        await pool.query(
            `INSERT INTO deck_images (deck_id, image_data, mime_type) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (deck_id) 
             DO UPDATE SET image_data = EXCLUDED.image_data, mime_type = EXCLUDED.mime_type`,
            [req.params.id, req.file.buffer, req.file.mimetype]
        );

        // Update deck custom_image URL
        const result = await pool.query(
            'UPDATE user_decks SET custom_image = $1 WHERE id = $2 RETURNING *',
            [imageUrl, req.params.id]
        );

        res.json({ deck: result.rows[0], imageUrl });
    } catch (error) {
        console.error('Upload image error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Get deck cover image
app.get('/api/decks/:id/image', async (req, res) => {
    try {
        const result = await pool.query('SELECT image_data, mime_type FROM deck_images WHERE deck_id = $1', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Изображение не найдено' });
        }

        const image = result.rows[0];
        res.set('Content-Type', image.mime_type);
        res.send(image.image_data);
    } catch (error) {
        console.error('Get image error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Get cards in deck
app.get('/api/decks/:id/cards', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM user_cards WHERE deck_id = $1 AND deck_id IN (SELECT id FROM user_decks WHERE user_id = $2)',
            [req.params.id, req.user.id]
        );
        res.json({ cards: result.rows });
    } catch (error) {
        console.error('Get cards error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Create card
app.post('/api/decks/:id/cards', authenticateToken, async (req, res) => {
    try {
        const { front, back } = req.body;

        // Verify deck belongs to user
        const deckCheck = await pool.query(
            'SELECT id FROM user_decks WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        
        if (deckCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Колода не найдена' });
        }

        const result = await pool.query(
            'INSERT INTO user_cards (deck_id, front, back) VALUES ($1, $2, $3) RETURNING *',
            [req.params.id, front, back]
        );

        res.json({ card: result.rows[0] });
    } catch (error) {
        console.error('Create card error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Toggle favorite
app.put('/api/cards/:id/favorite', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE user_cards SET is_favorite = NOT is_favorite WHERE id = $1 AND deck_id IN (SELECT id FROM user_decks WHERE user_id = $2) RETURNING *',
            [req.params.id, req.user.id]
        );
        res.json({ card: result.rows[0] });
    } catch (error) {
        console.error('Toggle favorite error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Toggle forgotten (set specific value)
app.put('/api/cards/:id/forgotten', authenticateToken, async (req, res) => {
    try {
        const { is_forgotten } = req.body;
        const boolValue = is_forgotten === true || is_forgotten === 1 || is_forgotten === 'true' || is_forgotten === '1';
        
        console.log('FORGOTTEN ENDPOINT:', { cardId: req.params.id, is_forgotten, boolValue });
        
        const result = await pool.query(
            'UPDATE user_cards SET is_forgotten = $1 WHERE id = $2 AND deck_id IN (SELECT id FROM user_decks WHERE user_id = $3) RETURNING *',
            [boolValue, req.params.id, req.user.id]
        );
        
        console.log('FORGOTTEN RESULT:', result.rows.length);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Карточка не найдена' });
        }
        
        res.json({ card: result.rows[0] });
    } catch (error) {
        console.error('Toggle forgotten error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Update card
app.put('/api/cards/:id', authenticateToken, async (req, res) => {
    try {
        const { front, back, is_forgotten, is_favorite } = req.body;
        
        console.log('UPDATE CARD REQUEST:', { cardId: req.params.id, userId: req.user.id, is_forgotten, is_favorite });
        
        // Build dynamic update query with proper parameter placeholders
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (front !== undefined) {
            updates.push(`front = ${paramIndex}`);
            values.push(front);
            paramIndex++;
        }
        if (back !== undefined) {
            updates.push(`back = ${paramIndex}`);
            values.push(back);
            paramIndex++;
        }
        if (is_forgotten !== undefined) {
            updates.push(`is_forgotten = ${paramIndex}`);
            // Convert to boolean - handles both boolean and integer (0/1)
            values.push(is_forgotten === true || is_forgotten === 1 || is_forgotten === 'true' || is_forgotten === '1');
            paramIndex++;
        }
        if (is_favorite !== undefined) {
            updates.push(`is_favorite = ${paramIndex}`);
            // Convert to boolean - handles both boolean and integer (0/1)
            values.push(is_favorite === true || is_favorite === 1 || is_favorite === 'true' || is_favorite === '1');
            paramIndex++;
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }
        
        values.push(req.params.id);
        values.push(req.user.id);
        
        console.log('UPDATE CARD SQL:', `UPDATE user_cards SET ${updates.join(', ')} WHERE id = $5 AND deck_id IN (SELECT id FROM user_decks WHERE user_id = $6)`);
        console.log('UPDATE CARD VALUES:', values);
        
        const result = await pool.query(
            `UPDATE user_cards SET ${updates.join(', ')} WHERE id = $5 AND deck_id IN (SELECT id FROM user_decks WHERE user_id = $6) RETURNING *`,
            values
        );
        
        console.log('UPDATE CARD RESULT:', result.rows.length, result.rows[0]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Карточка не найдена' });
        }
        
        res.json({ card: result.rows[0] });
    } catch (error) {
        console.error('Update card error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Delete card
app.delete('/api/cards/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM user_cards WHERE id = $1 AND deck_id IN (SELECT id FROM user_decks WHERE user_id = $2)', [req.params.id, req.user.id]);
        res.json({ message: 'Карточка удалена' });
    } catch (error) {
        console.error('Delete card error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ==================== ADMIN ROUTES ====================

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }

        const result = await pool.query(
            'SELECT id, name, username, role, avatar, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ users: result.rows });
    } catch (error) {
        console.error('Admin get users error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Update user role (admin only)
app.put('/api/admin/users/:id/role', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }

        const { role } = req.body;
        const result = await pool.query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, username, role',
            [role, req.params.id]
        );
        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Admin update role error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ==================== PUBLIC DECKS ROUTES (ADMIN) ====================

// Get all public decks
app.get('/api/admin/public-decks', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        
        const result = await pool.query('SELECT * FROM public_decks ORDER BY created_at DESC');
        res.json({ decks: result.rows });
    } catch (error) {
        console.error('Get public decks error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Create public deck
app.post('/api/admin/public-decks', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        
        const { name, description, lang, category } = req.body;
        const categoryValue = category && category.trim() ? category.trim() : '';
        const result = await pool.query(
            'INSERT INTO public_decks (name, description, lang, category) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description, lang || 'Английский', categoryValue]
        );
        res.json({ deck: result.rows[0] });
    } catch (error) {
        console.error('Create public deck error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Update public deck
app.put('/api/admin/public-decks/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        
const { name, description, lang, category, custom_image } = req.body;
        const categoryValue = category && category.trim() ? category.trim() : '';
        const result = await pool.query(
            'UPDATE public_decks SET name = $1, description = $2, lang = $3, category = $4, custom_image = $5 WHERE id = $6 RETURNING *',
            [name, description, lang, categoryValue, custom_image || null, req.params.id]
        );
        res.json({ deck: result.rows[0] });
    } catch (error) {
        console.error('Update public deck error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Upload public deck cover image
app.post('/api/admin/public-decks/:id/image', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }

        const deckCheck = await pool.query('SELECT id FROM public_decks WHERE id = $1', [req.params.id]);
        if (deckCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Колода не найдена' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Изображение не загружено' });
        }

        const imageUrl = `/api/public-decks/${req.params.id}/image?t=${Date.now()}`;

        await pool.query(
            `INSERT INTO public_deck_images (deck_id, image_data, mime_type) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (deck_id) 
             DO UPDATE SET image_data = EXCLUDED.image_data, mime_type = EXCLUDED.mime_type`,
            [req.params.id, req.file.buffer, req.file.mimetype]
        );

        const result = await pool.query(
            'UPDATE public_decks SET custom_image = $1 WHERE id = $2 RETURNING *',
            [imageUrl, req.params.id]
        );

        res.json({ deck: result.rows[0], imageUrl });
    } catch (error) {
        console.error('Upload public image error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Get public deck cover image
app.get('/api/public-decks/:id/image', async (req, res) => {
    try {
        const result = await pool.query('SELECT image_data, mime_type FROM public_deck_images WHERE deck_id = $1', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Изображение не найдено' });
        }

        const image = result.rows[0];
        res.set('Content-Type', image.mime_type);
        res.send(image.image_data);
    } catch (error) {
        console.error('Get public image error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Delete public deck
app.delete('/api/admin/public-decks/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        
        await pool.query('DELETE FROM public_decks WHERE id = $1', [req.params.id]);
        res.json({ message: 'Колода удалена' });
    } catch (error) {
        console.error('Delete public deck error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Get cards in public deck
app.get('/api/admin/public-decks/:id/cards', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        
        const result = await pool.query(
            'SELECT * FROM public_cards WHERE deck_id = $1 ORDER BY created_at DESC',
            [req.params.id]
        );
        res.json({ cards: result.rows });
    } catch (error) {
        console.error('Get public cards error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Create card in public deck
app.post('/api/admin/public-decks/:id/cards', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        
        const { front, back } = req.body;
        const result = await pool.query(
            'INSERT INTO public_cards (deck_id, front, back) VALUES ($1, $2, $3) RETURNING *',
            [req.params.id, front, back]
        );
        res.json({ card: result.rows[0] });
    } catch (error) {
        console.error('Create public card error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Delete public card
app.delete('/api/admin/public-cards/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        
        await pool.query('DELETE FROM public_cards WHERE id = $1', [req.params.id]);
        res.json({ message: 'Карточка удалена' });
    } catch (error) {
        console.error('Delete public card error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Get public decks (for all users)
app.get('/api/public-decks', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT pd.*, 
                   COUNT(pc.id) as cards_count 
            FROM public_decks pd 
            LEFT JOIN public_cards pc ON pd.id = pc.deck_id 
            GROUP BY pd.id 
            ORDER BY pd.created_at DESC
        `);
        res.json({ decks: result.rows });
    } catch (error) {
        console.error('Get public decks error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Get cards in public deck (for all users)
app.get('/api/public-decks/:id/cards', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM public_cards WHERE deck_id = $1',
            [req.params.id]
        );
        res.json({ cards: result.rows });
    } catch (error) {
        console.error('Get public cards error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});



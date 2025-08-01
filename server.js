const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const { neon } = require('@neondatabase/serverless');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL);

// Create table if it doesn't exist
async function initializeDatabase() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS travel_log (
                id SERIAL PRIMARY KEY,
                path VARCHAR(500) NOT NULL,
                user_agent TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_address VARCHAR(45),
                referrer VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        console.log('Database table initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Initialize database on startup
initializeDatabase();

// Middleware to log page visits
app.use(async (req, res, next) => {
    // Skip logging for API endpoints and static assets
    if (req.path.startsWith('/api/') || req.path.includes('.')) {
        return next();
    }

    try {
        const userAgent = req.get('User-Agent');
        const userAddress = req.ip || req.connection.remoteAddress;
        const referrer = req.get('Referrer');

        await sql`
            INSERT INTO travel_log (path, user_agent, user_address, referrer)
            VALUES (${req.path}, ${userAgent}, ${userAddress}, ${referrer})
        `;
        
        console.log(`Logged visit: ${req.path} from ${userAddress}`);
    } catch (error) {
        console.error('Error logging page visit:', error);
    }

    next();
});

// API endpoint to get visit statistics
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await sql`
            SELECT 
                path,
                COUNT(*) as visits,
                MAX(timestamp) as last_visit
            FROM travel_log 
            GROUP BY path 
            ORDER BY visits DESC
        `;
        
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});

// API endpoint to get recent visits
app.get('/api/recent-visits', async (req, res) => {
    try {
        const visits = await sql`
            SELECT 
                path,
                user_agent,
                timestamp,
                user_address,
                referrer
            FROM travel_log 
            ORDER BY timestamp DESC 
            LIMIT 50
        `;
        
        res.json({ success: true, data: visits });
    } catch (error) {
        console.error('Error fetching recent visits:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch recent visits' });
    }
});

// Serve the main HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/blog', (req, res) => {
    res.sendFile(path.join(__dirname, 'blog.html'));
});

// Catch-all route for other pages
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('URL logging is active!');
}); 
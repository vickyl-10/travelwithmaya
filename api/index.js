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

// Validate environment variables
if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set!');
    console.error('Please set DATABASE_URL in your Vercel environment variables.');
}

// Initialize Neon database connection with better error handling
let sql;
try {
    sql = neon(process.env.DATABASE_URL);
    console.log('Neon database connection initialized');
} catch (error) {
    console.error('Failed to initialize Neon database connection:', error);
}

// Create table if it doesn't exist
async function initializeDatabase() {
    if (!sql) {
        console.error('Cannot initialize database - no SQL connection');
        return;
    }
    
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

// Middleware to log page visits with better error handling
app.use(async (req, res, next) => {
    // Skip logging for API endpoints and static assets
    if (req.path.startsWith('/api/') || req.path.includes('.')) {
        return next();
    }

    // Only log if we have a database connection
    if (!sql) {
        console.warn('Skipping visit logging - no database connection');
        return next();
    }

    try {
        const userAgent = req.get('User-Agent') || 'Unknown';
        const userAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const referrer = req.get('Referrer') || 'Direct';

        await sql`
            INSERT INTO travel_log (path, user_agent, user_address, referrer)
            VALUES (${req.path}, ${userAgent}, ${userAddress}, ${referrer})
        `;
        
        console.log(`Logged visit: ${req.path} from ${userAddress}`);
    } catch (error) {
        console.error('Error logging page visit:', error);
        // Don't block the request if logging fails
    }

    next();
});

// API endpoint to get visit statistics
app.get('/api/stats', async (req, res) => {
    if (!sql) {
        return res.status(500).json({ success: false, error: 'Database connection not available' });
    }
    
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
    if (!sql) {
        return res.status(500).json({ success: false, error: 'Database connection not available' });
    }
    
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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        database: sql ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
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
    console.log(`Database connection: ${sql ? 'Available' : 'Not available'}`);
}); 
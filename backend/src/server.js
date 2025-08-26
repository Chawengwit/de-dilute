import dotenv from 'dotenv';
import app from './app.js';
import pool from './db.js'; // PostgreSQL connection pool

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Test database connection
        await pool.query('SELECT NOW()');
        console.log('Database connected successfully.');

        // Start the server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode.`);
        });
    } catch (error) {
        console.error('Failed to connect to the database:', error);
        process.exit(1); // Exit with failure
    }
}

startServer();
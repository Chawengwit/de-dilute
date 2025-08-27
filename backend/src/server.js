import { fileURLToPath } from 'url';
import path, { join } from 'path';
import dotenv from 'dotenv';
import app from './app.js';
import pool from './db.js'; // PostgreSQL connection pool

const envPath = `../.env.${process.env.NODE_ENV}`;
console.log('Loading environment variables from:', envPath);

// Load environment variables dynamically based on NODE_ENV
dotenv.config({ path: envPath });

const PORT = process.env.PORT || 3000;

// TODO FOR TESTING PURPOSES ONLY
// Start server without waiting for DB connection
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode.`);
});

// TODO NEXT CREATE A PROPER STARTUP SEQUENCE
// Start server after ensuring DB connection
// async function startServer() {
//     try {
//         // Test database connection
//         await pool.query('SELECT NOW()');
//         console.log('Database connected successfully.');

//         // Start the server
//         app.listen(PORT, () => {
//             console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode.`);
//         });
//     } catch (error) {
//         console.error('Failed to connect to the database:', error);
//         process.exit(1); // Exit with failure
//     }
// }

// startServer();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import API routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import mediaRoutes from './routes/media.js';

// Load environment variables
dotenv.config();

const app = express();

// ---------------- Middleware ---------------- //
// CORS
const corsOptions =
  process.env.NODE_ENV === 'production'
    ? {
        origin: process.env.FRONTEND_URL,
        credentials: false, // we use JWT, no cookies
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      }
    : {
        origin: 'http://localhost:8080', // frontend dev server
        credentials: false,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      };

app.use(cors(corsOptions));

// Parse JSON & form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security & performance
app.use(helmet());        // secure HTTP headers
app.use(compression());   // gzip/deflate responses

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));       // concise logs in dev
} else {
  app.use(morgan('combined'));  // Apache-style logs in prod
}

// ---------------- Routes ---------------- //

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/media', mediaRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    env: process.env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ---------------- Error Handling ---------------- //
// Favicon request handler to avoid unnecessary 404 logs
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Catch-all for undefined API routes
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;

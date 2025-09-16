import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import webhookRoutes from './routes/webhookRoutes.js';

const app = express();

// Config
const PORT = process.env.SERVER_PORT || 3001;

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true
}));                          // allow cross-origin during dev
app.use(express.json({ limit: '1mb' }));  // parse JSON
app.use(morgan('dev'));                   // request logs

// Basic health route (for testing the connection)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Mount webhook routes
app.use('/api', webhookRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

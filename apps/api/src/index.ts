import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { appsRouter } from './routes/apps';
import { buildsRouter } from './routes/builds';
import { webhooksRouter } from './routes/webhooks';
import { errorHandler } from './middleware/errorHandler';
import { startBuildWorker } from './workers/buildWorker';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Pour les icônes base64
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/apps', appsRouter);
app.use('/api/builds', buildsRouter);
app.use('/api/webhooks', webhooksRouter);

// Error handler (must be last)
app.use(errorHandler);

// Start server and worker
async function start() {
  try {
    // Start the build worker
    await startBuildWorker();
    console.log('Build worker started');

    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

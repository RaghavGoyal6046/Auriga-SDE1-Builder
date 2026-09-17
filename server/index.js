import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';

import authRoutes from './routes/auth.js';
import medicinesRoutes from './routes/medicines.js';
import batchesRoutes from './routes/batches.js';
import dispenseRoutes from './routes/dispense.js';
import alertsRoutes from './routes/alerts.js';
import dashboardRoutes from './routes/dashboard.js';
import clockRoutes from './routes/clock.js';
import outboxRoutes from './routes/outbox.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicinesRoutes);
app.use('/api/batches', batchesRoutes);
app.use('/api/dispense', dispenseRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Competition Evaluation Twist Routes (Mounted at both /api and root paths)
app.use('/api/clock', clockRoutes);
app.use('/clock', clockRoutes);

app.use('/api/outbox', outboxRoutes);
app.use('/outbox', outboxRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', service: 'PharmaExpiry API', timestamp: new Date().toISOString() });
});

// Serve frontend dist in production if present
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Resource not found');
    }
  });
});

// Initialize DB and start server
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 PharmaExpiry Backend API running on port ${PORT}`);
      console.log(`   Health Check: http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
}

startServer();

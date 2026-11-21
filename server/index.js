import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase, getDatabaseType } from './db/database.js';

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
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
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from public/
const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/medicines', medicinesRoutes);
app.use('/api/batches', batchesRoutes);
app.use('/api/dispense', dispenseRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Automation & Evaluation Routes (Mounted at both /api and root paths)
app.use('/api/clock', clockRoutes);
app.use('/clock', clockRoutes);

app.use('/api/outbox', outboxRoutes);
app.use('/outbox', outboxRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'PharmaExpiry API',
    database: getDatabaseType(),
    timestamp: new Date().toISOString()
  });
});

// HTML Page Route Handlers
app.get('/', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(publicPath, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(publicPath, 'register.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(publicPath, 'dashboard.html')));
app.get('/inventory', (req, res) => res.sendFile(path.join(publicPath, 'inventory.html')));
app.get('/batches', (req, res) => res.sendFile(path.join(publicPath, 'batches.html')));
app.get('/dispense', (req, res) => res.sendFile(path.join(publicPath, 'dispense.html')));
app.get('/alerts', (req, res) => res.sendFile(path.join(publicPath, 'alerts.html')));
app.get('/staff', (req, res) => res.sendFile(path.join(publicPath, 'staff.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(publicPath, 'staff.html')));

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Catch-all fallback to index.html for page routing
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Initialize DB and start server
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 PharmaExpiry (Node.js + Express + MySQL) Running on port ${PORT}`);
      console.log(`   Web Interface: http://localhost:${PORT}`);
      console.log(`   Health Check:  http://localhost:${PORT}/api/health`);
      console.log(`   Database Mode: ${getDatabaseType()}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
}

startServer();

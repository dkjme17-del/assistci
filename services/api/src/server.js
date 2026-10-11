const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { pool } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const requestRoutes = require('./routes/requestRoutes');
const kycRoutes = require('./routes/kycRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globaux
app.use(cors());
app.use(express.json());

// Logging basique des requêtes entrantes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Route de santé (Health check)
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const dbTest = await pool.query('SELECT 1 AS alive');
    if (dbTest.rows[0]?.alive === 1) {
      dbStatus = 'connected';
    }
  } catch (err) {
    dbStatus = `offline (${err.message})`;
  }

  res.json({
    status: 'ok',
    service: 'assistci-api',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Montage des routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);

// Gestion des routes inexistantes (404)
app.use((req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl,
  });
});

// Middleware global de traitement d'erreurs
app.use((err, req, res, next) => {
  console.error('Erreur non interceptée:', err);
  res.status(err.status || 500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'production' ? 'Une erreur est survenue' : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur API ASSISTCI en écoute sur http://localhost:${PORT}`);
  console.log(`📡 Healthcheck : http://localhost:${PORT}/api/health`);
});

module.exports = app;

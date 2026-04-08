'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (Postman, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Fichiers statiques (media) ───────────────────────────────────────────────
app.use('/media', express.static(path.join(__dirname, 'media')));

// ─── Documentation API (Swagger UI — équivalent /api/docs/ Django) ────────────
const swaggerSpec = require('./src/config/swagger');
app.get('/api/schema/', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});
app.use('/api/docs/', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Neurovent API Docs',
  customCss: '.swagger-ui .topbar { background-color: #0d0d12; }',
}));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/events', require('./src/routes/events'));
app.use('/api/registrations', require('./src/routes/registrations'));
app.use('/api/tags', require('./src/routes/tags'));
app.use('/api/companies', require('./src/routes/companies'));

// ─── Route de santé ───────────────────────────────────────────────────────────
app.get('/api/health/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Neurovent Node.js API is running',
    version: '1.0.0',
  });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable.` });
});

// ─── Error handler global ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('Not allowed by CORS')) {
    return res.status(403).json({ error: 'CORS: origine non autorisée.' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Fichier trop volumineux.' });
  }
  if (err.message && (err.message.includes('Seules les images') || err.message.includes('Seuls les fichiers'))) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

module.exports = app;

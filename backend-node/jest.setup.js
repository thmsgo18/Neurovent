'use strict';

// Ces variables doivent être définies AVANT tout require() de modules de l'app.
// setupFiles s'exécute dans le worker Jest avant le chargement des modules de test.

process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';
process.env.JWT_SECRET = 'test-secret-neurovent-jest-2026';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-neurovent-jest-2026';
process.env.EMAIL_FROM = 'test@neurovent.test';
process.env.FRONTEND_URL = 'http://localhost:5173';

'use strict';

/**
 * helpers.js — Utilitaires partagés entre tous les fichiers de test.
 *
 * Équivalent des fonctions create_participant / create_company / create_admin
 * présentes dans chaque fichier de test Django.
 */

const jwt = require('jsonwebtoken');
const { User, Event, Registration, Tag, sequelize } = require('../src/models');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-neurovent-jest-2026';

// ─── Sync DB ─────────────────────────────────────────────────────────────────

/**
 * Recrée toutes les tables (équivalent de TestCase setUp Django).
 * À appeler dans beforeAll() de chaque fichier de test.
 */
async function syncDB() {
  await sequelize.sync({ force: true });
}

// ─── Création d'utilisateurs ─────────────────────────────────────────────────

async function createParticipant({
  email = 'alice@test.com',
  password = 'Test1234!',
  firstName = 'Alice',
  lastName = 'Dupont',
} = {}) {
  return User.create({
    role: 'PARTICIPANT',
    email,
    password,
    first_name: firstName,
    last_name: lastName,
    is_active: true,
  });
}

async function createCompany({
  identifier = 'braincorp',
  password = 'Test1234!',
  companyName = 'BrainCorp',
  verificationStatus = 'VERIFIED',
} = {}) {
  return User.create({
    role: 'COMPANY',
    company_identifier: identifier,
    password,
    company_name: companyName,
    recovery_email: `contact@${identifier}.com`,
    verification_status: verificationStatus,
    is_active: true,
  });
}

async function createAdmin({
  email = 'admin@neurovent.com',
  password = 'Admin1234!',
} = {}) {
  return User.create({
    role: 'ADMIN',
    email,
    password,
    first_name: 'Admin',
    last_name: 'Neurovent',
    is_active: true,
    is_staff: true,
  });
}

// ─── Auth token ──────────────────────────────────────────────────────────────

/**
 * Génère un JWT valide pour un utilisateur — sans passer par l'API login.
 * Équivalent de client.force_authenticate(user=...) en Django REST Framework.
 */
function generateToken(user) {
  return jwt.sign({ user_id: user.id }, JWT_SECRET, { expiresIn: '2h' });
}

/**
 * Retourne l'objet headers Authorization pour supertest.
 * Usage : request(app).get('/api/...').set(authHeader(user))
 */
function authHeader(user) {
  return { Authorization: `Bearer ${generateToken(user)}` };
}

// ─── Création d'événements ───────────────────────────────────────────────────

async function createEvent(company, {
  title = 'Conférence ML',
  daysFromNow = 10,
  status = 'PUBLISHED',
  capacity = 50,
  registrationMode = 'AUTO',
  format = 'ONSITE',
  unlimitedCapacity = false,
} = {}) {
  const now = new Date();
  const dateStart = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
  const dateEnd = new Date(dateStart.getTime() + 4 * 60 * 60 * 1000);

  return Event.create({
    company_id: company.id,
    title,
    description: 'Description de test',
    date_start: dateStart,
    date_end: dateEnd,
    capacity: unlimitedCapacity ? null : capacity,
    unlimited_capacity: unlimitedCapacity,
    status,
    format,
    registration_mode: registrationMode,
    address_full: '1 rue de la Science, 75001 Paris',
    address_city: 'Paris',
    address_country: 'France',
  });
}

// ─── Création de tag ─────────────────────────────────────────────────────────

async function createTag(name) {
  return Tag.create({ name });
}

module.exports = {
  syncDB,
  createParticipant,
  createCompany,
  createAdmin,
  generateToken,
  authHeader,
  createEvent,
  createTag,
};

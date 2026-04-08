'use strict';

/**
 * Tests — Auth
 * Couvre : inscription, login, profil, mot de passe, suppression RGPD, admin
 * Équivalent de backend-django/users/tests.py
 */

const request = require('supertest');
const app = require('../app');
const { User } = require('../src/models');
const { syncDB, createParticipant, createCompany, createAdmin, authHeader } = require('./helpers');

// Désactiver les emails réels pendant les tests
jest.mock('../src/services/emailService', () => ({
  sendRegistrationConfirmed: jest.fn(),
  sendRegistrationPending: jest.fn(),
  sendRegistrationWaitlist: jest.fn(),
  sendRegistrationRejected: jest.fn(),
  sendRegistrationRemovedByOrganizer: jest.fn(),
  sendEventCancelled: jest.fn(),
  sendPasswordReset: jest.fn(),
  sendCompanyVerificationResult: jest.fn(),
  sendEventReminder: jest.fn(),
  sendEventAccessRevealed: jest.fn(),
  sendEventOrganizerDigest: jest.fn(),
  sendEventCapacityAlert: jest.fn(),
  sendEventUpdated: jest.fn(),
}));

// Désactiver les appels SIRENE réels
jest.mock('../src/services/sireneService', () => ({
  verifySiret: jest.fn().mockResolvedValue({ status: 'NEEDS_REVIEW', officialName: '' }),
}));

beforeAll(async () => {
  await syncDB();
});

// ─── INSCRIPTION PARTICIPANT ──────────────────────────────────────────────────

describe('Inscription Participant', () => {
  test('inscription réussie → 201 + user créé', async () => {
    const res = await request(app)
      .post('/api/auth/register/participant/')
      .send({
        email: 'bob@test.com',
        password: 'Test1234!',
        password_confirm: 'Test1234!',
        first_name: 'Bob',
        last_name: 'Martin',
      });
    expect(res.status).toBe(201);
    const user = await User.findOne({ where: { email: 'bob@test.com' } });
    expect(user).not.toBeNull();
  });

  test('email dupliqué → 400', async () => {
    await createParticipant({ email: 'alice@test.com' });
    const res = await request(app)
      .post('/api/auth/register/participant/')
      .send({
        email: 'alice@test.com',
        password: 'Test1234!',
        password_confirm: 'Test1234!',
        first_name: 'Alice2',
        last_name: 'Dupont',
      });
    expect(res.status).toBe(400);
  });

  test('mots de passe différents → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register/participant/')
      .send({
        email: 'new@test.com',
        password: 'Test1234!',
        password_confirm: 'Autre1234!',
        first_name: 'New',
        last_name: 'User',
      });
    expect(res.status).toBe(400);
  });
});

// ─── INSCRIPTION COMPANY ──────────────────────────────────────────────────────

describe('Inscription Company', () => {
  test('inscription réussie → 201 + statut de vérification valide', async () => {
    const res = await request(app)
      .post('/api/auth/register/company/')
      .send({
        company_identifier: 'neuro-lab',
        password: 'Test1234!',
        password_confirm: 'Test1234!',
        company_name: 'NeuroLab',
        recovery_email: 'contact@neurolab.com',
        siret: '73282932000074',
        legal_representative: 'Jean Dupont',
      });
    expect(res.status).toBe(201);
    const company = await User.findOne({ where: { company_identifier: 'neuro-lab' } });
    expect(['VERIFIED', 'NEEDS_REVIEW', 'REJECTED']).toContain(company.verification_status);
  });

  test('identifier avec caractères spéciaux → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register/company/')
      .send({
        company_identifier: 'neuro lab!',
        password: 'Test1234!',
        password_confirm: 'Test1234!',
        company_name: 'NeuroLab',
        recovery_email: 'contact@neurolab.com',
      });
    expect(res.status).toBe(400);
  });

  test('identifier trop court → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register/company/')
      .send({
        company_identifier: 'ab',
        password: 'Test1234!',
        password_confirm: 'Test1234!',
        company_name: 'AB',
        recovery_email: 'contact@ab.com',
      });
    expect(res.status).toBe(400);
  });
});

// ─── LOGIN PARTICIPANT ────────────────────────────────────────────────────────

describe('Login Participant', () => {
  beforeEach(async () => {
    await syncDB();
    await createParticipant({ email: 'alice@test.com', password: 'Test1234!' });
  });

  test('login réussi → 200 + access + refresh', async () => {
    const res = await request(app)
      .post('/api/auth/login/participant/')
      .send({ email: 'alice@test.com', password: 'Test1234!' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access');
    expect(res.body).toHaveProperty('refresh');
  });

  test('mauvais mot de passe → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login/participant/')
      .send({ email: 'alice@test.com', password: 'Wrong!' });
    expect(res.status).toBe(401);
  });

  test('email inconnu → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login/participant/')
      .send({ email: 'unknown@test.com', password: 'Test1234!' });
    expect(res.status).toBe(401);
  });

  test('le token JWT contient le rôle PARTICIPANT', async () => {
    const res = await request(app)
      .post('/api/auth/login/participant/')
      .send({ email: 'alice@test.com', password: 'Test1234!' });
    const payload = JSON.parse(
      Buffer.from(res.body.access.split('.')[1], 'base64').toString()
    );
    expect(payload.role).toBe('PARTICIPANT');
  });
});

// ─── LOGIN COMPANY ────────────────────────────────────────────────────────────

describe('Login Company', () => {
  beforeEach(async () => {
    await syncDB();
    await createCompany({ identifier: 'braincorp', password: 'Test1234!' });
  });

  test('login réussi → 200 + access', async () => {
    const res = await request(app)
      .post('/api/auth/login/company/')
      .send({ identifier: 'braincorp', password: 'Test1234!' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access');
  });

  test('mauvais mot de passe → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login/company/')
      .send({ identifier: 'braincorp', password: 'Wrong!' });
    expect(res.status).toBe(400);
  });

  test('identifier inconnu → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login/company/')
      .send({ identifier: 'unknown', password: 'Test1234!' });
    expect(res.status).toBe(400);
  });
});

// ─── PROFIL ───────────────────────────────────────────────────────────────────

describe('Profil', () => {
  let user;

  beforeEach(async () => {
    await syncDB();
    user = await createParticipant({ email: 'alice@test.com' });
  });

  test('GET /me/ → 200 + email + role', async () => {
    const res = await request(app)
      .get('/api/auth/me/')
      .set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('alice@test.com');
    expect(res.body.role).toBe('PARTICIPANT');
  });

  test('PATCH /me/ → mise à jour employer_name', async () => {
    const res = await request(app)
      .patch('/api/auth/me/')
      .set(authHeader(user))
      .send({ employer_name: 'Sorbonne' });
    expect(res.status).toBe(200);
    await user.reload();
    expect(user.employer_name).toBe('Sorbonne');
  });

  test('PATCH /me/ → mise à jour profil étendu participant', async () => {
    const res = await request(app)
      .patch('/api/auth/me/')
      .set(authHeader(user))
      .send({
        participant_profile_type: 'PROFESSIONAL',
        professional_company_name: 'OpenAI',
        job_title: 'Research Engineer',
        favorite_domain: 'Neuroscience',
        personal_website_url: 'https://alice.dev',
      });
    expect(res.status).toBe(200);
    await user.reload();
    expect(user.participant_profile_type).toBe('PROFESSIONAL');
    expect(user.favorite_domain).toBe('Neuroscience');
  });

  test('GET /me/ sans auth → 401', async () => {
    const res = await request(app).get('/api/auth/me/');
    expect(res.status).toBe(401);
  });
});

// ─── RECHERCHE COMPANY PUBLIQUE ───────────────────────────────────────────────

describe('Recherche Company publique', () => {
  beforeEach(async () => {
    await syncDB();
    const company = await createCompany({ identifier: 'atlas', companyName: 'Atlas Neuro Labs' });
    company.company_description = 'Clinical neurotechnology and translational research events.';
    await company.save();
  });

  test('recherche par nom → retourne la company', async () => {
    const res = await request(app).get('/api/companies/?search=Atlas');
    expect(res.status).toBe(200);
    const names = res.body.results.map(c => c.company_name);
    expect(names).toContain('Atlas Neuro Labs');
  });
});

// ─── CHANGEMENT DE MOT DE PASSE ──────────────────────────────────────────────

describe('Changement de mot de passe', () => {
  let user;

  beforeEach(async () => {
    await syncDB();
    user = await createParticipant({ email: 'alice@test.com', password: 'Test1234!' });
  });

  test('changement réussi → 200 + nouveau mdp valide', async () => {
    const res = await request(app)
      .patch('/api/auth/me/password/')
      .set(authHeader(user))
      .send({
        current_password: 'Test1234!',
        new_password: 'Nouveau2026!',
        new_password_confirm: 'Nouveau2026!',
      });
    expect(res.status).toBe(200);
    await user.reload();
    const valid = await user.checkPassword('Nouveau2026!');
    expect(valid).toBe(true);
  });

  test('mauvais mdp actuel → 400', async () => {
    const res = await request(app)
      .patch('/api/auth/me/password/')
      .set(authHeader(user))
      .send({
        current_password: 'WrongPass!',
        new_password: 'Nouveau2026!',
        new_password_confirm: 'Nouveau2026!',
      });
    expect(res.status).toBe(400);
  });

  test('confirmation différente → 400', async () => {
    const res = await request(app)
      .patch('/api/auth/me/password/')
      .set(authHeader(user))
      .send({
        current_password: 'Test1234!',
        new_password: 'Nouveau2026!',
        new_password_confirm: 'Autre2026!',
      });
    expect(res.status).toBe(400);
  });
});

// ─── SUPPRESSION RGPD ────────────────────────────────────────────────────────

describe('Suppression RGPD', () => {
  let user;

  beforeEach(async () => {
    await syncDB();
    user = await createParticipant({ email: 'alice@test.com', password: 'Test1234!' });
  });

  test('DELETE /me/ → anonymise les données', async () => {
    const res = await request(app)
      .delete('/api/auth/me/')
      .set(authHeader(user));
    expect(res.status).toBe(200);
    await user.reload();
    expect(user.is_active).toBe(false);
    expect(user.email).toContain('deleted');
    expect(user.first_name).toBe('[Supprimé]');
  });

  test('compte supprimé → login impossible', async () => {
    await request(app)
      .delete('/api/auth/me/')
      .set(authHeader(user));
    const res = await request(app)
      .post('/api/auth/login/participant/')
      .send({ email: 'alice@test.com', password: 'Test1234!' });
    expect(res.status).toBe(401);
  });
});

// ─── ADMIN — GESTION UTILISATEURS ────────────────────────────────────────────

describe('Admin — Gestion utilisateurs', () => {
  let admin, participant, company;

  beforeEach(async () => {
    await syncDB();
    admin = await createAdmin();
    participant = await createParticipant({ email: 'alice@test.com' });
    company = await createCompany();
  });

  test('liste des utilisateurs → 200 + count >= 2', async () => {
    const res = await request(app)
      .get('/api/auth/admin/users/')
      .set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
  });

  test('filtre par rôle PARTICIPANT → que des PARTICIPANT', async () => {
    const res = await request(app)
      .get('/api/auth/admin/users/?role=PARTICIPANT')
      .set(authHeader(admin));
    expect(res.status).toBe(200);
    for (const u of res.body.results) {
      expect(u.role).toBe('PARTICIPANT');
    }
  });

  test('détail utilisateur → 200 + bon rôle', async () => {
    const res = await request(app)
      .get(`/api/auth/admin/users/${participant.id}/`)
      .set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('PARTICIPANT');
  });

  test('liste companies admin → 200 + count >= 1', async () => {
    const res = await request(app)
      .get('/api/auth/admin/companies/')
      .set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });

  test('stats admin → contient company_verification', async () => {
    const res = await request(app)
      .get('/api/auth/admin/stats/')
      .set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveProperty('company_verification');
  });

  test('participant ne peut pas accéder → 403', async () => {
    const res = await request(app)
      .get('/api/auth/admin/users/')
      .set(authHeader(participant));
    expect(res.status).toBe(403);
  });

  test('suspendre un utilisateur → is_active = false', async () => {
    const res = await request(app)
      .patch(`/api/auth/admin/users/${participant.id}/suspend/`)
      .set(authHeader(admin));
    expect(res.status).toBe(200);
    await participant.reload();
    expect(participant.is_active).toBe(false);
  });

  test('réactiver un utilisateur → is_active = true', async () => {
    participant.is_active = false;
    await participant.save();
    const res = await request(app)
      .patch(`/api/auth/admin/users/${participant.id}/activate/`)
      .set(authHeader(admin));
    expect(res.status).toBe(200);
    await participant.reload();
    expect(participant.is_active).toBe(true);
  });

  test('supprimer un utilisateur → anonymisé', async () => {
    const res = await request(app)
      .delete(`/api/auth/admin/users/${participant.id}/delete/`)
      .set(authHeader(admin));
    expect(res.status).toBe(200);
    await participant.reload();
    expect(participant.is_active).toBe(false);
  });

  test('supprimer un admin → 403', async () => {
    const otherAdmin = await createAdmin({ email: 'other@test.com' });
    const res = await request(app)
      .delete(`/api/auth/admin/users/${otherAdmin.id}/delete/`)
      .set(authHeader(admin));
    expect(res.status).toBe(403);
  });
});

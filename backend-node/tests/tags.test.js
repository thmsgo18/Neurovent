'use strict';

/**
 * Tests — Tags
 * Couvre : liste publique, création admin, suppression admin, permissions
 * Équivalent de backend-django/tags/tests.py
 */

const request = require('supertest');
const app = require('../app');
const { Tag } = require('../src/models');
const { syncDB, createParticipant, createAdmin, authHeader } = require('./helpers');

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

beforeAll(async () => {
  await syncDB();
});

// ─── LISTE ────────────────────────────────────────────────────────────────────

describe('Liste des tags', () => {
  beforeEach(async () => {
    await syncDB();
    await Tag.create({ name: 'Machine Learning' });
    await Tag.create({ name: 'Neurosciences' });
  });

  test('liste publique → 200 + 2 résultats', async () => {
    const res = await request(app).get('/api/tags/');
    expect(res.status).toBe(200);
    const results = res.body.results || res.body;
    expect(results.length).toBe(2);
  });

  test('chaque tag a id et name', async () => {
    const res = await request(app).get('/api/tags/');
    const results = res.body.results || res.body;
    expect(results[0]).toHaveProperty('id');
    expect(results[0]).toHaveProperty('name');
  });

  test('tags triés alphabétiquement', async () => {
    const res = await request(app).get('/api/tags/');
    const results = res.body.results || res.body;
    const names = results.map(t => t.name);
    expect(names).toEqual([...names].sort());
  });
});

// ─── CRÉATION ────────────────────────────────────────────────────────────────

describe('Création de tag', () => {
  let admin, participant;

  beforeEach(async () => {
    await syncDB();
    admin = await createAdmin();
    participant = await createParticipant();
  });

  test('admin peut créer un tag → 201 + tag en base', async () => {
    const res = await request(app)
      .post('/api/tags/create/')
      .set(authHeader(admin))
      .send({ name: 'IA Générative' });
    expect(res.status).toBe(201);
    const tag = await Tag.findOne({ where: { name: 'IA Générative' } });
    expect(tag).not.toBeNull();
  });

  test('participant ne peut pas créer → 403', async () => {
    const res = await request(app)
      .post('/api/tags/create/')
      .set(authHeader(participant))
      .send({ name: 'Mon Tag' });
    expect(res.status).toBe(403);
  });

  test('anonyme ne peut pas créer → 401', async () => {
    const res = await request(app)
      .post('/api/tags/create/')
      .send({ name: 'Mon Tag' });
    expect(res.status).toBe(401);
  });

  test('tag dupliqué → 400', async () => {
    await Tag.create({ name: 'Robotique' });
    const res = await request(app)
      .post('/api/tags/create/')
      .set(authHeader(admin))
      .send({ name: 'Robotique' });
    expect(res.status).toBe(400);
  });
});

// ─── SUPPRESSION ─────────────────────────────────────────────────────────────

describe('Suppression de tag', () => {
  let admin, participant, tag;

  beforeEach(async () => {
    await syncDB();
    admin = await createAdmin();
    participant = await createParticipant();
    tag = await Tag.create({ name: 'À supprimer' });
  });

  test('admin peut supprimer un tag → 204 + tag absent de la base', async () => {
    const res = await request(app)
      .delete(`/api/tags/${tag.id}/delete/`)
      .set(authHeader(admin));
    expect(res.status).toBe(204);
    const deleted = await Tag.findByPk(tag.id);
    expect(deleted).toBeNull();
  });

  test('participant ne peut pas supprimer → 403', async () => {
    const res = await request(app)
      .delete(`/api/tags/${tag.id}/delete/`)
      .set(authHeader(participant));
    expect(res.status).toBe(403);
    const still = await Tag.findByPk(tag.id);
    expect(still).not.toBeNull();
  });

  test('anonyme ne peut pas supprimer → 401', async () => {
    const res = await request(app)
      .delete(`/api/tags/${tag.id}/delete/`);
    expect(res.status).toBe(401);
  });
});

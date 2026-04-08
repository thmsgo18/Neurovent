'use strict';

/**
 * Tests — Events
 * Couvre : liste publique, CRUD, filtres, stats, recommandations, dashboard
 * Équivalent de backend-django/events/tests.py
 */

const request = require('supertest');
const app = require('../app');
const { Event, Registration } = require('../src/models');
const {
  syncDB, createParticipant, createCompany, createAdmin,
  authHeader, createEvent, createTag,
} = require('./helpers');

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

// ─── LISTE PUBLIQUE ───────────────────────────────────────────────────────────

describe('Liste publique des événements', () => {
  let company;

  beforeEach(async () => {
    await syncDB();
    company = await createCompany();
    await createEvent(company, { title: 'Event Publié 1' });
    await createEvent(company, { title: 'Event Publié 2', format: 'ONLINE' });
    await createEvent(company, { title: 'Brouillon', status: 'DRAFT' });
    await createEvent(company, { title: 'Event Passé', daysFromNow: -2 });
  });

  test('visiteur anonyme ne voit que les PUBLISHED', async () => {
    const res = await request(app).get('/api/events/');
    expect(res.status).toBe(200);
    const titles = res.body.results.map(e => e.title);
    expect(titles).toContain('Event Publié 1');
    expect(titles).toContain('Event Publié 2');
    expect(titles).not.toContain('Brouillon');
  });

  test('liste exclut les événements passés', async () => {
    const res = await request(app).get('/api/events/');
    expect(res.status).toBe(200);
    const titles = res.body.results.map(e => e.title);
    expect(titles).not.toContain('Event Passé');
  });

  test('réponse paginée (count + results + next + previous)', async () => {
    const res = await request(app).get('/api/events/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
    expect(res.body).toHaveProperty('results');
    expect(res.body).toHaveProperty('next');
    expect(res.body).toHaveProperty('previous');
  });

  test('filtre ?format=ONLINE → que des events ONLINE', async () => {
    const res = await request(app).get('/api/events/?format=ONLINE');
    expect(res.status).toBe(200);
    for (const e of res.body.results) {
      expect(e.format).toBe('ONLINE');
    }
  });

  test('filtre ?search= recherche dans le titre', async () => {
    const res = await request(app).get('/api/events/?search=Publié 1');
    expect(res.status).toBe(200);
    const titles = res.body.results.map(e => e.title);
    expect(titles).toContain('Event Publié 1');
    expect(titles).not.toContain('Event Publié 2');
  });

  test('recherche partielle dans le titre', async () => {
    await createEvent(company, { title: 'Clinical NeuroAI Summit' });
    const res = await request(app).get('/api/events/?search=clini');
    expect(res.status).toBe(200);
    const titles = res.body.results.map(e => e.title);
    expect(titles).toContain('Clinical NeuroAI Summit');
  });

  test('admin peut filtrer par ?status=DRAFT', async () => {
    const admin = await createAdmin();
    const res = await request(app)
      .get('/api/events/?status=DRAFT')
      .set(authHeader(admin));
    expect(res.status).toBe(200);
    const titles = res.body.results.map(e => e.title);
    expect(titles).toContain('Brouillon');
  });

  test('participant avec ?status=DRAFT ne voit pas les DRAFT', async () => {
    const participant = await createParticipant();
    const res = await request(app)
      .get('/api/events/?status=DRAFT')
      .set(authHeader(participant));
    expect(res.status).toBe(200);
    const titles = res.body.results.map(e => e.title);
    expect(titles).not.toContain('Brouillon');
  });
});

// ─── CRUD EVENTS ─────────────────────────────────────────────────────────────

describe('CRUD Events', () => {
  let company, otherCompany, participant, admin;

  const eventPayload = (title = 'Test Event') => ({
    title,
    description: 'Une conférence de test',
    date_start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    date_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
    capacity: 30,
    format: 'ONSITE',
    registration_mode: 'AUTO',
    allow_registration_during_event: false,
    address_full: '1 rue Test, 75001 Paris',
    address_city: 'Paris',
    address_country: 'France',
  });

  beforeEach(async () => {
    await syncDB();
    company = await createCompany();
    otherCompany = await createCompany({ identifier: 'other-corp', companyName: 'OtherCorp' });
    participant = await createParticipant();
    admin = await createAdmin();
  });

  test('company peut créer un event → 201 + status DRAFT', async () => {
    const res = await request(app)
      .post('/api/events/create/')
      .set(authHeader(company))
      .send(eventPayload());
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Event');
    expect(res.body.status).toBe('DRAFT');
  });

  test('event en ligne avec inscription pendant → 201', async () => {
    const payload = {
      title: 'Live Online Event',
      description: 'Test',
      date_start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      date_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
      capacity: 30,
      format: 'ONLINE',
      registration_mode: 'AUTO',
      allow_registration_during_event: true,
      online_platform: 'Zoom',
      online_link: 'https://zoom.us/j/123456789',
    };
    const res = await request(app)
      .post('/api/events/create/')
      .set(authHeader(company))
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.allow_registration_during_event).toBe(true);
  });

  test('event capacité illimitée → 201', async () => {
    const payload = { ...eventPayload('Unlimited Event'), capacity: 0, unlimited_capacity: true };
    const res = await request(app)
      .post('/api/events/create/')
      .set(authHeader(company))
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.unlimited_capacity).toBe(true);
  });

  test('capacité = 1 (limitée) → 400', async () => {
    const payload = { ...eventPayload('Tiny Event'), capacity: 1, unlimited_capacity: false };
    const res = await request(app)
      .post('/api/events/create/')
      .set(authHeader(company))
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('capacity');
  });

  test('date_start dans le passé → 400', async () => {
    const payload = {
      ...eventPayload('Past Start'),
      date_start: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      date_end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    };
    const res = await request(app)
      .post('/api/events/create/')
      .set(authHeader(company))
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('date_start');
  });

  test('live registration + VALIDATION → 400', async () => {
    const payload = {
      title: 'Invalid Live',
      description: 'Test',
      date_start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      date_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
      capacity: 30,
      format: 'ONLINE',
      registration_mode: 'VALIDATION',
      allow_registration_during_event: true,
      online_platform: 'Zoom',
      online_link: 'https://zoom.us/j/123456789',
    };
    const res = await request(app)
      .post('/api/events/create/')
      .set(authHeader(company))
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('registration_mode');
  });

  test('live registration + online_visibility PARTIAL → 400', async () => {
    const payload = {
      title: 'Invalid Hidden',
      description: 'Test',
      date_start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      date_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
      capacity: 30,
      format: 'ONLINE',
      registration_mode: 'AUTO',
      allow_registration_during_event: true,
      online_platform: 'Zoom',
      online_link: 'https://zoom.us/j/123456789',
      online_visibility: 'PARTIAL',
    };
    const res = await request(app)
      .post('/api/events/create/')
      .set(authHeader(company))
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('online_visibility');
  });

  test('live registration + registration_deadline → 400', async () => {
    const payload = {
      title: 'Invalid Deadline',
      description: 'Test',
      date_start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      date_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
      capacity: 30,
      format: 'ONLINE',
      registration_mode: 'AUTO',
      allow_registration_during_event: true,
      online_link: 'https://zoom.us/j/123456789',
      registration_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    const res = await request(app)
      .post('/api/events/create/')
      .set(authHeader(company))
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('registration_deadline');
  });

  test('participant ne peut pas créer → 403', async () => {
    const res = await request(app)
      .post('/api/events/create/')
      .set(authHeader(participant))
      .send(eventPayload());
    expect(res.status).toBe(403);
  });

  test('anonyme ne peut pas créer → 401', async () => {
    const res = await request(app)
      .post('/api/events/create/')
      .send(eventPayload());
    expect(res.status).toBe(401);
  });

  test('company peut modifier son event', async () => {
    const event = await createEvent(company);
    const res = await request(app)
      .patch(`/api/events/${event.id}/update/`)
      .set(authHeader(company))
      .send({ title: 'Nouveau Titre' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Nouveau Titre');
  });

  test("autre company ne peut pas modifier → 403 ou 404", async () => {
    const event = await createEvent(company);
    const res = await request(app)
      .patch(`/api/events/${event.id}/update/`)
      .set(authHeader(otherCompany))
      .send({ title: 'Piratage' });
    expect([403, 404]).toContain(res.status);
  });

  test('company peut supprimer son event → 204', async () => {
    const event = await createEvent(company);
    const res = await request(app)
      .delete(`/api/events/${event.id}/delete/`)
      .set(authHeader(company));
    expect(res.status).toBe(204);
    const deleted = await Event.findByPk(event.id);
    expect(deleted).toBeNull();
  });

  test("autre company ne peut pas supprimer → 403 ou 404", async () => {
    const event = await createEvent(company);
    const res = await request(app)
      .delete(`/api/events/${event.id}/delete/`)
      .set(authHeader(otherCompany));
    expect([403, 404]).toContain(res.status);
    const still = await Event.findByPk(event.id);
    expect(still).not.toBeNull();
  });

  test('admin peut supprimer n\'importe quel event → 204', async () => {
    const event = await createEvent(company);
    const res = await request(app)
      .delete(`/api/events/admin/${event.id}/delete/`)
      .set(authHeader(admin));
    expect(res.status).toBe(204);
    const deleted = await Event.findByPk(event.id);
    expect(deleted).toBeNull();
  });

  test('date_end < date_start → 400', async () => {
    const payload = {
      ...eventPayload(),
      date_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // avant date_start
    };
    const res = await request(app)
      .post('/api/events/create/')
      .set(authHeader(company))
      .send(payload);
    expect(res.status).toBe(400);
  });

  test('GET event publié → 200 + view_count incrémenté', async () => {
    const event = await createEvent(company);
    const res = await request(app).get(`/api/events/${event.id}/`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe(event.title);
    await event.reload();
    expect(event.view_count).toBe(1);
  });

  test('GET event DRAFT → non visible au public', async () => {
    const draft = await createEvent(company, { status: 'DRAFT' });
    const res = await request(app).get(`/api/events/${draft.id}/`);
    expect([403, 404]).toContain(res.status);
  });
});

// ─── MES EVENTS (COMPANY) ─────────────────────────────────────────────────────

describe('My Events (Company)', () => {
  let company, otherCompany, participant;

  beforeEach(async () => {
    await syncDB();
    company = await createCompany();
    otherCompany = await createCompany({ identifier: 'other-corp', companyName: 'OtherCorp' });
    participant = await createParticipant();
    await createEvent(company, { title: 'Mon Event Publié', status: 'PUBLISHED' });
    await createEvent(company, { title: 'Mon Brouillon', status: 'DRAFT' });
    await createEvent(otherCompany, { title: 'Event Autre Company' });
  });

  test('company voit tous ses events (PUBLISHED + DRAFT), pas ceux des autres', async () => {
    const res = await request(app)
      .get('/api/events/my-events/')
      .set(authHeader(company));
    expect(res.status).toBe(200);
    const titles = res.body.results.map(e => e.title);
    expect(titles).toContain('Mon Event Publié');
    expect(titles).toContain('Mon Brouillon');
    expect(titles).not.toContain('Event Autre Company');
  });

  test('participant ne peut pas accéder → 403', async () => {
    const res = await request(app)
      .get('/api/events/my-events/')
      .set(authHeader(participant));
    expect(res.status).toBe(403);
  });
});

// ─── STATS PAR EVENT ─────────────────────────────────────────────────────────

describe('Stats par event', () => {
  let company, otherCompany, participant, admin, event;

  beforeEach(async () => {
    await syncDB();
    company = await createCompany();
    otherCompany = await createCompany({ identifier: 'other-corp', companyName: 'OtherCorp' });
    participant = await createParticipant();
    admin = await createAdmin();
    event = await createEvent(company);
  });

  test('owner peut voir les stats → 200 + registrations + spots_remaining', async () => {
    const res = await request(app)
      .get(`/api/events/${event.id}/stats/`)
      .set(authHeader(company));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('registrations');
    expect(res.body).toHaveProperty('spots_remaining');
  });

  test('autre company → 403', async () => {
    const res = await request(app)
      .get(`/api/events/${event.id}/stats/`)
      .set(authHeader(otherCompany));
    expect(res.status).toBe(403);
  });

  test('participant → 403', async () => {
    const res = await request(app)
      .get(`/api/events/${event.id}/stats/`)
      .set(authHeader(participant));
    expect(res.status).toBe(403);
  });

  test('admin peut voir les stats → 200', async () => {
    const res = await request(app)
      .get(`/api/events/${event.id}/stats/`)
      .set(authHeader(admin));
    expect(res.status).toBe(200);
  });
});

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

describe('Dashboard Stats (Company)', () => {
  let company, participant;

  beforeEach(async () => {
    await syncDB();
    company = await createCompany();
    participant = await createParticipant();
    const upcomingEvent = await createEvent(company, { title: 'Upcoming Event', daysFromNow: 5, capacity: 100, status: 'PUBLISHED' });
    await upcomingEvent.update({ view_count: 42 });
    const pastEvent = await createEvent(company, { title: 'Past Event', daysFromNow: -10, capacity: 50, status: 'PUBLISHED' });
    await pastEvent.update({ view_count: 18 });
    await Registration.create({ participant_id: participant.id, event_id: upcomingEvent.id, status: 'CONFIRMED' });
  });

  test('company obtient les dashboard stats → 200 avec champs attendus', async () => {
    const res = await request(app)
      .get('/api/events/dashboard-stats/')
      .set(authHeader(company));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_views');
    expect(res.body).toHaveProperty('total_registrations');
    expect(res.body).toHaveProperty('upcoming_events');
    expect(res.body).toHaveProperty('past_events');
  });

  test('participant ne peut pas accéder → 403', async () => {
    const res = await request(app)
      .get('/api/events/dashboard-stats/')
      .set(authHeader(participant));
    expect(res.status).toBe(403);
  });

  test('export CSV summary → 200 + Content-Type text/csv', async () => {
    const res = await request(app)
      .get('/api/events/dashboard-stats/export-summary/')
      .set(authHeader(company));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('dashboard_summary.csv');
  });

  test('export CSV performance → 200 + Content-Type text/csv', async () => {
    const res = await request(app)
      .get('/api/events/dashboard-stats/export-performance/')
      .set(authHeader(company));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('events_performance.csv');
  });
});

// ─── RECOMMANDATIONS ─────────────────────────────────────────────────────────

describe('Événements recommandés', () => {
  let company, participant;

  beforeEach(async () => {
    await syncDB();
    company = await createCompany();
    participant = await createParticipant();
    const tagML = await createTag('Machine Learning');
    const tagNeuro = await createTag('Neurosciences');

    const eventML = await createEvent(company, { title: 'Event ML' });
    await eventML.addTags([tagML]);

    const eventNeuro = await createEvent(company, { title: 'Event Neuro' });
    await eventNeuro.addTags([tagNeuro]);

    await participant.addTags([tagML]);
  });

  test('retourne les events correspondant aux tags du participant', async () => {
    const res = await request(app)
      .get('/api/events/recommended/')
      .set(authHeader(participant));
    expect(res.status).toBe(200);
    const titles = res.body.results.map(e => e.title);
    expect(titles).toContain('Event ML');
    expect(titles).not.toContain('Event Neuro');
  });

  test('company ne peut pas accéder → 403', async () => {
    const res = await request(app)
      .get('/api/events/recommended/')
      .set(authHeader(company));
    expect(res.status).toBe(403);
  });

  test('anonyme ne peut pas accéder → 401', async () => {
    const res = await request(app).get('/api/events/recommended/');
    expect(res.status).toBe(401);
  });
});

// ─── FILTRES AVANCÉS ─────────────────────────────────────────────────────────

describe('Filtres avancés', () => {
  let company, tag;

  beforeEach(async () => {
    await syncDB();
    company = await createCompany();
    tag = await createTag('IA');

    const eventParis = await createEvent(company, { title: 'Event Paris', daysFromNow: 5 });
    await eventParis.update({ address_city: 'Paris' });

    const eventLyon = await createEvent(company, { title: 'Event Lyon', daysFromNow: 15 });
    await eventLyon.update({ address_city: 'Lyon' });
    await eventLyon.addTags([tag]);
  });

  test('filtre ?city=Paris → que Paris', async () => {
    const res = await request(app).get('/api/events/?city=Paris');
    expect(res.status).toBe(200);
    const titles = res.body.results.map(e => e.title);
    expect(titles).toContain('Event Paris');
    expect(titles).not.toContain('Event Lyon');
  });

  test('filtre par tag → que les events avec ce tag', async () => {
    const res = await request(app).get(`/api/events/?tags=${tag.id}`);
    expect(res.status).toBe(200);
    const titles = res.body.results.map(e => e.title);
    expect(titles).toContain('Event Lyon');
    expect(titles).not.toContain('Event Paris');
  });

  test('filtre ?date_after → exclut les events avant la date', async () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const res = await request(app).get(`/api/events/?date_after=${futureDate}`);
    expect(res.status).toBe(200);
    const titles = res.body.results.map(e => e.title);
    expect(titles).toContain('Event Lyon');
    expect(titles).not.toContain('Event Paris');
  });
});

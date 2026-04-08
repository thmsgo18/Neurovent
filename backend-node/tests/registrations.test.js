'use strict';

/**
 * Tests — Registrations
 * Couvre : AUTO, VALIDATION, waitlist, annulation, promotion, permissions, export CSV
 * Équivalent de backend-django/registrations/tests.py
 */

const request = require('supertest');
const app = require('../app');
const { Registration } = require('../src/models');
const {
  syncDB, createParticipant, createCompany, createAdmin,
  authHeader, createEvent,
} = require('./helpers');

const emailService = require('../src/services/emailService');

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

// ─── MODE AUTO ────────────────────────────────────────────────────────────────

describe('Inscriptions — Mode AUTO', () => {
  let company, participant, event;

  beforeEach(async () => {
    await syncDB();
    jest.clearAllMocks();
    company = await createCompany();
    participant = await createParticipant();
    event = await createEvent(company, { capacity: 2, registrationMode: 'AUTO' });
  });

  test('AUTO + place dispo → CONFIRMED immédiatement', async () => {
    const res = await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: event.id });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('CONFIRMED');
  });

  test('AUTO + event complet → WAITLIST (pas erreur)', async () => {
    const p2 = await createParticipant({ email: 'b@test.com' });
    const p3 = await createParticipant({ email: 'c@test.com' });
    await Registration.create({ participant_id: p2.id, event_id: event.id, status: 'CONFIRMED' });
    await Registration.create({ participant_id: p3.id, event_id: event.id, status: 'CONFIRMED' });

    const res = await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: event.id });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('WAITLIST');
    expect(emailService.sendRegistrationWaitlist).toHaveBeenCalledTimes(1);
  });

  test('inscription en double si active → 400', async () => {
    await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: event.id });
    const res = await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: event.id });
    expect(res.status).toBe(400);
  });

  test('réinscription après annulation → réactive, pas de doublon en base', async () => {
    const r1 = await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: event.id });
    expect(r1.status).toBe(201);

    await request(app)
      .patch(`/api/registrations/${r1.body.id}/cancel/`)
      .set(authHeader(participant));

    const r2 = await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: event.id });
    expect(r2.status).toBe(201);
    expect(r2.body.status).toBe('CONFIRMED');

    const count = await Registration.count({ where: { participant_id: participant.id, event_id: event.id } });
    expect(count).toBe(1);
  });

  test('inscription à un event non publié → 403', async () => {
    const draftEvent = await createEvent(company, { status: 'DRAFT' });
    const res = await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: draftEvent.id });
    expect(res.status).toBe(403);
  });

  test('inscription à un event déjà commencé → 400', async () => {
    const pastEvent = await createEvent(company, { daysFromNow: -1 });
    const res = await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: pastEvent.id });
    expect(res.status).toBe(400);
  });

  test('event online en cours + option activée → CONFIRMED', async () => {
    const liveOnline = await createEvent(company, { format: 'ONLINE' });
    await liveOnline.update({
      date_start: new Date(Date.now() - 30 * 60 * 1000),
      date_end: new Date(Date.now() + 2 * 60 * 60 * 1000),
      registration_deadline: null,
      allow_registration_during_event: true,
    });
    const res = await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: liveOnline.id });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('CONFIRMED');
  });

  test('event illimité → toujours CONFIRMED', async () => {
    const unlimitedEvent = await createEvent(company, { unlimitedCapacity: true });
    const res = await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: unlimitedEvent.id });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('CONFIRMED');
  });

  test('event présentiel en cours → 400', async () => {
    const liveOnsite = await createEvent(company, { format: 'ONSITE' });
    await liveOnsite.update({
      date_start: new Date(Date.now() - 30 * 60 * 1000),
      date_end: new Date(Date.now() + 2 * 60 * 60 * 1000),
      registration_deadline: null,
    });
    const res = await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: liveOnsite.id });
    expect(res.status).toBe(400);
  });

  test('après la deadline → 400', async () => {
    await event.update({ registration_deadline: new Date(Date.now() - 60 * 60 * 1000) });
    const res = await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: event.id });
    expect(res.status).toBe(400);
  });
});

// ─── MODE VALIDATION ─────────────────────────────────────────────────────────

describe('Inscriptions — Mode VALIDATION', () => {
  let company, participant, event;

  beforeEach(async () => {
    await syncDB();
    jest.clearAllMocks();
    company = await createCompany();
    participant = await createParticipant();
    event = await createEvent(company, { capacity: 5, registrationMode: 'VALIDATION' });
  });

  test('VALIDATION + place dispo → PENDING', async () => {
    const res = await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: event.id });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(emailService.sendRegistrationPending).toHaveBeenCalledTimes(1);
  });

  test('VALIDATION + event complet → 400', async () => {
    const fullEvent = await createEvent(company, { capacity: 1, registrationMode: 'VALIDATION' });
    const other = await createParticipant({ email: 'other@test.com' });
    await Registration.create({ participant_id: other.id, event_id: fullEvent.id, status: 'CONFIRMED' });

    const res = await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: fullEvent.id });
    expect(res.status).toBe(400);
  });

  test('company confirme une inscription PENDING → CONFIRMED', async () => {
    const reg = await Registration.create({ participant_id: participant.id, event_id: event.id, status: 'PENDING' });
    const res = await request(app)
      .patch(`/api/registrations/${reg.id}/status/`)
      .set(authHeader(company))
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(200);
    await reg.reload();
    expect(reg.status).toBe('CONFIRMED');
  });

  test('company rejette une inscription PENDING → REJECTED', async () => {
    const reg = await Registration.create({ participant_id: participant.id, event_id: event.id, status: 'PENDING' });
    const res = await request(app)
      .patch(`/api/registrations/${reg.id}/status/`)
      .set(authHeader(company))
      .send({ status: 'REJECTED' });
    expect(res.status).toBe(200);
    await reg.reload();
    expect(reg.status).toBe('REJECTED');
  });

  test('company peut ajouter un commentaire lors du changement de statut', async () => {
    const reg = await Registration.create({ participant_id: participant.id, event_id: event.id, status: 'PENDING' });
    const res = await request(app)
      .patch(`/api/registrations/${reg.id}/status/`)
      .set(authHeader(company))
      .send({ status: 'CONFIRMED', company_comment: 'Bienvenue à notre conférence !' });
    expect(res.status).toBe(200);
    await reg.reload();
    expect(reg.company_comment).toBe('Bienvenue à notre conférence !');
  });

  test('company ne peut pas mettre statut WAITLIST → 400', async () => {
    const reg = await Registration.create({ participant_id: participant.id, event_id: event.id, status: 'PENDING' });
    const res = await request(app)
      .patch(`/api/registrations/${reg.id}/status/`)
      .set(authHeader(company))
      .send({ status: 'WAITLIST' });
    expect(res.status).toBe(400);
  });

  test("autre company ne peut pas modifier l'inscription → 403 ou 404", async () => {
    const otherCompany = await createCompany({ identifier: 'other-corp', companyName: 'Other' });
    const reg = await Registration.create({ participant_id: participant.id, event_id: event.id, status: 'PENDING' });
    const res = await request(app)
      .patch(`/api/registrations/${reg.id}/status/`)
      .set(authHeader(otherCompany))
      .send({ status: 'CONFIRMED' });
    expect([403, 404]).toContain(res.status);
  });

  test('admin peut modifier n\'importe quelle inscription → CONFIRMED', async () => {
    const admin = await createAdmin();
    const reg = await Registration.create({ participant_id: participant.id, event_id: event.id, status: 'PENDING' });
    const res = await request(app)
      .patch(`/api/registrations/${reg.id}/status/`)
      .set(authHeader(admin))
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(200);
    await reg.reload();
    expect(reg.status).toBe('CONFIRMED');
  });
});

// ─── ANNULATION ET PROMOTION WAITLIST ─────────────────────────────────────────

describe('Annulation et promotion waitlist', () => {
  let company, p1, p2, regP1, regP2;

  beforeEach(async () => {
    await syncDB();
    jest.clearAllMocks();
    company = await createCompany();
    const event = await createEvent(company, { capacity: 1, registrationMode: 'AUTO' });

    p1 = await createParticipant({ email: 'p1@test.com' });
    p2 = await createParticipant({ email: 'p2@test.com' });

    regP1 = await Registration.create({ participant_id: p1.id, event_id: event.id, status: 'CONFIRMED' });
    regP2 = await Registration.create({ participant_id: p2.id, event_id: event.id, status: 'WAITLIST' });
  });

  test('annulation de p1 → p2 promu à CONFIRMED', async () => {
    const res = await request(app)
      .patch(`/api/registrations/${regP1.id}/cancel/`)
      .set(authHeader(p1));
    expect(res.status).toBe(200);

    await regP1.reload();
    await regP2.reload();
    expect(regP1.status).toBe('CANCELLED');
    expect(regP2.status).toBe('CONFIRMED');
  });

  test('participant ne peut pas annuler l\'inscription d\'un autre → 403 ou 404', async () => {
    const res = await request(app)
      .patch(`/api/registrations/${regP1.id}/cancel/`)
      .set(authHeader(p2));
    expect([403, 404]).toContain(res.status);
  });
});

// ─── SUPPRESSION PAR L'ORGANISATEUR ──────────────────────────────────────────

describe('Suppression par l\'organisateur (remove)', () => {
  let company, otherCompany, participant, waitingParticipant, event, registration, waitlistRegistration;

  beforeEach(async () => {
    await syncDB();
    jest.clearAllMocks();
    company = await createCompany();
    otherCompany = await createCompany({ identifier: 'other-corp', companyName: 'OtherCorp' });
    participant = await createParticipant({ email: 'p@test.com' });
    waitingParticipant = await createParticipant({ email: 'wait@test.com' });
    event = await createEvent(company, { capacity: 1, registrationMode: 'AUTO' });

    registration = await Registration.create({ participant_id: participant.id, event_id: event.id, status: 'CONFIRMED' });
    waitlistRegistration = await Registration.create({ participant_id: waitingParticipant.id, event_id: event.id, status: 'WAITLIST' });
  });

  test('company supprime + promeut le waitlist → 204', async () => {
    const res = await request(app)
      .patch(`/api/registrations/${registration.id}/remove/`)
      .set(authHeader(company));
    expect(res.status).toBe(204);

    await registration.reload();
    await waitlistRegistration.reload();
    expect(registration.status).toBe('CANCELLED');
    expect(waitlistRegistration.status).toBe('CONFIRMED');
    expect(emailService.sendRegistrationRemovedByOrganizer).toHaveBeenCalledTimes(1);
    expect(emailService.sendRegistrationConfirmed).toHaveBeenCalledTimes(1);
  });

  test('inscription supprimée n\'apparaît plus dans la liste de l\'event', async () => {
    await request(app)
      .patch(`/api/registrations/${registration.id}/remove/`)
      .set(authHeader(company));
    const res = await request(app)
      .get(`/api/registrations/event/${event.id}/`)
      .set(authHeader(company));
    expect(res.status).toBe(200);
    const results = res.body.results || res.body;
    const ids = results.map(r => r.id);
    expect(ids).not.toContain(registration.id);
  });

  test('autre company ne peut pas supprimer → 403 ou 404', async () => {
    const res = await request(app)
      .patch(`/api/registrations/${registration.id}/remove/`)
      .set(authHeader(otherCompany));
    expect([403, 404]).toContain(res.status);
  });
});

// ─── BESOINS D'ACCESSIBILITÉ ─────────────────────────────────────────────────

describe('Besoins d\'accessibilité', () => {
  let company, participant, event;

  beforeEach(async () => {
    await syncDB();
    company = await createCompany();
    participant = await createParticipant();
    event = await createEvent(company, { capacity: 10 });
  });

  test('participant peut indiquer ses besoins d\'accessibilité', async () => {
    const res = await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: event.id, accessibility_needs: 'Fauteuil roulant, accès PMR nécessaire' });
    expect(res.status).toBe(201);
    const reg = await Registration.findOne({ where: { participant_id: participant.id, event_id: event.id } });
    expect(reg.accessibility_needs).toBe('Fauteuil roulant, accès PMR nécessaire');
  });

  test('accessibility_needs est optionnel', async () => {
    const res = await request(app)
      .post('/api/registrations/')
      .set(authHeader(participant))
      .send({ event: event.id });
    expect(res.status).toBe(201);
    const reg = await Registration.findOne({ where: { participant_id: participant.id, event_id: event.id } });
    expect(reg.accessibility_needs || '').toBe('');
  });
});

// ─── MES INSCRIPTIONS ────────────────────────────────────────────────────────

describe('Mes inscriptions (participant)', () => {
  let company, participant;

  beforeEach(async () => {
    await syncDB();
    company = await createCompany();
    participant = await createParticipant();
    const event1 = await createEvent(company, { title: 'Event 1' });
    const event2 = await createEvent(company, { title: 'Event 2' });
    await Registration.create({ participant_id: participant.id, event_id: event1.id, status: 'CONFIRMED' });
    await Registration.create({ participant_id: participant.id, event_id: event2.id, status: 'CANCELLED' });
  });

  test('liste toutes mes inscriptions → 2 résultats', async () => {
    const res = await request(app)
      .get('/api/registrations/my/')
      .set(authHeader(participant));
    expect(res.status).toBe(200);
    const results = res.body.results || res.body;
    expect(results.length).toBe(2);
  });

  test('filtre ?status=CONFIRMED → que les CONFIRMED', async () => {
    const res = await request(app)
      .get('/api/registrations/my/?status=CONFIRMED')
      .set(authHeader(participant));
    expect(res.status).toBe(200);
    const results = res.body.results || res.body;
    for (const reg of results) {
      expect(reg.status).toBe('CONFIRMED');
    }
  });

  test('company ne peut pas accéder → 403', async () => {
    const company2 = await createCompany({ identifier: 'c2', companyName: 'C2' });
    const res = await request(app)
      .get('/api/registrations/my/')
      .set(authHeader(company2));
    expect(res.status).toBe(403);
  });
});

// ─── LISTE INSCRITS (COMPANY) ─────────────────────────────────────────────────

describe('Liste inscrits d\'un event (Company)', () => {
  let company, otherCompany, participant, event;

  beforeEach(async () => {
    await syncDB();
    company = await createCompany();
    otherCompany = await createCompany({ identifier: 'other-corp', companyName: 'OtherCorp' });
    participant = await createParticipant();
    event = await createEvent(company, { capacity: 10 });
    await Registration.create({ participant_id: participant.id, event_id: event.id, status: 'CONFIRMED' });
  });

  test('company voit les inscriptions de son event → 1 résultat', async () => {
    const res = await request(app)
      .get(`/api/registrations/event/${event.id}/`)
      .set(authHeader(company));
    expect(res.status).toBe(200);
    const results = res.body.results || res.body;
    expect(results.length).toBe(1);
  });

  test('autre company → 403', async () => {
    const res = await request(app)
      .get(`/api/registrations/event/${event.id}/`)
      .set(authHeader(otherCompany));
    expect(res.status).toBe(403);
  });

  test('participant → 403', async () => {
    const res = await request(app)
      .get(`/api/registrations/event/${event.id}/`)
      .set(authHeader(participant));
    expect(res.status).toBe(403);
  });
});

// ─── EXPORT CSV ───────────────────────────────────────────────────────────────

describe('Export CSV des inscriptions', () => {
  let company, otherCompany, participant, admin, event;

  beforeEach(async () => {
    await syncDB();
    company = await createCompany();
    otherCompany = await createCompany({ identifier: 'other-corp', companyName: 'OtherCorp' });
    participant = await createParticipant({ email: 'alice@test.com' });
    admin = await createAdmin();
    event = await createEvent(company, { capacity: 10 });
    await Registration.create({
      participant_id: participant.id,
      event_id: event.id,
      status: 'CONFIRMED',
      accessibility_needs: 'Daltonien',
      company_comment: 'Participant confirmé',
    });
  });

  test('company peut exporter le CSV → 200 + text/csv + contenu', async () => {
    const res = await request(app)
      .get(`/api/registrations/event/${event.id}/export/`)
      .set(authHeader(company));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Alice');
    expect(res.text).toContain('Daltonien');
  });

  test('admin peut exporter le CSV → 200 + text/csv', async () => {
    const res = await request(app)
      .get(`/api/registrations/event/${event.id}/export/`)
      .set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
  });

  test('autre company → 403', async () => {
    const res = await request(app)
      .get(`/api/registrations/event/${event.id}/export/`)
      .set(authHeader(otherCompany));
    expect(res.status).toBe(403);
  });

  test('participant → 403', async () => {
    const res = await request(app)
      .get(`/api/registrations/event/${event.id}/export/`)
      .set(authHeader(participant));
    expect(res.status).toBe(403);
  });
});

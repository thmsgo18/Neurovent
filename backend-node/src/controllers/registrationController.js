'use strict';

const { Op } = require('sequelize');
const { Registration, Event, User } = require('../models');
const {
  sendRegistrationConfirmed,
  sendRegistrationPending,
  sendRegistrationWaitlist,
  sendRegistrationRejected,
  sendRegistrationRemovedByOrganizer,
} = require('../services/emailService');
const { notifyEventCapacityMilestones } = require('../utils/notificationUtils');

// ─── Helper — Promotion liste d'attente ──────────────────────────────────────

async function promoteFromWaitlist(event) {
  const confirmedCount = await Registration.count({
    where: { event_id: event.id, status: 'CONFIRMED' },
  });

  if (confirmedCount < event.capacity) {
    const nextInLine = await Registration.findOne({
      where: { event_id: event.id, status: 'WAITLIST' },
      include: [
        { association: 'participant', attributes: ['id', 'email', 'first_name', 'last_name'] },
        {
          association: 'event',
          include: [{ association: 'company', attributes: ['company_name'] }],
        },
      ],
      order: [['created_at', 'ASC']],
    });

    if (nextInLine) {
      await nextInLine.update({ status: 'CONFIRMED' });
      sendRegistrationConfirmed(nextInLine, true).catch(() => {});
      return nextInLine;
    }
  }
  return null;
}

// ─── Helper — charger l'event complet pour les emails ────────────────────────

async function loadEventForEmail(eventId) {
  return Event.findByPk(eventId, {
    include: [{ association: 'company', attributes: ['id', 'company_name'] }],
  });
}

// ─── S'inscrire à un event ────────────────────────────────────────────────────

async function registerToEvent(req, res) {
  const { event: eventId, accessibility_needs = '' } = req.body;
  const user = req.user;

  if (!eventId) return res.status(400).json({ event: "L'identifiant de l'événement est requis." });

  const event = await Event.findByPk(eventId, {
    include: [{ association: 'company', attributes: ['id', 'company_name'] }],
  });
  if (!event) return res.status(404).json({ error: 'Événement introuvable.' });

  if (event.status !== 'PUBLISHED') {
    return res.status(403).json({ error: "Cet événement n'est pas ouvert aux inscriptions." });
  }

  const now = new Date();
  if (event.registration_deadline && now > new Date(event.registration_deadline)) {
    return res.status(400).json({ error: 'Les inscriptions pour cet événement sont closes.' });
  }
  if (now >= new Date(event.date_start)) {
    return res.status(400).json({ error: 'Cet événement a déjà commencé.' });
  }

  // Vérifier si une inscription ACTIVE existe déjà
  const activeReg = await Registration.findOne({
    where: {
      participant_id: user.id,
      event_id: event.id,
      status: ['PENDING', 'CONFIRMED', 'WAITLIST'],
    },
  });
  if (activeReg) {
    return res.status(400).json({ event: 'Vous êtes déjà inscrit à cet événement.' });
  }

  // Calculer la capacité
  const confirmedCount = await Registration.count({
    where: { event_id: event.id, status: 'CONFIRMED' },
  });
  const isFull = confirmedCount >= event.capacity;

  let newStatus;
  if (isFull) {
    if (event.registration_mode === 'AUTO') {
      newStatus = 'WAITLIST';
    } else {
      return res.status(400).json({ error: 'Cet événement est complet.' });
    }
  } else {
    newStatus = event.registration_mode === 'AUTO' ? 'CONFIRMED' : 'PENDING';
  }

  // Réactiver une inscription CANCELLED/REJECTED si elle existe
  const existingCancelled = await Registration.findOne({
    where: {
      participant_id: user.id,
      event_id: event.id,
      status: ['CANCELLED', 'REJECTED'],
    },
  });

  let registration;
  if (existingCancelled) {
    await existingCancelled.update({
      status: newStatus,
      accessibility_needs,
      company_comment: '',
    });
    registration = existingCancelled;
  } else {
    registration = await Registration.create({
      participant_id: user.id,
      event_id: event.id,
      status: newStatus,
      accessibility_needs,
    });
  }

  // Calculer la position dans la liste d'attente
  let waitlistPosition = null;
  if (newStatus === 'WAITLIST') {
    waitlistPosition = await Registration.count({
      where: {
        event_id: event.id,
        status: 'WAITLIST',
        created_at: { [Op.lt]: registration.created_at },
      },
    }) + 1;
  }

  // Notifier le participant selon le statut
  await registration.reload({
    include: [
      { association: 'participant', attributes: ['id', 'email', 'first_name', 'last_name'] },
      {
        association: 'event',
        include: [{ association: 'company', attributes: ['company_name'] }],
      },
    ],
  });
  if (newStatus === 'CONFIRMED') {
    sendRegistrationConfirmed(registration, false).catch(() => {});
  } else if (newStatus === 'PENDING') {
    sendRegistrationPending(registration).catch(() => {});
  } else if (newStatus === 'WAITLIST') {
    sendRegistrationWaitlist(registration, waitlistPosition).catch(() => {});
  }

  // Alertes de capacité organisateur
  const eventWithCompany = await Event.findByPk(event.id, {
    include: [{ association: 'company', attributes: ['id', 'company_name', 'recovery_email'] }],
  });
  notifyEventCapacityMilestones(eventWithCompany).catch(() => {});

  return res.status(201).json({
    id: registration.id,
    event: event.id,
    event_title: event.title,
    event_date: event.date_start,
    participant_name: `${user.first_name} ${user.last_name}`.trim() || user.email,
    status: registration.status,
    waitlist_position: waitlistPosition,
    accessibility_needs: registration.accessibility_needs,
    company_comment: registration.company_comment,
    created_at: registration.created_at,
  });
}

// ─── Mes inscriptions (participant) ──────────────────────────────────────────

async function myRegistrations(req, res) {
  const { status: statusFilter } = req.query;
  const where = { participant_id: req.user.id };
  if (statusFilter) where.status = statusFilter.toUpperCase();

  const registrations = await Registration.findAll({
    where,
    include: [
      {
        association: 'event',
        attributes: ['id', 'title', 'date_start'],
        include: [{ association: 'company', attributes: ['company_name'] }],
      },
      { association: 'participant', attributes: ['id', 'first_name', 'last_name', 'email'] },
    ],
    order: [['created_at', 'DESC']],
  });

  const results = await Promise.all(registrations.map(async (reg) => {
    let waitlistPosition = null;
    if (reg.status === 'WAITLIST') {
      waitlistPosition = await Registration.count({
        where: {
          event_id: reg.event_id,
          status: 'WAITLIST',
          created_at: { [Op.lt]: reg.created_at },
        },
      }) + 1;
    }
    return {
      id: reg.id,
      event: reg.event_id,
      event_title: reg.event ? reg.event.title : null,
      event_date: reg.event ? reg.event.date_start : null,
      participant_name: reg.participant
        ? `${reg.participant.first_name} ${reg.participant.last_name}`.trim() || reg.participant.email
        : null,
      status: reg.status,
      waitlist_position: waitlistPosition,
      accessibility_needs: reg.accessibility_needs,
      company_comment: reg.company_comment,
      created_at: reg.created_at,
    };
  }));

  return res.json(results);
}

// ─── Annuler son inscription (participant) ────────────────────────────────────

async function cancelRegistration(req, res) {
  const registration = await Registration.findOne({
    where: { id: req.params.id, participant_id: req.user.id },
    include: [
      {
        association: 'event',
        include: [{ association: 'company', attributes: ['company_name'] }],
      },
    ],
  });
  if (!registration) return res.status(404).json({ error: 'Inscription introuvable.' });

  await registration.update({ status: 'CANCELLED' });

  // Promouvoir le premier en liste d'attente
  await promoteFromWaitlist(registration.event);

  // Alertes de capacité organisateur
  const eventForCapacity = await Event.findByPk(registration.event_id, {
    include: [{ association: 'company', attributes: ['id', 'company_name', 'recovery_email'] }],
  });
  notifyEventCapacityMilestones(eventForCapacity).catch(() => {});

  return res.json({ id: registration.id, status: registration.status });
}

// ─── Inscriptions d'un event (company) ───────────────────────────────────────

async function eventRegistrations(req, res) {
  const { event_id } = req.params;

  const event = await Event.findByPk(event_id, {
    include: [{ association: 'company', attributes: ['id'] }],
  });
  if (!event) return res.status(404).json({ error: 'Événement introuvable.' });
  if (event.company_id !== req.user.id) {
    return res.status(403).json({ error: "Vous n'êtes pas l'organisateur de cet événement." });
  }

  const registrations = await Registration.findAll({
    where: {
      event_id,
      status: { [Op.ne]: 'CANCELLED' },
    },
    include: [
      { association: 'participant', attributes: ['id', 'first_name', 'last_name', 'email'] },
      { association: 'event', attributes: ['id', 'title', 'date_start'] },
    ],
    order: [['created_at', 'ASC']],
  });

  const results = await Promise.all(registrations.map(async (reg) => {
    let waitlistPosition = null;
    if (reg.status === 'WAITLIST') {
      waitlistPosition = await Registration.count({
        where: {
          event_id: reg.event_id,
          status: 'WAITLIST',
          created_at: { [Op.lt]: reg.created_at },
        },
      }) + 1;
    }
    return {
      id: reg.id,
      event: reg.event_id,
      event_title: reg.event ? reg.event.title : null,
      event_date: reg.event ? reg.event.date_start : null,
      participant_name: reg.participant
        ? `${reg.participant.first_name} ${reg.participant.last_name}`.trim() || reg.participant.email
        : null,
      status: reg.status,
      waitlist_position: waitlistPosition,
      accessibility_needs: reg.accessibility_needs,
      company_comment: reg.company_comment,
      created_at: reg.created_at,
    };
  }));

  return res.json(results);
}

// ─── Mettre à jour le statut d'une inscription (company/admin) ───────────────

async function updateRegistrationStatus(req, res) {
  const { status: newStatus, company_comment } = req.body;

  if (!['CONFIRMED', 'REJECTED'].includes(newStatus)) {
    return res.status(400).json({ status: 'Valeur invalide. Choisir: CONFIRMED ou REJECTED.' });
  }

  let registration;
  if (req.user.is_staff) {
    registration = await Registration.findByPk(req.params.id, {
      include: [
        { association: 'participant', attributes: ['id', 'email', 'first_name', 'last_name'] },
        {
          association: 'event',
          include: [{ association: 'company', attributes: ['company_name'] }],
        },
      ],
    });
  } else {
    registration = await Registration.findOne({
      where: {
        id: req.params.id,
        '$event.company_id$': req.user.id,
      },
      include: [
        { association: 'participant', attributes: ['id', 'email', 'first_name', 'last_name'] },
        {
          association: 'event',
          include: [{ association: 'company', attributes: ['id', 'company_name'] }],
        },
      ],
    });
  }

  if (!registration) return res.status(404).json({ error: 'Inscription introuvable.' });

  await registration.update({ status: newStatus, company_comment: company_comment || '' });

  if (newStatus === 'CONFIRMED') {
    sendRegistrationConfirmed(registration).catch(() => {});
  } else if (newStatus === 'REJECTED') {
    sendRegistrationRejected(registration).catch(() => {});
    await promoteFromWaitlist(registration.event);
  }

  // Alertes de capacité organisateur
  const eventForCapacity2 = await Event.findByPk(registration.event.id, {
    include: [{ association: 'company', attributes: ['id', 'company_name', 'recovery_email'] }],
  });
  notifyEventCapacityMilestones(eventForCapacity2).catch(() => {});

  return res.json({ id: registration.id, status: registration.status, company_comment: registration.company_comment });
}

// ─── Retirer une inscription (company/admin) ──────────────────────────────────

async function removeRegistration(req, res) {
  let registration;
  if (req.user.is_staff) {
    registration = await Registration.findByPk(req.params.id, {
      include: [
        { association: 'participant', attributes: ['id', 'email', 'first_name', 'last_name'] },
        {
          association: 'event',
          include: [{ association: 'company', attributes: ['company_name'] }],
        },
      ],
    });
  } else {
    registration = await Registration.findOne({
      where: { id: req.params.id },
      include: [
        { association: 'participant', attributes: ['id', 'email', 'first_name', 'last_name'] },
        {
          association: 'event',
          where: { company_id: req.user.id },
          include: [{ association: 'company', attributes: ['id', 'company_name'] }],
        },
      ],
    });
  }

  if (!registration) return res.status(404).json({ error: 'Inscription introuvable.' });
  if (registration.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Cette inscription a déjà été retirée.' });
  }

  const comment = req.body.company_comment || 'Registration removed by the organizer.';
  await registration.update({ status: 'CANCELLED', company_comment: comment });

  sendRegistrationRemovedByOrganizer(registration).catch(() => {});
  await promoteFromWaitlist(registration.event);

  // Alertes de capacité organisateur
  const eventForCapacity3 = await Event.findByPk(registration.event.id, {
    include: [{ association: 'company', attributes: ['id', 'company_name', 'recovery_email'] }],
  });
  notifyEventCapacityMilestones(eventForCapacity3).catch(() => {});

  return res.status(204).send();
}

// ─── Export CSV des inscrits d'un event ──────────────────────────────────────

async function exportEventRegistrations(req, res) {
  const { event_id } = req.params;

  const event = await Event.findByPk(event_id, {
    include: [{ association: 'company', attributes: ['id'] }],
  });
  if (!event) return res.status(404).json({ error: 'Événement introuvable.' });

  const isOwner = req.user.role === 'COMPANY' && event.company_id === req.user.id;
  const isAdmin = req.user.is_staff;
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: "Vous n'êtes pas autorisé à exporter ces données." });
  }

  const registrations = await Registration.findAll({
    where: { event_id },
    include: [
      { association: 'participant', attributes: ['id', 'first_name', 'last_name', 'email'] },
    ],
    order: [['status', 'ASC'], ['created_at', 'ASC']],
  });

  const statusLabels = {
    PENDING: 'En attente',
    CONFIRMED: 'Confirmé',
    REJECTED: 'Rejeté',
    CANCELLED: 'Annulé',
    WAITLIST: "Liste d'attente",
  };

  const filename = `inscrits_${event.id}_${event.title.slice(0, 30).replace(/\s/g, '_')}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.write('\ufeff'); // BOM UTF-8

  const headers = [
    'Prénom', 'Nom', 'Email',
    'Statut', "Position liste d'attente",
    'Besoins accessibilité', 'Commentaire organisateur',
    "Date d'inscription",
  ];
  res.write(headers.join(';') + '\r\n');

  for (const reg of registrations) {
    const p = reg.participant;
    let waitlistPosition = '';
    if (reg.status === 'WAITLIST') {
      waitlistPosition = await Registration.count({
        where: {
          event_id: reg.event_id,
          status: 'WAITLIST',
          created_at: { [Op.lt]: reg.created_at },
        },
      }) + 1;
    }

    const dateStr = new Date(reg.created_at).toLocaleString('fr-FR');
    const row = [
      p ? p.first_name : '',
      p ? p.last_name : '',
      p ? p.email : '',
      statusLabels[reg.status] || reg.status,
      waitlistPosition,
      reg.accessibility_needs || '',
      reg.company_comment || '',
      dateStr,
    ];
    res.write(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';') + '\r\n');
  }
  res.end();
}

module.exports = {
  registerToEvent,
  myRegistrations,
  cancelRegistration,
  eventRegistrations,
  updateRegistrationStatus,
  removeRegistration,
  exportEventRegistrations,
};

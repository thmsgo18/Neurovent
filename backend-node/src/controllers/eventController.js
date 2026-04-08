'use strict';

const { Op, fn, col, literal } = require('sequelize');
const { sequelize, Event, User, Tag, Registration } = require('../models');
const { sendEventCancelled, sendEventUpdated } = require('../services/emailService');
const {
  captureEventNotificationSnapshot,
  getEventUpdateMessages,
  resetScheduledNotificationFlags,
  notifyEventCapacityMilestones,
} = require('../utils/notificationUtils');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildEventListItem(event, confirmedCount) {
  const spotsRemaining = event.unlimited_capacity ? null : (event.capacity - confirmedCount);
  return {
    id: event.id,
    title: event.title,
    banner: event.banner ? event.banner : null,
    date_start: event.date_start,
    date_end: event.date_end,
    format: event.format,
    registration_mode: event.registration_mode,
    registration_deadline: event.registration_deadline,
    allow_registration_during_event: event.allow_registration_during_event,
    registration_open: event.isRegistrationOpen(),
    capacity: event.capacity,
    unlimited_capacity: event.unlimited_capacity,
    spots_remaining: spotsRemaining,
    is_full: event.unlimited_capacity ? false : spotsRemaining <= 0,
    status: event.status,
    tags: (event.tags || []).map(t => ({ id: t.id, name: t.name })),
    company_name: event.company ? event.company.company_name : null,
    company_logo: event.company && event.company.company_logo ? event.company.company_logo : null,
    address_city: event.address_city,
    address_country: event.address_country,
    online_platform: event.online_platform,
  };
}

function buildEventDetail(event) {
  const registrations = event.registrations || [];
  const confirmedCount = registrations.filter(r => r.status === 'CONFIRMED').length;
  const spotsRemaining = event.unlimited_capacity ? null : (event.capacity - confirmedCount);

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    banner: event.banner || null,
    date_start: event.date_start,
    date_end: event.date_end,
    format: event.format,
    registration_mode: event.registration_mode,
    registration_deadline: event.registration_deadline,
    allow_registration_during_event: event.allow_registration_during_event,
    registration_open: event.isRegistrationOpen(),
    capacity: event.capacity,
    unlimited_capacity: event.unlimited_capacity,
    spots_remaining: spotsRemaining,
    is_full: event.unlimited_capacity ? false : spotsRemaining <= 0,
    status: event.status,
    tags: (event.tags || []).map(t => ({ id: t.id, name: t.name })),
    company_name: event.company ? event.company.company_name : null,
    company_logo: event.company && event.company.company_logo ? event.company.company_logo : null,
    company_description: event.company ? event.company.company_description : null,
    visible_address: event.getVisibleAddress(),
    visible_online: event.getVisibleOnline(),
    created_at: event.created_at,
    // Champs complets (pour my-events company)
    address_full: event.address_full,
    address_city: event.address_city,
    address_country: event.address_country,
    address_visibility: event.address_visibility,
    address_reveal_date: event.address_reveal_date,
    online_platform: event.online_platform,
    online_link: event.online_link,
    online_visibility: event.online_visibility,
    online_reveal_date: event.online_reveal_date,
  };
}

const EVENT_INCLUDES = [
  { association: 'company', attributes: ['id', 'company_name', 'company_logo', 'company_description'] },
  { association: 'tags', attributes: ['id', 'name'], through: { attributes: [] } },
  { association: 'registrations', attributes: ['id', 'status'] },
];

// ─── Liste events publics ─────────────────────────────────────────────────────

async function listEvents(req, res) {
  const {
    format, tags, date_after, date_before, city, country, search,
    ordering, status: statusFilter, page = 1,
  } = req.query;

  const limit = 10;
  const offset = (parseInt(page) - 1) * limit;
  const now = new Date();

  const where = {};

  // Admins voient tous les statuts, sinon uniquement PUBLISHED
  if (req.user && req.user.is_staff) {
    if (statusFilter) where.status = statusFilter;
  } else {
    where.status = 'PUBLISHED';
    where.date_end = { [Op.gt]: now };
  }

  if (format) where.format = format;
  if (city) where.address_city = { [Op.iLike ? Op.iLike : Op.like]: `%${city}%` };
  if (country) where.address_country = { [Op.iLike ? Op.iLike : Op.like]: `%${country}%` };
  if (date_after) where.date_start = { ...(where.date_start || {}), [Op.gte]: new Date(date_after) };
  if (date_before) where.date_start = { ...(where.date_start || {}), [Op.lte]: new Date(date_before) };
  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }

  // Filtrage par tags (au moins un des tags)
  const include = [...EVENT_INCLUDES];
  if (tags) {
    const tagIds = (Array.isArray(tags) ? tags : [tags]).map(Number).filter(Boolean);
    if (tagIds.length > 0) {
      include[1] = {
        association: 'tags',
        attributes: ['id', 'name'],
        through: { attributes: [] },
        where: { id: { [Op.in]: tagIds } },
        required: true,
      };
    }
  }

  // Ordering
  let order = [['date_start', 'ASC']];
  if (ordering) {
    const desc = ordering.startsWith('-');
    const field = desc ? ordering.slice(1) : ordering;
    const allowed = ['date_start', 'date_end', 'capacity', 'created_at'];
    if (allowed.includes(field)) {
      order = [[field, desc ? 'DESC' : 'ASC']];
    }
  }

  const { count, rows } = await Event.findAndCountAll({
    where,
    include,
    order,
    limit,
    offset,
    distinct: true,
  });

  const results = rows.map(event => {
    const confirmedCount = (event.registrations || []).filter(r => r.status === 'CONFIRMED').length;
    return buildEventListItem(event, confirmedCount);
  });

  const baseUrl = '/api/events/';
  return res.json({
    count,
    next: offset + limit < count ? `${baseUrl}?page=${parseInt(page) + 1}` : null,
    previous: parseInt(page) > 1 ? `${baseUrl}?page=${parseInt(page) - 1}` : null,
    results,
  });
}

// ─── Détail event ─────────────────────────────────────────────────────────────

async function getEvent(req, res) {
  const event = await Event.findOne({
    where: { id: req.params.id, status: 'PUBLISHED' },
    include: EVENT_INCLUDES,
  });

  if (!event) return res.status(404).json({ error: 'Événement introuvable.' });

  // Incrémenter le compteur de vues
  await Event.update({ view_count: literal('view_count + 1') }, { where: { id: event.id } });
  await event.reload({ include: EVENT_INCLUDES });

  return res.json(buildEventDetail(event));
}

// ─── Créer un event ────────────────────────────────────────────────────────────

async function createEvent(req, res) {
  const user = req.user;

  if (user.verification_status !== 'VERIFIED') {
    return res.status(403).json({
      error: "Votre compte entreprise n'est pas encore vérifié. Vous pourrez créer des événements une fois votre compte validé.",
    });
  }

  const {
    title, description, date_start, date_end, capacity,
    unlimited_capacity = false,
    status = 'DRAFT', format = 'ONSITE', registration_mode = 'AUTO',
    registration_deadline,
    allow_registration_during_event = false,
    address_full, address_city, address_country,
    address_visibility = 'FULL', address_reveal_date,
    online_platform, online_link,
    online_visibility = 'FULL', online_reveal_date,
    tag_ids,
  } = req.body;

  const isUnlimited = unlimited_capacity === true || unlimited_capacity === 'true';
  if (!title || !description || !date_start || !date_end || (!isUnlimited && !capacity)) {
    return res.status(400).json({ error: 'Les champs title, description, date_start, date_end sont requis. capacity est requis si unlimited_capacity est false.' });
  }

  if (new Date(date_end) <= new Date(date_start)) {
    return res.status(400).json({ date_end: 'La date de fin doit être après la date de début.' });
  }

  // Validation champs selon format
  if (['ONSITE', 'HYBRID'].includes(format)) {
    if (!address_city) return res.status(400).json({ address_city: 'La ville est requise pour un event en présentiel.' });
    if (!address_country) return res.status(400).json({ address_country: 'Le pays est requis pour un event en présentiel.' });
    if (!address_full) return res.status(400).json({ address_full: "L'adresse complète est requise pour un event en présentiel." });
  }
  if (['ONLINE', 'HYBRID'].includes(format)) {
    if (!online_platform) return res.status(400).json({ online_platform: 'La plateforme est requise pour un event en ligne.' });
  }

  const eventData = {
    company_id: user.id,
    title, description,
    date_start, date_end,
    capacity: isUnlimited ? null : parseInt(capacity),
    unlimited_capacity: isUnlimited,
    status, format, registration_mode,
    registration_deadline: registration_deadline || null,
    allow_registration_during_event: allow_registration_during_event === true || allow_registration_during_event === 'true',
    address_full: address_full || '',
    address_city: address_city || '',
    address_country: address_country || '',
    address_visibility,
    address_reveal_date: address_reveal_date || null,
    online_platform: online_platform || '',
    online_link: online_link || '',
    online_visibility,
    online_reveal_date: online_reveal_date || null,
  };

  if (req.file) eventData.banner = `/media/banners/${req.file.filename}`;

  const event = await Event.create(eventData);

  // Tags
  if (tag_ids) {
    const ids = (Array.isArray(tag_ids) ? tag_ids : [tag_ids]).map(Number).filter(Boolean);
    const tags = await Tag.findAll({ where: { id: ids } });
    await event.setTags(tags);
  }

  await event.reload({ include: EVENT_INCLUDES });
  return res.status(201).json(buildEventDetail(event));
}

// ─── Modifier un event ────────────────────────────────────────────────────────

async function updateEvent(req, res) {
  const event = await Event.findOne({
    where: { id: req.params.id, company_id: req.user.id },
    include: EVENT_INCLUDES,
  });
  if (!event) return res.status(404).json({ error: 'Événement introuvable ou non autorisé.' });

  const {
    title, description, date_start, date_end, capacity,
    status, format, registration_mode, registration_deadline,
    address_full, address_city, address_country,
    address_visibility, address_reveal_date,
    online_platform, online_link, online_visibility, online_reveal_date,
    tag_ids,
  } = req.body;

  // Validation dates
  const newStart = date_start ? new Date(date_start) : event.date_start;
  const newEnd = date_end ? new Date(date_end) : event.date_end;
  if (newEnd <= newStart) {
    return res.status(400).json({ date_end: 'La date de fin doit être après la date de début.' });
  }

  // Validation format
  const newFormat = format || event.format;
  if (['ONSITE', 'HYBRID'].includes(newFormat)) {
    const city = address_city !== undefined ? address_city : event.address_city;
    const country = address_country !== undefined ? address_country : event.address_country;
    const full = address_full !== undefined ? address_full : event.address_full;
    if (!city) return res.status(400).json({ address_city: 'La ville est requise pour un event en présentiel.' });
    if (!country) return res.status(400).json({ address_country: 'Le pays est requis pour un event en présentiel.' });
    if (!full) return res.status(400).json({ address_full: "L'adresse complète est requise pour un event en présentiel." });
  }
  if (['ONLINE', 'HYBRID'].includes(newFormat)) {
    const platform = online_platform !== undefined ? online_platform : event.online_platform;
    if (!platform) return res.status(400).json({ online_platform: 'La plateforme est requise pour un event en ligne.' });
  }

  const oldStatus = event.status;
  const previousSnapshot = captureEventNotificationSnapshot(event);

  const updates = {};
  const fields = [
    'title', 'description', 'date_start', 'date_end',
    'status', 'format', 'registration_mode', 'registration_deadline',
    'allow_registration_during_event',
    'address_full', 'address_city', 'address_country',
    'address_visibility', 'address_reveal_date',
    'online_platform', 'online_link', 'online_visibility', 'online_reveal_date',
  ];
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  // Gérer unlimited_capacity + capacity ensemble
  if (req.body.unlimited_capacity !== undefined) {
    const isUnlimited = req.body.unlimited_capacity === true || req.body.unlimited_capacity === 'true';
    updates.unlimited_capacity = isUnlimited;
    if (isUnlimited) {
      updates.capacity = null;
    } else if (capacity !== undefined) {
      updates.capacity = parseInt(capacity);
    }
  } else if (capacity !== undefined) {
    updates.capacity = parseInt(capacity);
  }
  if (req.file) updates.banner = `/media/banners/${req.file.filename}`;

  await event.update(updates);

  if (tag_ids !== undefined) {
    const ids = (Array.isArray(tag_ids) ? tag_ids : [tag_ids]).map(Number).filter(Boolean);
    const tags = await Tag.findAll({ where: { id: ids } });
    await event.setTags(tags);
  }

  // Réinitialiser les flags de notifications si les champs concernés ont changé
  await resetScheduledNotificationFlags(event, previousSnapshot);

  // Notifier si statut → CANCELLED
  if (oldStatus !== 'CANCELLED' && event.status === 'CANCELLED') {
    sendEventCancelled(event).catch(() => {});
  } else {
    // Notifier les participants confirmés des changements pratiques
    const changes = getEventUpdateMessages(previousSnapshot, event);
    if (changes.length > 0) {
      const confirmedRegs = await Registration.findAll({
        where: { event_id: event.id, status: 'CONFIRMED' },
        include: [
          { association: 'participant', attributes: ['id', 'email', 'first_name', 'last_name'] },
          { association: 'event' },
        ],
      });
      for (const reg of confirmedRegs) {
        sendEventUpdated(reg, changes).catch(() => {});
      }
    }
    // Alertes de capacité
    await event.reload({ include: [{ association: 'company', attributes: ['id', 'company_name', 'recovery_email'] }] });
    notifyEventCapacityMilestones(event).catch(() => {});
  }

  await event.reload({ include: EVENT_INCLUDES });
  return res.json(buildEventDetail(event));
}

// ─── Supprimer un event ───────────────────────────────────────────────────────

async function deleteEvent(req, res) {
  const event = await Event.findOne({ where: { id: req.params.id, company_id: req.user.id } });
  if (!event) return res.status(404).json({ error: 'Événement introuvable ou non autorisé.' });
  await event.destroy();
  return res.status(204).send();
}

// ─── Mes events (company) ─────────────────────────────────────────────────────

async function myEvents(req, res) {
  const events = await Event.findAll({
    where: { company_id: req.user.id },
    include: EVENT_INCLUDES,
    order: [['date_start', 'ASC']],
  });

  return res.json(events.map(e => buildEventDetail(e)));
}

// ─── Stats d'un event ─────────────────────────────────────────────────────────

async function eventStats(req, res) {
  const event = await Event.findByPk(req.params.id);
  if (!event) return res.status(404).json({ error: 'Événement introuvable.' });

  const isOwner = req.user.role === 'COMPANY' && event.company_id === req.user.id;
  const isAdmin = req.user.is_staff;
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  const [total, confirmed, pending, rejected, cancelled] = await Promise.all([
    Registration.count({ where: { event_id: event.id } }),
    Registration.count({ where: { event_id: event.id, status: 'CONFIRMED' } }),
    Registration.count({ where: { event_id: event.id, status: 'PENDING' } }),
    Registration.count({ where: { event_id: event.id, status: 'REJECTED' } }),
    Registration.count({ where: { event_id: event.id, status: 'CANCELLED' } }),
  ]);

  const occupationRate = (!event.unlimited_capacity && event.capacity > 0)
    ? Math.round((confirmed / event.capacity) * 100 * 10) / 10
    : null;
  const spotsRemaining = event.unlimited_capacity ? null : (event.capacity - confirmed);

  return res.json({
    event: {
      id: event.id,
      title: event.title,
      status: event.status,
      format: event.format,
      date_start: event.date_start,
      date_end: event.date_end,
      capacity: event.capacity,
      unlimited_capacity: event.unlimited_capacity,
      allow_registration_during_event: event.allow_registration_during_event,
      registration_mode: event.registration_mode,
    },
    registrations: { total, confirmed, pending, rejected, cancelled },
    spots_remaining: spotsRemaining,
    occupation_rate: occupationRate,
  });
}

// ─── Events recommandés (participant) ────────────────────────────────────────

async function recommendedEvents(req, res) {
  const user = await User.findByPk(req.user.id, {
    include: [{ association: 'tags', attributes: ['id'] }],
  });

  const userTagIds = user.tags.map(t => t.id);

  if (userTagIds.length === 0) {
    return res.json({
      message: 'Ajoutez des tags à votre profil pour recevoir des recommandations.',
      results: [],
    });
  }

  const alreadyRegistered = await Registration.findAll({
    where: { participant_id: user.id },
    attributes: ['event_id'],
  });
  const registeredIds = alreadyRegistered.map(r => r.event_id);

  const now = new Date();
  const events = await Event.findAll({
    where: {
      status: 'PUBLISHED',
      date_start: { [Op.gt]: now },
      id: registeredIds.length > 0 ? { [Op.notIn]: registeredIds } : { [Op.ne]: 0 },
    },
    include: [
      {
        association: 'tags',
        attributes: ['id', 'name'],
        through: { attributes: [] },
        where: { id: { [Op.in]: userTagIds } },
        required: true,
      },
      { association: 'company', attributes: ['id', 'company_name', 'company_logo'] },
      { association: 'registrations', attributes: ['id', 'status'] },
    ],
    order: [['date_start', 'ASC']],
  });

  const results = events.map(event => {
    const confirmedCount = (event.registrations || []).filter(r => r.status === 'CONFIRMED').length;
    return buildEventListItem(event, confirmedCount);
  });

  return res.json({ results });
}

// ─── Dashboard stats company ─────────────────────────────────────────────────

async function dashboardStats(req, res) {
  const { QueryTypes } = require('sequelize');
  const user = req.user;
  const now = new Date();

  const [regStats, viewsResult, capacityResult, upcomingCount, pastCount] = await Promise.all([
    sequelize.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN r.status='PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN r.status='CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN r.status='WAITLIST' THEN 1 ELSE 0 END) as waitlist,
        SUM(CASE WHEN r.status='CANCELLED' THEN 1 ELSE 0 END) as cancelled
       FROM registrations r
       JOIN events e ON r.event_id = e.id
       WHERE e.company_id = :userId`,
      { replacements: { userId: user.id }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT COALESCE(SUM(view_count), 0) as total_views FROM events WHERE company_id = :userId`,
      { replacements: { userId: user.id }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT COALESCE(SUM(capacity), 0) as total_capacity FROM events WHERE company_id = :userId`,
      { replacements: { userId: user.id }, type: QueryTypes.SELECT }
    ),
    Event.count({
      where: { company_id: user.id, status: 'PUBLISHED', date_start: { [Op.gte]: now } },
    }),
    Event.count({
      where: { company_id: user.id, date_end: { [Op.lt]: now } },
    }),
  ]);

  const stats = regStats[0];
  const totalViews = parseInt(viewsResult[0].total_views) || 0;
  const totalCapacity = parseInt(capacityResult[0].total_capacity) || 0;
  const confirmed = parseInt(stats.confirmed) || 0;
  const totalRegistrations = parseInt(stats.total) || 0;
  const cancelled = parseInt(stats.cancelled) || 0;

  const avgFillRate = totalCapacity > 0 ? Math.round((confirmed / totalCapacity) * 100 * 10) / 10 : 0;
  const cancellationRate = totalRegistrations > 0 ? Math.round((cancelled / totalRegistrations) * 100 * 10) / 10 : 0;

  return res.json({
    total_views: totalViews,
    total_registrations: totalRegistrations,
    pending_requests: parseInt(stats.pending) || 0,
    confirmed_participants: confirmed,
    waitlist_count: parseInt(stats.waitlist) || 0,
    average_fill_rate: avgFillRate,
    upcoming_events: upcomingCount,
    past_events: pastCount,
    cancellation_rate: cancellationRate,
  });
}

// ─── Export CSV — résumé dashboard ───────────────────────────────────────────

async function exportDashboardSummary(req, res) {
  // Récupérer les métriques via la même logique que dashboardStats
  const { QueryTypes } = require('sequelize');
  const user = req.user;
  const now = new Date();

  const [regStats, viewsResult, capacityResult, upcomingCount, pastCount] = await Promise.all([
    sequelize.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN r.status='PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN r.status='CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN r.status='WAITLIST' THEN 1 ELSE 0 END) as waitlist,
        SUM(CASE WHEN r.status='CANCELLED' THEN 1 ELSE 0 END) as cancelled
       FROM registrations r JOIN events e ON r.event_id = e.id WHERE e.company_id = :userId`,
      { replacements: { userId: user.id }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT COALESCE(SUM(view_count), 0) as total_views FROM events WHERE company_id = :userId`,
      { replacements: { userId: user.id }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT COALESCE(SUM(capacity), 0) as total_capacity FROM events WHERE company_id = :userId`,
      { replacements: { userId: user.id }, type: QueryTypes.SELECT }
    ),
    Event.count({ where: { company_id: user.id, status: 'PUBLISHED', date_start: { [Op.gte]: now } } }),
    Event.count({ where: { company_id: user.id, date_end: { [Op.lt]: now } } }),
  ]);

  const stats = regStats[0];
  const totalViews = parseInt(viewsResult[0].total_views) || 0;
  const totalCapacity = parseInt(capacityResult[0].total_capacity) || 0;
  const confirmed = parseInt(stats.confirmed) || 0;
  const totalReg = parseInt(stats.total) || 0;
  const cancelled = parseInt(stats.cancelled) || 0;
  const avgFillRate = totalCapacity > 0 ? Math.round((confirmed / totalCapacity) * 100 * 10) / 10 : 0;
  const cancellationRate = totalReg > 0 ? Math.round((cancelled / totalReg) * 100 * 10) / 10 : 0;

  const rows = [
    ['Metric', 'Value'],
    ['Total views', totalViews],
    ['Total registrations', totalReg],
    ['Pending requests', parseInt(stats.pending) || 0],
    ['Confirmed participants', confirmed],
    ['Waitlist count', parseInt(stats.waitlist) || 0],
    ['Average fill rate (%)', avgFillRate],
    ['Upcoming events', upcomingCount],
    ['Past events', pastCount],
    ['Cancellation rate (%)', cancellationRate],
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="dashboard_summary.csv"');
  res.write('\ufeff'); // BOM UTF-8
  for (const row of rows) {
    res.write(row.join(';') + '\r\n');
  }
  res.end();
}

// ─── Export CSV — performance events ─────────────────────────────────────────

async function exportDashboardPerformance(req, res) {
  const { QueryTypes } = require('sequelize');
  const user = req.user;

  const events = await sequelize.query(
    `SELECT e.id, e.title, e.status, e.date_start, e.format, e.view_count, e.capacity,
            COUNT(r.id) as total_registrations,
            SUM(CASE WHEN r.status='CONFIRMED' THEN 1 ELSE 0 END) as confirmed_registrations,
            SUM(CASE WHEN r.status='PENDING' THEN 1 ELSE 0 END) as pending_registrations,
            SUM(CASE WHEN r.status='WAITLIST' THEN 1 ELSE 0 END) as waitlist_registrations,
            SUM(CASE WHEN r.status='CANCELLED' THEN 1 ELSE 0 END) as cancelled_registrations
     FROM events e
     LEFT JOIN registrations r ON r.event_id = e.id
     WHERE e.company_id = :userId
     GROUP BY e.id
     ORDER BY e.date_start ASC`,
    { replacements: { userId: user.id }, type: QueryTypes.SELECT }
  );

  const headers = [
    'Event title', 'Status', 'Start date', 'Format', 'Views', 'Capacity',
    'Total registrations', 'Confirmed', 'Pending', 'Waitlist', 'Cancelled',
    'Fill rate (%)', 'Cancellation rate (%)',
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="events_performance.csv"');
  res.write('\ufeff');
  res.write(headers.join(';') + '\r\n');

  for (const e of events) {
    const cap = parseInt(e.capacity) || 0;
    const confirmed = parseInt(e.confirmed_registrations) || 0;
    const totalReg = parseInt(e.total_registrations) || 0;
    const cancelled = parseInt(e.cancelled_registrations) || 0;
    const fillRate = cap > 0 ? Math.round((confirmed / cap) * 100 * 10) / 10 : 0;
    const cancelRate = totalReg > 0 ? Math.round((cancelled / totalReg) * 100 * 10) / 10 : 0;
    const dateStr = new Date(e.date_start).toISOString().slice(0, 16).replace('T', ' ');

    const row = [
      e.title, e.status, dateStr, e.format,
      e.view_count, cap, totalReg, confirmed,
      parseInt(e.pending_registrations) || 0,
      parseInt(e.waitlist_registrations) || 0,
      cancelled, fillRate, cancelRate,
    ];
    res.write(row.join(';') + '\r\n');
  }
  res.end();
}

// ─── Admin — Liste tous les events ───────────────────────────────────────────

async function adminListEvents(req, res) {
  const { format, status: statusFilter, ordering, date_after, date_before } = req.query;

  const where = {};
  if (statusFilter) where.status = statusFilter;
  if (format) where.format = format;
  if (date_after) where.date_start = { ...(where.date_start || {}), [Op.gte]: new Date(date_after) };
  if (date_before) where.date_start = { ...(where.date_start || {}), [Op.lte]: new Date(date_before) };

  let order = [['date_start', 'ASC']];
  if (ordering) {
    const desc = ordering.startsWith('-');
    const field = desc ? ordering.slice(1) : ordering;
    const allowed = ['date_start', 'date_end', 'capacity', 'created_at'];
    if (allowed.includes(field)) order = [[field, desc ? 'DESC' : 'ASC']];
  }

  const events = await Event.findAll({
    where,
    include: EVENT_INCLUDES,
    order,
  });

  const results = events.map(event => {
    const confirmedCount = (event.registrations || []).filter(r => r.status === 'CONFIRMED').length;
    return buildEventListItem(event, confirmedCount);
  });

  return res.json({ count: results.length, results });
}

// ─── Admin — Détail d'un event ────────────────────────────────────────────────

async function adminGetEvent(req, res) {
  const event = await Event.findByPk(req.params.id, { include: EVENT_INCLUDES });
  if (!event) return res.status(404).json({ error: 'Événement introuvable.' });
  return res.json(buildEventDetail(event));
}

// ─── Admin — Supprimer n'importe quel event ───────────────────────────────────

async function adminDeleteEvent(req, res) {
  const event = await Event.findByPk(req.params.id);
  if (!event) return res.status(404).json({ error: 'Événement introuvable.' });
  await event.destroy();
  return res.status(204).send();
}

module.exports = {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  myEvents,
  eventStats,
  recommendedEvents,
  dashboardStats,
  exportDashboardSummary,
  exportDashboardPerformance,
  adminListEvents,
  adminGetEvent,
  adminDeleteEvent,
};

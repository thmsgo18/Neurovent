const db = require('../db/database');
const { sendEventCancelled } = require('../utils/emails');
const {
  PAGE_SIZE,
  paginatedResponse,
  setEventTags,
  serializeEventList,
  serializeEventDetail,
} = require('../utils/helpers');

// ─── Liste events publics (paginée + filtrée) ─────────────────────────────────

exports.listEvents = (req, res) => {
  const {
    format, tags, date_after, date_before, city, country,
    search, ordering, page, status,
  } = req.query;

  const currentPage = Math.max(1, parseInt(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const conditions = [];
  const params = [];

  // Admins voient tous les statuts ; sinon uniquement PUBLISHED
  const isAdmin = req.user && req.user.is_staff;
  if (!isAdmin) {
    conditions.push(`e.status = 'PUBLISHED'`);
  } else if (status) {
    conditions.push(`e.status = ?`);
    params.push(status.toUpperCase());
  }

  if (format) {
    conditions.push(`e.format = ?`);
    params.push(format.toUpperCase());
  }

  if (date_after) {
    conditions.push(`date(e.date_start) >= date(?)`);
    params.push(date_after);
  }

  if (date_before) {
    conditions.push(`date(e.date_start) <= date(?)`);
    params.push(date_before);
  }

  if (city) {
    conditions.push(`lower(e.address_city) LIKE lower(?)`);
    params.push(`%${city}%`);
  }

  if (country) {
    conditions.push(`lower(e.address_country) LIKE lower(?)`);
    params.push(`%${country}%`);
  }

  if (search) {
    conditions.push(`(lower(e.title) LIKE lower(?) OR lower(e.description) LIKE lower(?))`);
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Filtre par tags (OR logic — au moins un tag correspondant)
  let tagJoin = '';
  let tagGroupBy = 'GROUP BY e.id';
  const tagList = tags
    ? (Array.isArray(tags) ? tags : [tags]).map(Number).filter(Boolean)
    : [];

  if (tagList.length > 0) {
    const placeholders = tagList.map(() => '?').join(', ');
    tagJoin = `JOIN event_tags et2 ON et2.event_id = e.id AND et2.tag_id IN (${placeholders})`;
    params.unshift(...tagList); // insérer avant les autres params
    // Reconstruire correctement — les tag params doivent être avant les autres
  }

  // Reconstruction propre avec tags
  const buildQuery = () => {
    const tagParams = tagList;
    const filterParams = [...params.slice(tagList.length)]; // params sans les tags qu'on a mis en tête
    const allParams = [...tagParams, ...filterParams];

    const coreConditions = [];
    const coreParams = [];

    if (!isAdmin) {
      coreConditions.push(`e.status = 'PUBLISHED'`);
    } else if (status) {
      coreConditions.push(`e.status = ?`);
      coreParams.push(status.toUpperCase());
    }
    if (format) { coreConditions.push(`e.format = ?`); coreParams.push(format.toUpperCase()); }
    if (date_after) { coreConditions.push(`date(e.date_start) >= date(?)`); coreParams.push(date_after); }
    if (date_before) { coreConditions.push(`date(e.date_start) <= date(?)`); coreParams.push(date_before); }
    if (city) { coreConditions.push(`lower(e.address_city) LIKE lower(?)`); coreParams.push(`%${city}%`); }
    if (country) { coreConditions.push(`lower(e.address_country) LIKE lower(?)`); coreParams.push(`%${country}%`); }
    if (search) {
      coreConditions.push(`(lower(e.title) LIKE lower(?) OR lower(e.description) LIKE lower(?))`);
      coreParams.push(`%${search}%`, `%${search}%`);
    }

    let tagJoinClause = '';
    if (tagList.length > 0) {
      const ph = tagList.map(() => '?').join(', ');
      tagJoinClause = `JOIN event_tags et2 ON et2.event_id = e.id AND et2.tag_id IN (${ph})`;
    }

    const whereClause = coreConditions.length ? `WHERE ${coreConditions.join(' AND ')}` : '';
    const combinedParams = [...tagList, ...coreParams];

    return { tagJoinClause, whereClause, combinedParams };
  };

  const { tagJoinClause, whereClause, combinedParams } = buildQuery();

  // Tri
  const ALLOWED_ORDER = {
    date_start: 'e.date_start ASC',
    '-date_start': 'e.date_start DESC',
    date_end: 'e.date_end ASC',
    '-date_end': 'e.date_end DESC',
    capacity: 'e.capacity ASC',
    '-capacity': 'e.capacity DESC',
    created_at: 'e.created_at ASC',
    '-created_at': 'e.created_at DESC',
  };
  const orderBy = ALLOWED_ORDER[ordering] || 'e.date_start ASC';

  const countSql = `
    SELECT COUNT(DISTINCT e.id) as cnt FROM events e
    ${tagJoinClause}
    ${whereClause}
  `;
  const dataSql = `
    SELECT DISTINCT e.* FROM events e
    ${tagJoinClause}
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const total = db.prepare(countSql).get(...combinedParams).cnt;
  const events = db.prepare(dataSql).all(...combinedParams, PAGE_SIZE, offset);

  const results = events.map(serializeEventList);
  return res.json(paginatedResponse(results, total, currentPage, req));
};

// ─── Détail event public ──────────────────────────────────────────────────────

exports.getEvent = (req, res) => {
  const event = db.prepare(`SELECT * FROM events WHERE id = ? AND status = 'PUBLISHED'`).get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Événement introuvable.' });
  return res.json(serializeEventDetail(event));
};

// ─── Créer un event (company) ─────────────────────────────────────────────────

exports.createEvent = (req, res) => {
  const body = req.body;
  const company = req.user;

  const err = validateEventBody(body);
  if (err) return res.status(400).json({ error: err });

  const result = db.prepare(`
    INSERT INTO events (
      company_id, title, description, date_start, date_end, capacity,
      status, format, registration_mode, registration_deadline,
      address_full, address_city, address_country, address_visibility, address_reveal_date,
      online_platform, online_link, online_visibility, online_reveal_date
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    company.id,
    body.title,
    body.description || '',
    body.date_start,
    body.date_end,
    body.capacity,
    body.status || 'DRAFT',
    body.format || 'ONSITE',
    body.registration_mode || 'AUTO',
    body.registration_deadline || null,
    body.address_full || '',
    body.address_city || '',
    body.address_country || '',
    body.address_visibility || 'FULL',
    body.address_reveal_date || null,
    body.online_platform || '',
    body.online_link || '',
    body.online_visibility || 'FULL',
    body.online_reveal_date || null,
  );

  if (req.file) {
    db.prepare('UPDATE events SET banner = ? WHERE id = ?').run(req.file.filename, result.lastInsertRowid);
  }

  if (Array.isArray(body.tag_ids)) {
    setEventTags(result.lastInsertRowid, body.tag_ids);
  }

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(serializeEventDetail(event));
};

// ─── Modifier un event (company owner) ───────────────────────────────────────

exports.updateEvent = async (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Événement introuvable.' });
  if (event.company_id !== req.user.id) return res.status(403).json({ error: 'Vous n\'êtes pas l\'organisateur de cet événement.' });

  const body = req.body;
  const fields = {};

  const allowed = [
    'title', 'description', 'date_start', 'date_end', 'capacity', 'status',
    'format', 'registration_mode', 'registration_deadline',
    'address_full', 'address_city', 'address_country', 'address_visibility', 'address_reveal_date',
    'online_platform', 'online_link', 'online_visibility', 'online_reveal_date',
  ];

  for (const key of allowed) {
    if (body[key] !== undefined) fields[key] = body[key];
  }

  if (req.file) fields.banner = req.file.filename;
  fields.updated_at = new Date().toISOString();

  if (Object.keys(fields).length > 0) {
    const setClause = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE events SET ${setClause} WHERE id = ?`).run(...Object.values(fields), event.id);
  }

  if (Array.isArray(body.tag_ids)) {
    setEventTags(event.id, body.tag_ids);
  }

  // Si le statut vient de passer à CANCELLED → notifier les inscrits
  if (body.status === 'CANCELLED' && event.status !== 'CANCELLED') {
    const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(event.id);
    const activeRegs = db.prepare(`
      SELECT r.*, u.first_name, u.last_name, u.email
      FROM registrations r
      JOIN users u ON u.id = r.participant_id
      WHERE r.event_id = ? AND r.status IN ('CONFIRMED', 'PENDING', 'WAITLIST')
    `).all(event.id);

    const regsWithParticipant = activeRegs.map(r => ({
      ...r,
      participant: { first_name: r.first_name, last_name: r.last_name, email: r.email },
      event: updatedEvent,
    }));

    await sendEventCancelled(updatedEvent, regsWithParticipant);
  }

  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(event.id);
  return res.json(serializeEventDetail(updated));
};

// ─── Supprimer un event (company owner) ──────────────────────────────────────

exports.deleteEvent = (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Événement introuvable.' });
  if (event.company_id !== req.user.id) return res.status(403).json({ error: 'Vous n\'êtes pas l\'organisateur de cet événement.' });

  db.prepare('DELETE FROM events WHERE id = ?').run(event.id);
  return res.status(204).send();
};

// ─── Mes events (company) ─────────────────────────────────────────────────────

exports.myEvents = (req, res) => {
  const events = db.prepare(`
    SELECT * FROM events WHERE company_id = ? ORDER BY date_start
  `).all(req.user.id);
  return res.json(events.map(serializeEventDetail));
};

// ─── Events recommandés (participant) ────────────────────────────────────────

exports.recommendedEvents = (req, res) => {
  const user = req.user;

  const userTagIds = db.prepare(`SELECT tag_id FROM user_tags WHERE user_id = ?`).all(user.id).map(r => r.tag_id);

  if (userTagIds.length === 0) {
    return res.json({
      message: 'Ajoutez des tags à votre profil pour recevoir des recommandations.',
      results: [],
    });
  }

  const placeholders = userTagIds.map(() => '?').join(', ');
  const now = new Date().toISOString();

  const events = db.prepare(`
    SELECT DISTINCT e.* FROM events e
    JOIN event_tags et ON et.event_id = e.id AND et.tag_id IN (${placeholders})
    WHERE e.status = 'PUBLISHED'
      AND e.date_start > ?
      AND e.id NOT IN (
        SELECT event_id FROM registrations WHERE participant_id = ?
      )
    ORDER BY e.date_start
  `).all(...userTagIds, now, user.id);

  return res.json({ results: events.map(serializeEventList) });
};

// ─── Stats d'un event (company owner ou admin) ────────────────────────────────

exports.eventStats = (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Événement introuvable.' });

  const isOwner = req.user.role === 'COMPANY' && event.company_id === req.user.id;
  const isAdmin = Boolean(req.user.is_staff);
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Accès refusé.' });

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN status = 'PENDING'   THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'REJECTED'  THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN status = 'WAITLIST'  THEN 1 ELSE 0 END) as waitlist
    FROM registrations WHERE event_id = ?
  `).get(event.id);

  const confirmed = stats.confirmed || 0;
  const occupationRate = event.capacity > 0 ? Math.round((confirmed / event.capacity) * 1000) / 10 : 0;

  return res.json({
    event: {
      id: event.id,
      title: event.title,
      status: event.status,
      format: event.format,
      date_start: event.date_start,
      date_end: event.date_end,
      capacity: event.capacity,
      registration_mode: event.registration_mode,
    },
    registrations: {
      total: stats.total || 0,
      confirmed,
      pending: stats.pending || 0,
      rejected: stats.rejected || 0,
      cancelled: stats.cancelled || 0,
      waitlist: stats.waitlist || 0,
    },
    spots_remaining: event.capacity - confirmed,
    occupation_rate: occupationRate,
  });
};

// ─── Validation event body ────────────────────────────────────────────────────

function validateEventBody(body) {
  if (!body.title) return 'Le titre est requis.';
  if (!body.date_start) return 'La date de début est requise.';
  if (!body.date_end) return 'La date de fin est requise.';
  if (!body.capacity || body.capacity < 1) return 'La capacité doit être un entier positif.';

  const start = new Date(body.date_start);
  const end = new Date(body.date_end);
  if (isNaN(start.getTime())) return 'date_start invalide.';
  if (isNaN(end.getTime())) return 'date_end invalide.';
  if (end <= start) return 'La date de fin doit être après la date de début.';

  const fmt = (body.format || 'ONSITE').toUpperCase();
  if (!['ONSITE', 'ONLINE', 'HYBRID'].includes(fmt)) return 'Format invalide (ONSITE, ONLINE, HYBRID).';

  if (['ONSITE', 'HYBRID'].includes(fmt)) {
    if (!body.address_city) return `address_city est requis pour le format ${fmt}.`;
    if (!body.address_country) return `address_country est requis pour le format ${fmt}.`;
  }

  if (['ONLINE', 'HYBRID'].includes(fmt)) {
    if (!body.online_platform) return `online_platform est requis pour le format ${fmt}.`;
    if (!body.online_link) return `online_link est requis pour le format ${fmt}.`;
  }

  return null;
}

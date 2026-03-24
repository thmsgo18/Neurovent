const db = require('../db/database');

// ─── Pagination ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

function paginatedResponse(results, total, page, req) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const baseUrl = `${req.protocol}://${req.get('host')}${req.path}`;

  const buildUrl = (p) => {
    const params = new URLSearchParams(req.query);
    params.set('page', p);
    return `${baseUrl}?${params.toString()}`;
  };

  return {
    count: total,
    next: page < totalPages ? buildUrl(page + 1) : null,
    previous: page > 1 ? buildUrl(page - 1) : null,
    results,
  };
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

function getUserTags(userId) {
  return db.prepare(`
    SELECT t.id, t.name FROM tags t
    JOIN user_tags ut ON ut.tag_id = t.id
    WHERE ut.user_id = ?
    ORDER BY t.name
  `).all(userId);
}

function getEventTags(eventId) {
  return db.prepare(`
    SELECT t.id, t.name FROM tags t
    JOIN event_tags et ON et.tag_id = t.id
    WHERE et.event_id = ?
    ORDER BY t.name
  `).all(eventId);
}

function setUserTags(userId, tagIds) {
  db.prepare('DELETE FROM user_tags WHERE user_id = ?').run(userId);
  const insert = db.prepare('INSERT OR IGNORE INTO user_tags (user_id, tag_id) VALUES (?, ?)');
  for (const tagId of tagIds) {
    const tag = db.prepare('SELECT id FROM tags WHERE id = ?').get(tagId);
    if (tag) insert.run(userId, tagId);
  }
}

function setEventTags(eventId, tagIds) {
  db.prepare('DELETE FROM event_tags WHERE event_id = ?').run(eventId);
  const insert = db.prepare('INSERT OR IGNORE INTO event_tags (event_id, tag_id) VALUES (?, ?)');
  for (const tagId of tagIds) {
    const tag = db.prepare('SELECT id FROM tags WHERE id = ?').get(tagId);
    if (tag) insert.run(eventId, tagId);
  }
}

// ─── Visibilité ───────────────────────────────────────────────────────────────

function getVisibleAddress(event) {
  if (!['ONSITE', 'HYBRID'].includes(event.format)) return null;
  const now = new Date();
  const revealPassed = event.address_reveal_date && new Date(event.address_reveal_date) <= now;
  if (event.address_visibility === 'FULL' || revealPassed) {
    return { city: event.address_city, country: event.address_country, full: event.address_full, is_full_revealed: true };
  }
  return { city: event.address_city, country: event.address_country, full: null, is_full_revealed: false };
}

function getVisibleOnline(event) {
  if (!['ONLINE', 'HYBRID'].includes(event.format)) return null;
  const now = new Date();
  const revealPassed = event.online_reveal_date && new Date(event.online_reveal_date) <= now;
  if (event.online_visibility === 'FULL' || revealPassed) {
    return { platform: event.online_platform, link: event.online_link, is_link_revealed: true };
  }
  return { platform: event.online_platform, link: null, is_link_revealed: false };
}

// ─── Propriétés calculées event ───────────────────────────────────────────────

function getSpotsRemaining(eventId, capacity) {
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM registrations WHERE event_id = ? AND status = 'CONFIRMED'`).get(eventId);
  return capacity - (row ? row.cnt : 0);
}

function isRegistrationOpen(event) {
  const now = new Date();
  if (now >= new Date(event.date_start)) return false;
  if (event.registration_deadline && now >= new Date(event.registration_deadline)) return false;
  return true;
}

// ─── Serializers ─────────────────────────────────────────────────────────────

function serializeCompanyBasic(companyId) {
  const c = db.prepare('SELECT id, company_name, company_logo FROM users WHERE id = ?').get(companyId);
  if (!c) return null;
  return {
    id: c.id,
    company_name: c.company_name,
    company_logo: c.company_logo ? `/media/${c.company_logo}` : null,
  };
}

function serializeEventList(event) {
  const spotsRemaining = getSpotsRemaining(event.id, event.capacity);
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    banner: event.banner ? `/media/${event.banner}` : null,
    date_start: event.date_start,
    date_end: event.date_end,
    capacity: event.capacity,
    status: event.status,
    format: event.format,
    registration_mode: event.registration_mode,
    registration_deadline: event.registration_deadline || null,
    tags: getEventTags(event.id),
    company: serializeCompanyBasic(event.company_id),
    spots_remaining: spotsRemaining,
    registration_open: isRegistrationOpen(event),
    is_full: spotsRemaining <= 0,
    created_at: event.created_at,
    updated_at: event.updated_at,
  };
}

function serializeEventDetail(event) {
  return {
    ...serializeEventList(event),
    address_full: event.address_full,
    address_city: event.address_city,
    address_country: event.address_country,
    address_visibility: event.address_visibility,
    address_reveal_date: event.address_reveal_date || null,
    online_platform: event.online_platform,
    online_link: event.online_link,
    online_visibility: event.online_visibility,
    online_reveal_date: event.online_reveal_date || null,
    visible_address: getVisibleAddress(event),
    visible_online: getVisibleOnline(event),
  };
}

function serializeParticipantProfile(user) {
  return {
    id: user.id,
    role: user.role,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    employer_name: user.employer_name,
    tags: getUserTags(user.id),
    date_joined: user.date_joined,
    is_active: Boolean(user.is_active),
  };
}

function serializeCompanyProfile(user) {
  return {
    id: user.id,
    role: user.role,
    company_identifier: user.company_identifier,
    company_name: user.company_name,
    company_logo: user.company_logo ? `/media/${user.company_logo}` : null,
    company_description: user.company_description,
    recovery_email: user.recovery_email,
    website_url: user.website_url,
    youtube_url: user.youtube_url,
    linkedin_url: user.linkedin_url,
    twitter_url: user.twitter_url,
    instagram_url: user.instagram_url,
    facebook_url: user.facebook_url,
    tags: getUserTags(user.id),
    date_joined: user.date_joined,
    is_active: Boolean(user.is_active),
  };
}

function serializeRegistration(reg) {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(reg.event_id);
  const participant = db.prepare('SELECT * FROM users WHERE id = ?').get(reg.participant_id);

  let waitlistPosition = null;
  if (reg.status === 'WAITLIST') {
    const row = db.prepare(`
      SELECT COUNT(*) as cnt FROM registrations
      WHERE event_id = ? AND status = 'WAITLIST' AND created_at < ?
    `).get(reg.event_id, reg.created_at);
    waitlistPosition = (row ? row.cnt : 0) + 1;
  }

  return {
    id: reg.id,
    status: reg.status,
    accessibility_needs: reg.accessibility_needs,
    company_comment: reg.company_comment,
    created_at: reg.created_at,
    updated_at: reg.updated_at,
    waitlist_position: waitlistPosition,
    event_id: reg.event_id,
    event: event ? {
      id: event.id,
      title: event.title,
      date_start: event.date_start,
      date_end: event.date_end,
      format: event.format,
      status: event.status,
    } : null,
    participant_id: reg.participant_id,
    participant: participant ? {
      id: participant.id,
      first_name: participant.first_name,
      last_name: participant.last_name,
      email: participant.email,
      employer_name: participant.employer_name,
    } : null,
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateCompanyIdentifier(identifier) {
  if (!identifier) return "L'identifiant est requis.";
  if (identifier.length < 3) return "L'identifiant doit contenir au moins 3 caractères.";
  if (identifier.length > 50) return "L'identifiant ne peut pas dépasser 50 caractères.";
  if (!/^[a-zA-Z0-9-]+$/.test(identifier)) {
    return "L'identifiant ne peut contenir que des lettres, chiffres et tirets (-). Pas d'espaces.";
  }
  return null;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = {
  PAGE_SIZE,
  paginatedResponse,
  getUserTags,
  getEventTags,
  setUserTags,
  setEventTags,
  getVisibleAddress,
  getVisibleOnline,
  getSpotsRemaining,
  isRegistrationOpen,
  serializeEventList,
  serializeEventDetail,
  serializeCompanyBasic,
  serializeParticipantProfile,
  serializeCompanyProfile,
  serializeRegistration,
  validateCompanyIdentifier,
  isValidEmail,
};

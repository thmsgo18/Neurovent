const db = require('../db/database');
const {
  sendRegistrationConfirmed,
  sendRegistrationRejected,
  sendEventCancelled,
} = require('../utils/emails');
const { serializeRegistration, PAGE_SIZE, paginatedResponse } = require('../utils/helpers');

// ─── Promotion liste d'attente ────────────────────────────────────────────────

async function promoteFromWaitlist(eventId) {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) return null;

  const confirmedCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM registrations WHERE event_id = ? AND status = 'CONFIRMED'
  `).get(eventId).cnt;

  if (confirmedCount < event.capacity) {
    const next = db.prepare(`
      SELECT * FROM registrations
      WHERE event_id = ? AND status = 'WAITLIST'
      ORDER BY created_at ASC
      LIMIT 1
    `).get(eventId);

    if (next) {
      db.prepare(`
        UPDATE registrations SET status = 'CONFIRMED', updated_at = ? WHERE id = ?
      `).run(new Date().toISOString(), next.id);

      const updated = db.prepare('SELECT * FROM registrations WHERE id = ?').get(next.id);
      const participant = db.prepare('SELECT * FROM users WHERE id = ?').get(updated.participant_id);
      await sendRegistrationConfirmed({ ...updated, participant, event }, true);
      return updated;
    }
  }
  return null;
}

// ─── Inscription à un event (participant) ────────────────────────────────────

exports.registerToEvent = async (req, res) => {
  const { event: eventId, accessibility_needs } = req.body;
  const user = req.user;

  if (!eventId) return res.status(400).json({ error: 'Le champ event est requis.' });

  const event = db.prepare(`SELECT * FROM events WHERE id = ? AND status = 'PUBLISHED'`).get(eventId);
  if (!event) return res.status(404).json({ error: "Événement introuvable ou non publié." });

  const now = new Date();

  // Vérifier la date limite
  if (event.registration_deadline && now > new Date(event.registration_deadline)) {
    return res.status(400).json({ error: 'Les inscriptions pour cet événement sont closes.' });
  }

  // Vérifier que l'event n'a pas commencé
  if (now >= new Date(event.date_start)) {
    return res.status(400).json({ error: 'Cet événement a déjà commencé.' });
  }

  // Vérifier si une inscription active existe déjà
  const existingActive = db.prepare(`
    SELECT * FROM registrations
    WHERE participant_id = ? AND event_id = ? AND status IN ('PENDING', 'CONFIRMED', 'WAITLIST')
  `).get(user.id, eventId);

  if (existingActive) {
    return res.status(400).json({ error: 'Vous êtes déjà inscrit à cet événement.' });
  }

  // Calculer le statut cible
  const confirmedCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM registrations WHERE event_id = ? AND status = 'CONFIRMED'
  `).get(eventId).cnt;
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
  const existingInactive = db.prepare(`
    SELECT * FROM registrations
    WHERE participant_id = ? AND event_id = ? AND status IN ('CANCELLED', 'REJECTED')
  `).get(user.id, eventId);

  let registration;
  const nowIso = now.toISOString();

  if (existingInactive) {
    db.prepare(`
      UPDATE registrations
      SET status = ?, accessibility_needs = ?, company_comment = '', updated_at = ?
      WHERE id = ?
    `).run(newStatus, accessibility_needs || existingInactive.accessibility_needs || '', nowIso, existingInactive.id);
    registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(existingInactive.id);
  } else {
    const result = db.prepare(`
      INSERT INTO registrations (participant_id, event_id, status, accessibility_needs)
      VALUES (?, ?, ?, ?)
    `).run(user.id, eventId, newStatus, accessibility_needs || '');
    registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(result.lastInsertRowid);
  }

  // Notifier si confirmation immédiate
  if (newStatus === 'CONFIRMED') {
    await sendRegistrationConfirmed({ ...registration, participant: user, event });
  }

  return res.status(201).json(serializeRegistration(registration));
};

// ─── Mes inscriptions (participant) ──────────────────────────────────────────

exports.myRegistrations = (req, res) => {
  const { status, page } = req.query;
  const currentPage = Math.max(1, parseInt(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  let sql = `SELECT * FROM registrations WHERE participant_id = ?`;
  const params = [req.user.id];

  if (status) {
    sql += ` AND status = ?`;
    params.push(status.toUpperCase());
  }

  const total = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) as cnt')).get(...params).cnt;
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const regs = db.prepare(sql).all(...params, PAGE_SIZE, offset);

  return res.json(paginatedResponse(regs.map(serializeRegistration), total, currentPage, req));
};

// ─── Annuler une inscription (participant) ────────────────────────────────────

exports.cancelRegistration = async (req, res) => {
  const reg = db.prepare(`
    SELECT * FROM registrations WHERE id = ? AND participant_id = ?
  `).get(req.params.id, req.user.id);

  if (!reg) return res.status(404).json({ error: 'Inscription introuvable.' });
  if (['CANCELLED', 'REJECTED'].includes(reg.status)) {
    return res.status(400).json({ error: 'Cette inscription est déjà annulée ou rejetée.' });
  }

  db.prepare(`UPDATE registrations SET status = 'CANCELLED', updated_at = ? WHERE id = ?`).run(new Date().toISOString(), reg.id);

  // Promouvoir le premier en liste d'attente
  await promoteFromWaitlist(reg.event_id);

  const updated = db.prepare('SELECT * FROM registrations WHERE id = ?').get(reg.id);
  return res.json(serializeRegistration(updated));
};

// ─── Inscriptions d'un event (company) ───────────────────────────────────────

exports.eventRegistrations = (req, res) => {
  const { event_id } = req.params;
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id);
  if (!event) return res.status(404).json({ error: 'Événement introuvable.' });
  if (event.company_id !== req.user.id) {
    return res.status(403).json({ error: "Vous n'êtes pas l'organisateur de cet événement." });
  }

  const regs = db.prepare(`
    SELECT * FROM registrations WHERE event_id = ? ORDER BY status, created_at
  `).all(event_id);

  return res.json(regs.map(serializeRegistration));
};

// ─── Changer le statut d'une inscription (company/admin) ─────────────────────

exports.updateRegistrationStatus = async (req, res) => {
  const { status, company_comment } = req.body;

  if (!status || !['CONFIRMED', 'REJECTED'].includes(status.toUpperCase())) {
    return res.status(400).json({ error: 'status doit être CONFIRMED ou REJECTED.' });
  }

  let reg;
  if (req.user.is_staff) {
    reg = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
  } else {
    // Company : uniquement ses propres events
    reg = db.prepare(`
      SELECT r.* FROM registrations r
      JOIN events e ON e.id = r.event_id
      WHERE r.id = ? AND e.company_id = ?
    `).get(req.params.id, req.user.id);
  }

  if (!reg) return res.status(404).json({ error: 'Inscription introuvable.' });

  const newStatus = status.toUpperCase();
  const fields = { status: newStatus, updated_at: new Date().toISOString() };
  if (company_comment !== undefined) fields.company_comment = company_comment;

  const setClause = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE registrations SET ${setClause} WHERE id = ?`).run(...Object.values(fields), reg.id);

  const updated = db.prepare('SELECT * FROM registrations WHERE id = ?').get(reg.id);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(updated.event_id);
  const participant = db.prepare('SELECT * FROM users WHERE id = ?').get(updated.participant_id);

  if (newStatus === 'CONFIRMED') {
    await sendRegistrationConfirmed({ ...updated, participant, event });
  } else if (newStatus === 'REJECTED') {
    await sendRegistrationRejected({ ...updated, participant, event });
    await promoteFromWaitlist(updated.event_id);
  }

  return res.json(serializeRegistration(updated));
};

// ─── Export CSV des inscrits (company owner ou admin) ────────────────────────

exports.exportRegistrations = (req, res) => {
  const { event_id } = req.params;
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id);
  if (!event) return res.status(404).json({ error: 'Événement introuvable.' });

  const isOwner = req.user.role === 'COMPANY' && event.company_id === req.user.id;
  const isAdmin = Boolean(req.user.is_staff);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: "Vous n'êtes pas autorisé à exporter ces données." });
  }

  const regs = db.prepare(`
    SELECT r.*, u.first_name, u.last_name, u.email
    FROM registrations r
    JOIN users u ON u.id = r.participant_id
    WHERE r.event_id = ?
    ORDER BY r.status, r.created_at
  `).all(event_id);

  const statusLabels = {
    PENDING: 'En attente',
    CONFIRMED: 'Confirmé',
    REJECTED: 'Rejeté',
    CANCELLED: 'Annulé',
    WAITLIST: "Liste d'attente",
  };

  const safeName = event.title.substring(0, 30).replace(/\s+/g, '_');
  const filename = `inscrits_${event.id}_${safeName}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // BOM UTF-8 pour compatibilité Excel
  let csv = '\uFEFF';
  csv += `Prénom;Nom;Email;Statut;Position liste d'attente;Besoins accessibilité;Commentaire organisateur;Date d'inscription\n`;

  for (const reg of regs) {
    let waitlistPos = '';
    if (reg.status === 'WAITLIST') {
      const pos = db.prepare(`
        SELECT COUNT(*) as cnt FROM registrations
        WHERE event_id = ? AND status = 'WAITLIST' AND created_at < ?
      `).get(event_id, reg.created_at);
      waitlistPos = (pos.cnt + 1).toString();
    }

    const dateStr = new Date(reg.created_at).toLocaleDateString('fr-FR') + ' ' +
      new Date(reg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const cols = [
      reg.first_name || '',
      reg.last_name || '',
      reg.email || '',
      statusLabels[reg.status] || reg.status,
      waitlistPos,
      (reg.accessibility_needs || '').replace(/;/g, ','),
      (reg.company_comment || '').replace(/;/g, ','),
      dateStr,
    ];
    csv += cols.join(';') + '\n';
  }

  return res.send(csv);
};

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db/database');
const { generateTokens, verifyToken } = require('../utils/jwt');
const { sendPasswordReset } = require('../utils/emails');
const {
  serializeParticipantProfile,
  serializeCompanyProfile,
  setUserTags,
  validateCompanyIdentifier,
  isValidEmail,
  PAGE_SIZE,
} = require('../utils/helpers');

// ─── Inscription participant ──────────────────────────────────────────────────

exports.registerParticipant = (req, res) => {
  const { email, password, password_confirm, first_name, last_name, employer_name } = req.body;

  if (!email || !password || !password_confirm || !first_name || !last_name) {
    return res.status(400).json({ error: 'Champs requis : email, password, password_confirm, first_name, last_name.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }
  if (password !== password_confirm) {
    return res.status(400).json({ error: 'Les mots de passe ne correspondent pas.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Un compte avec cet email existe déjà.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (role, email, password_hash, first_name, last_name, employer_name)
    VALUES ('PARTICIPANT', ?, ?, ?, ?, ?)
  `).run(email.toLowerCase(), hash, first_name, last_name, employer_name || '');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(serializeParticipantProfile(user));
};

// ─── Inscription company ──────────────────────────────────────────────────────

exports.registerCompany = (req, res) => {
  const { company_identifier, password, password_confirm, company_name, recovery_email } = req.body;

  if (!company_identifier || !password || !password_confirm || !company_name || !recovery_email) {
    return res.status(400).json({ error: 'Champs requis : company_identifier, password, password_confirm, company_name, recovery_email.' });
  }

  const identError = validateCompanyIdentifier(company_identifier);
  if (identError) return res.status(400).json({ error: identError });

  if (!isValidEmail(recovery_email)) {
    return res.status(400).json({ error: 'Adresse recovery_email invalide.' });
  }
  if (password !== password_confirm) {
    return res.status(400).json({ error: 'Les mots de passe ne correspondent pas.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE company_identifier = ?').get(company_identifier);
  if (existing) {
    return res.status(400).json({ error: 'Cet identifiant est déjà utilisé.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (role, company_identifier, password_hash, company_name, recovery_email)
    VALUES ('COMPANY', ?, ?, ?, ?)
  `).run(company_identifier, hash, company_name, recovery_email.toLowerCase());

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(serializeCompanyProfile(user));
};

// ─── Login participant ────────────────────────────────────────────────────────

exports.loginParticipant = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  const user = db.prepare(`SELECT * FROM users WHERE email = ? AND role = 'PARTICIPANT'`).get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(400).json({ error: 'Email ou mot de passe incorrect.' });
  }
  if (!user.is_active) {
    return res.status(403).json({ error: 'Ce compte est désactivé.' });
  }

  const tokens = generateTokens(user);
  return res.json(tokens);
};

// ─── Login company ────────────────────────────────────────────────────────────

exports.loginCompany = (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
  }

  const user = db.prepare(`SELECT * FROM users WHERE company_identifier = ? AND role = 'COMPANY'`).get(identifier);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(400).json({ error: 'Identifiant ou mot de passe incorrect.' });
  }
  if (!user.is_active) {
    return res.status(403).json({ error: 'Ce compte est désactivé.' });
  }

  const tokens = generateTokens(user);
  return res.json(tokens);
};

// ─── Refresh token ────────────────────────────────────────────────────────────

exports.refreshToken = (req, res) => {
  const { refresh } = req.body;
  if (!refresh) {
    return res.status(400).json({ error: 'Le refresh token est requis.' });
  }

  try {
    const payload = verifyToken(refresh);
    if (payload.type !== 'refresh') {
      return res.status(400).json({ error: 'Token invalide.' });
    }

    const blacklisted = db.prepare('SELECT id FROM token_blacklist WHERE jti = ?').get(payload.jti);
    if (blacklisted) {
      return res.status(401).json({ error: 'Token révoqué. Veuillez vous reconnecter.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(payload.user_id);
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable ou désactivé.' });
    }

    // Blacklister l'ancien refresh token (rotation)
    db.prepare('INSERT OR IGNORE INTO token_blacklist (jti) VALUES (?)').run(payload.jti);

    const tokens = generateTokens(user);
    return res.json(tokens);
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────

exports.logout = (req, res) => {
  const { refresh } = req.body;
  if (!refresh) {
    return res.status(400).json({ error: 'Le refresh token est requis.' });
  }

  try {
    const payload = verifyToken(refresh);
    if (payload.type !== 'refresh') {
      return res.status(400).json({ error: 'Token invalide.' });
    }
    db.prepare('INSERT OR IGNORE INTO token_blacklist (jti) VALUES (?)').run(payload.jti);
    return res.json({ message: 'Déconnexion réussie.' });
  } catch {
    return res.status(400).json({ error: 'Token invalide ou déjà blacklisté.' });
  }
};

// ─── Profil ───────────────────────────────────────────────────────────────────

exports.getProfile = (req, res) => {
  const user = req.user;
  if (user.role === 'PARTICIPANT') return res.json(serializeParticipantProfile(user));
  if (user.role === 'COMPANY') return res.json(serializeCompanyProfile(user));
  return res.json({ id: user.id, role: user.role, email: user.email, is_staff: Boolean(user.is_staff) });
};

exports.updateProfile = (req, res) => {
  const user = req.user;
  const body = req.body;

  if (user.role === 'PARTICIPANT') {
    const fields = {};
    if (body.first_name !== undefined) fields.first_name = body.first_name;
    if (body.last_name !== undefined) fields.last_name = body.last_name;
    if (body.employer_name !== undefined) fields.employer_name = body.employer_name;
    if (body.email !== undefined) {
      if (!isValidEmail(body.email)) return res.status(400).json({ error: 'Email invalide.' });
      const exists = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(body.email.toLowerCase(), user.id);
      if (exists) return res.status(400).json({ error: 'Cet email est déjà utilisé.' });
      fields.email = body.email.toLowerCase();
    }

    if (Object.keys(fields).length > 0) {
      const setClause = Object.keys(fields).map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).run(...Object.values(fields), user.id);
    }

    if (Array.isArray(body.tag_ids)) {
      setUserTags(user.id, body.tag_ids);
    }

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    return res.json(serializeParticipantProfile(updated));
  }

  if (user.role === 'COMPANY') {
    const fields = {};
    if (body.company_name !== undefined) fields.company_name = body.company_name;
    if (body.company_description !== undefined) fields.company_description = body.company_description;
    if (body.recovery_email !== undefined) {
      if (!isValidEmail(body.recovery_email)) return res.status(400).json({ error: 'recovery_email invalide.' });
      fields.recovery_email = body.recovery_email.toLowerCase();
    }
    if (body.website_url !== undefined) fields.website_url = body.website_url;
    if (body.youtube_url !== undefined) fields.youtube_url = body.youtube_url;
    if (body.linkedin_url !== undefined) fields.linkedin_url = body.linkedin_url;
    if (body.twitter_url !== undefined) fields.twitter_url = body.twitter_url;
    if (body.instagram_url !== undefined) fields.instagram_url = body.instagram_url;
    if (body.facebook_url !== undefined) fields.facebook_url = body.facebook_url;

    // Upload logo (fichier multer)
    if (req.file) {
      fields.company_logo = req.file.filename;
    }

    if (Object.keys(fields).length > 0) {
      const setClause = Object.keys(fields).map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).run(...Object.values(fields), user.id);
    }

    if (Array.isArray(body.tag_ids)) {
      setUserTags(user.id, body.tag_ids);
    }

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    return res.json(serializeCompanyProfile(updated));
  }

  return res.status(400).json({ error: 'Rôle non supporté.' });
};

// ─── Suppression compte RGPD ──────────────────────────────────────────────────

exports.deleteAccount = (req, res) => {
  const user = req.user;
  const now = new Date().toISOString();

  // Annuler les inscriptions futures (PENDING + CONFIRMED)
  db.prepare(`
    UPDATE registrations SET status = 'CANCELLED'
    WHERE participant_id = ?
      AND status IN ('PENDING', 'CONFIRMED')
      AND event_id IN (SELECT id FROM events WHERE date_start > ?)
  `).run(user.id, now);

  // Anonymiser selon le rôle
  if (user.role === 'PARTICIPANT') {
    db.prepare(`
      UPDATE users SET
        email = ?, first_name = '[Supprimé]', last_name = '[Supprimé]',
        employer_name = '', is_active = 0
      WHERE id = ?
    `).run(`deleted_${user.id}@deleted.neurovent.com`, user.id);
  } else if (user.role === 'COMPANY') {
    db.prepare(`
      UPDATE users SET
        company_name = '[Entreprise supprimée]', company_description = '',
        recovery_email = '', website_url = '', youtube_url = '',
        linkedin_url = '', twitter_url = '', instagram_url = '',
        facebook_url = '', is_active = 0
      WHERE id = ?
    `).run(user.id);
  }

  return res.json({ message: 'Compte supprimé avec succès.' });
};

// ─── Changement de mot de passe ───────────────────────────────────────────────

exports.changePassword = (req, res) => {
  const { current_password, new_password, new_password_confirm } = req.body;
  if (!current_password || !new_password || !new_password_confirm) {
    return res.status(400).json({ error: 'Champs requis : current_password, new_password, new_password_confirm.' });
  }
  if (!bcrypt.compareSync(current_password, req.user.password_hash)) {
    return res.status(400).json({ error: 'Mot de passe actuel incorrect.' });
  }
  if (new_password !== new_password_confirm) {
    return res.status(400).json({ error: 'Les nouveaux mots de passe ne correspondent pas.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
  }

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  return res.json({ message: 'Mot de passe modifié avec succès.' });
};

// ─── Reset mot de passe ───────────────────────────────────────────────────────

exports.passwordResetRequest = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  // Toujours retourner 200 (anti-énumération)
  let user = db.prepare(`SELECT * FROM users WHERE email = ? AND role = 'PARTICIPANT' AND is_active = 1`).get(email.toLowerCase());
  if (!user) {
    user = db.prepare(`SELECT * FROM users WHERE recovery_email = ? AND role = 'COMPANY' AND is_active = 1`).get(email.toLowerCase());
  }

  if (user) {
    // Supprimer les anciens tokens pour cet user
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);
    const token = crypto.randomUUID();
    db.prepare('INSERT INTO password_reset_tokens (user_id, token) VALUES (?, ?)').run(user.id, token);
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${user.id}/${token}/`;
    await sendPasswordReset(email.toLowerCase(), resetLink);
  }

  return res.json({ message: "Si cet email est associé à un compte, un lien de réinitialisation a été envoyé." });
};

exports.passwordResetConfirm = (req, res) => {
  const { uid, token, new_password, new_password_confirm } = req.body;
  if (!uid || !token || !new_password || !new_password_confirm) {
    return res.status(400).json({ error: 'Champs requis : uid, token, new_password, new_password_confirm.' });
  }
  if (new_password !== new_password_confirm) {
    return res.status(400).json({ error: 'Les mots de passe ne correspondent pas.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
  }

  const record = db.prepare('SELECT * FROM password_reset_tokens WHERE user_id = ? AND token = ?').get(uid, token);
  if (!record) return res.status(400).json({ error: 'Lien invalide.' });

  // Vérifier expiration (24h)
  const created = new Date(record.created_at);
  if (Date.now() - created.getTime() > 24 * 60 * 60 * 1000) {
    db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').run(record.id);
    return res.status(400).json({ error: 'Lien invalide ou expiré.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
  if (!user) return res.status(400).json({ error: 'Lien invalide.' });

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').run(record.id);

  return res.json({ message: 'Mot de passe réinitialisé avec succès.' });
};

// ─── Admin — liste utilisateurs ───────────────────────────────────────────────

exports.adminUserList = (req, res) => {
  const { role, is_active, page } = req.query;
  const currentPage = Math.max(1, parseInt(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  let where = `role != 'ADMIN'`;
  const params = [];

  if (role && ['PARTICIPANT', 'COMPANY'].includes(role)) {
    where += ` AND role = ?`;
    params.push(role);
  }
  if (is_active !== undefined) {
    where += ` AND is_active = ?`;
    params.push(is_active.toLowerCase() === 'true' ? 1 : 0);
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM users WHERE ${where}`).get(...params).cnt;
  const users = db.prepare(`SELECT * FROM users WHERE ${where} ORDER BY date_joined LIMIT ? OFFSET ?`).all(...params, PAGE_SIZE, offset);

  const results = users.map(u => ({
    id: u.id,
    role: u.role,
    is_active: Boolean(u.is_active),
    is_staff: Boolean(u.is_staff),
    date_joined: u.date_joined,
    name: u.role === 'COMPANY' ? u.company_name : `${u.first_name} ${u.last_name}`.trim(),
    email: u.email,
    company_identifier: u.company_identifier,
    company_name: u.company_name,
    first_name: u.first_name,
    last_name: u.last_name,
  }));

  const { paginatedResponse } = require('../utils/helpers');
  return res.json(paginatedResponse(results, total, currentPage, req));
};

// ─── Admin — supprimer un user (RGPD) ─────────────────────────────────────────

exports.adminDeleteUser = (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  if (user.role === 'ADMIN') return res.status(403).json({ error: 'Impossible de supprimer un admin.' });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE registrations SET status = 'CANCELLED'
    WHERE participant_id = ?
      AND status IN ('PENDING', 'CONFIRMED')
      AND event_id IN (SELECT id FROM events WHERE date_start > ?)
  `).run(user.id, now);

  if (user.role === 'PARTICIPANT') {
    db.prepare(`
      UPDATE users SET email = ?, first_name = '[Supprimé]', last_name = '[Supprimé]',
      employer_name = '', is_active = 0 WHERE id = ?
    `).run(`deleted_${user.id}@deleted.neurovent.com`, user.id);
  } else {
    db.prepare(`
      UPDATE users SET company_name = '[Entreprise supprimée]', company_description = '',
      recovery_email = '', website_url = '', youtube_url = '', linkedin_url = '',
      twitter_url = '', instagram_url = '', facebook_url = '', is_active = 0 WHERE id = ?
    `).run(user.id);
  }

  return res.json({ message: `Compte ${id} supprimé avec succès.` });
};

// ─── Admin — suspendre ────────────────────────────────────────────────────────

exports.adminSuspendUser = (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  if (user.role === 'ADMIN') return res.status(403).json({ error: 'Impossible de suspendre un admin.' });
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
  return res.json({ message: `Compte ${id} suspendu avec succès.` });
};

// ─── Admin — réactiver ────────────────────────────────────────────────────────

exports.adminActivateUser = (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  db.prepare('UPDATE users SET is_active = 1 WHERE id = ?').run(id);
  return res.json({ message: `Compte ${id} réactivé avec succès.` });
};

// ─── Admin — statistiques globales ───────────────────────────────────────────

exports.adminStats = (req, res) => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const totalParticipants = db.prepare(`SELECT COUNT(*) as cnt FROM users WHERE role = 'PARTICIPANT'`).get().cnt;
  const totalCompanies = db.prepare(`SELECT COUNT(*) as cnt FROM users WHERE role = 'COMPANY'`).get().cnt;
  const newUsersThisMonth = db.prepare(`SELECT COUNT(*) as cnt FROM users WHERE date_joined >= ?`).get(firstDayOfMonth).cnt;

  const totalEvents = db.prepare(`SELECT COUNT(*) as cnt FROM events`).get().cnt;
  const eventsPublished = db.prepare(`SELECT COUNT(*) as cnt FROM events WHERE status = 'PUBLISHED'`).get().cnt;
  const eventsDraft = db.prepare(`SELECT COUNT(*) as cnt FROM events WHERE status = 'DRAFT'`).get().cnt;
  const eventsCancelled = db.prepare(`SELECT COUNT(*) as cnt FROM events WHERE status = 'CANCELLED'`).get().cnt;
  const eventsOnsite = db.prepare(`SELECT COUNT(*) as cnt FROM events WHERE format = 'ONSITE'`).get().cnt;
  const eventsOnline = db.prepare(`SELECT COUNT(*) as cnt FROM events WHERE format = 'ONLINE'`).get().cnt;
  const eventsHybrid = db.prepare(`SELECT COUNT(*) as cnt FROM events WHERE format = 'HYBRID'`).get().cnt;
  const newEventsThisMonth = db.prepare(`SELECT COUNT(*) as cnt FROM events WHERE created_at >= ?`).get(firstDayOfMonth).cnt;

  const totalRegistrations = db.prepare(`SELECT COUNT(*) as cnt FROM registrations`).get().cnt;
  const regConfirmed = db.prepare(`SELECT COUNT(*) as cnt FROM registrations WHERE status = 'CONFIRMED'`).get().cnt;
  const regPending = db.prepare(`SELECT COUNT(*) as cnt FROM registrations WHERE status = 'PENDING'`).get().cnt;
  const regRejected = db.prepare(`SELECT COUNT(*) as cnt FROM registrations WHERE status = 'REJECTED'`).get().cnt;
  const regCancelled = db.prepare(`SELECT COUNT(*) as cnt FROM registrations WHERE status = 'CANCELLED'`).get().cnt;

  const top5 = db.prepare(`
    SELECT e.id, e.title, e.capacity,
           COUNT(r.id) as confirmed_count
    FROM events e
    LEFT JOIN registrations r ON r.event_id = e.id
    GROUP BY e.id
    ORDER BY confirmed_count DESC
    LIMIT 5
  `).all();

  return res.json({
    users: {
      total_participants: totalParticipants,
      total_companies: totalCompanies,
      total: totalParticipants + totalCompanies,
      new_this_month: newUsersThisMonth,
    },
    events: {
      total: totalEvents,
      new_this_month: newEventsThisMonth,
      by_status: { published: eventsPublished, draft: eventsDraft, cancelled: eventsCancelled },
      by_format: { onsite: eventsOnsite, online: eventsOnline, hybrid: eventsHybrid },
      top_5_popular: top5,
    },
    registrations: {
      total: totalRegistrations,
      by_status: { confirmed: regConfirmed, pending: regPending, rejected: regRejected, cancelled: regCancelled },
    },
  });
};

'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, Tag, Event, Registration } = require('../models');
const { blacklistToken, isBlacklisted } = require('../services/tokenBlacklist');
const { verifySiret } = require('../services/sireneService');
const {
  sendPasswordReset,
  sendCompanyVerificationResult,
} = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '2h';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

// ─── Helpers JWT ─────────────────────────────────────────────────────────────

function generateTokens(user) {
  const basePayload = { user_id: user.id, role: user.role };

  let accessPayload;
  if (user.role === 'COMPANY') {
    accessPayload = {
      ...basePayload,
      company_name: user.company_name,
      company_identifier: user.company_identifier,
    };
  } else {
    accessPayload = {
      ...basePayload,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    };
  }

  const accessToken = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES });
  const refreshToken = jwt.sign({ user_id: user.id }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });

  return { access: accessToken, refresh: refreshToken };
}

// ─── Validation helpers ──────────────────────────────────────────────────────

function validatePassword(password) {
  if (!password || password.length < 8) {
    return 'Le mot de passe doit contenir au moins 8 caractères.';
  }
  return null;
}

function validateSiret(siret) {
  const cleaned = siret.replace(/[\s\-]/g, '');
  if (!/^\d{14}$/.test(cleaned)) {
    return 'Le SIRET doit contenir exactement 14 chiffres.';
  }
  return null;
}

function validateCompanyIdentifier(id) {
  if (!id || id.length < 3 || id.length > 50) {
    return "L'identifiant doit contenir entre 3 et 50 caractères.";
  }
  if (!/^[a-zA-Z0-9\-]+$/.test(id)) {
    return "L'identifiant ne peut contenir que des lettres, chiffres et tirets (-).";
  }
  return null;
}

// ─── Inscription participant ──────────────────────────────────────────────────

async function registerParticipant(req, res) {
  const { email, password, password_confirm, first_name, last_name } = req.body;

  if (!email || !password || !password_confirm || !first_name || !last_name) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }
  if (password !== password_confirm) {
    return res.status(400).json({ password: 'Les mots de passe ne correspondent pas.' });
  }
  const pwdError = validatePassword(password);
  if (pwdError) return res.status(400).json({ password: pwdError });

  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(400).json({ email: 'Cet email est déjà utilisé.' });

  const user = await User.create({
    role: 'PARTICIPANT',
    email,
    password,
    first_name,
    last_name,
    is_active: true,
  });

  const { password: _, ...userData } = user.toJSON();
  return res.status(201).json(userData);
}

// ─── Inscription company ─────────────────────────────────────────────────────

async function registerCompany(req, res) {
  const {
    company_identifier, password, password_confirm,
    company_name, recovery_email, siret, legal_representative,
  } = req.body;

  if (!company_identifier || !password || !password_confirm || !company_name || !recovery_email || !siret || !legal_representative) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }

  const idError = validateCompanyIdentifier(company_identifier);
  if (idError) return res.status(400).json({ company_identifier: idError });

  if (password !== password_confirm) {
    return res.status(400).json({ password: 'Les mots de passe ne correspondent pas.' });
  }
  const pwdError = validatePassword(password);
  if (pwdError) return res.status(400).json({ password: pwdError });

  const siretError = validateSiret(siret);
  if (siretError) return res.status(400).json({ siret: siretError });

  const cleanedSiret = siret.replace(/[\s\-]/g, '');

  const existingId = await User.findOne({ where: { company_identifier } });
  if (existingId) return res.status(400).json({ company_identifier: 'Cet identifiant est déjà utilisé.' });

  const company = await User.create({
    role: 'COMPANY',
    email: null,
    password,
    company_identifier,
    company_name,
    recovery_email,
    siret: cleanedSiret,
    legal_representative,
    verification_status: 'PENDING',
    is_active: true,
  });

  // Vérification automatique SIRENE
  const { status: verStatus } = await verifySiret(cleanedSiret, company_name);
  const updateData = { verification_status: verStatus };
  if (verStatus === 'VERIFIED') {
    updateData.verified_at = new Date();
    updateData.verification_source = 'AUTO';
  }
  await company.update(updateData);
  await company.reload();

  // Notifier la company du résultat
  sendCompanyVerificationResult(company).catch(() => {});

  const { password: _, ...companyData } = company.toJSON();
  return res.status(201).json(companyData);
}

// ─── Login participant ────────────────────────────────────────────────────────

async function loginParticipant(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  const user = await User.findOne({ where: { email, role: 'PARTICIPANT' } });
  if (!user || !(await user.checkPassword(password))) {
    return res.status(400).json({ error: 'Email ou mot de passe incorrect.' });
  }
  if (!user.is_active) {
    return res.status(403).json({ error: 'Ce compte est désactivé.' });
  }

  return res.json(generateTokens(user));
}

// ─── Login company ────────────────────────────────────────────────────────────

async function loginCompany(req, res) {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
  }

  const user = await User.findOne({ where: { company_identifier: identifier, role: 'COMPANY' } });
  if (!user || !(await user.checkPassword(password))) {
    return res.status(400).json({ error: 'Identifiant ou mot de passe incorrect.' });
  }
  if (!user.is_active) {
    return res.status(403).json({ error: 'Ce compte est désactivé.' });
  }

  return res.json(generateTokens(user));
}

// ─── Refresh token ────────────────────────────────────────────────────────────

async function refreshToken(req, res) {
  const { refresh } = req.body;
  if (!refresh) return res.status(400).json({ error: 'Le refresh token est requis.' });

  if (await isBlacklisted(refresh)) {
    return res.status(401).json({ error: 'Token invalide ou révoqué.' });
  }

  try {
    const decoded = jwt.verify(refresh, JWT_SECRET);
    const user = await User.findByPk(decoded.user_id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Utilisateur invalide.' });
    }
    const { access } = generateTokens(user);
    return res.json({ access });
  } catch {
    return res.status(401).json({ error: 'Refresh token invalide ou expiré.' });
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

async function logout(req, res) {
  const { refresh } = req.body;
  if (!refresh) return res.status(400).json({ error: 'Le refresh token est requis.' });

  try {
    jwt.verify(refresh, JWT_SECRET);
    await blacklistToken(refresh);
    return res.json({ message: 'Déconnexion réussie.' });
  } catch {
    return res.status(400).json({ error: 'Token invalide ou déjà blacklisté.' });
  }
}

// ─── Profil — GET ─────────────────────────────────────────────────────────────

async function getProfile(req, res) {
  const user = await User.findByPk(req.user.id, {
    include: [{ association: 'tags', attributes: ['id', 'name'] }],
  });
  const { password, ...data } = user.toJSON();
  return res.json(data);
}

// ─── Profil — PATCH ──────────────────────────────────────────────────────────

async function updateProfile(req, res) {
  const user = req.user;
  const allowedParticipant = [
    'first_name', 'last_name', 'employer_name',
    'participant_profile_type', 'school_name', 'study_level',
    'professional_company_name', 'job_title', 'job_started_at',
    'participant_avatar_url', 'participant_bio', 'favorite_domain',
    'personal_website_url', 'github_url', 'participant_linkedin_url',
  ];
  const allowedCompany = [
    'company_name', 'recovery_email', 'company_description',
    'website_url', 'youtube_url', 'linkedin_url',
    'twitter_url', 'instagram_url', 'facebook_url',
  ];

  const allowed = user.role === 'PARTICIPANT' ? allowedParticipant : allowedCompany;
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  // Gestion du logo uploadé (via multer)
  if (req.file && req.file.fieldname === 'company_logo') {
    updates.company_logo = `/media/logos/${req.file.filename}`;
  }

  // Gestion des tags (tag_ids)
  if (req.body.tag_ids !== undefined) {
    let tagIds = req.body.tag_ids;
    if (!Array.isArray(tagIds)) tagIds = [tagIds];
    tagIds = tagIds.map(Number).filter(Boolean);
    const tags = await Tag.findAll({ where: { id: tagIds } });
    await user.setTags(tags);
  }

  if (Object.keys(updates).length > 0) {
    await user.update(updates);
  }

  await user.reload({ include: [{ association: 'tags', attributes: ['id', 'name'] }] });
  const { password, ...data } = user.toJSON();
  return res.json(data);
}

// ─── Suppression compte RGPD ─────────────────────────────────────────────────

async function deleteAccount(req, res) {
  const user = req.user;
  const now = new Date();

  // Annuler les inscriptions aux events futurs
  await Registration.update(
    { status: 'CANCELLED' },
    {
      where: {
        participant_id: user.id,
        status: ['PENDING', 'CONFIRMED'],
        '$event.date_start$': { [Op.gt]: now },
      },
      include: [{ association: 'event' }],
    }
  );

  // Anonymiser selon le rôle
  if (user.role === 'PARTICIPANT') {
    await user.update({
      email: `deleted_${user.id}@deleted.neurovent.com`,
      first_name: '[Supprimé]',
      last_name: '[Supprimé]',
      employer_name: '',
      school_name: '',
      study_level: '',
      professional_company_name: '',
      job_title: '',
      job_started_at: null,
      participant_avatar_url: '',
      participant_bio: '',
      favorite_domain: '',
      personal_website_url: '',
      github_url: '',
      participant_linkedin_url: '',
      is_active: false,
    });
  } else if (user.role === 'COMPANY') {
    await user.update({
      company_name: '[Entreprise supprimée]',
      company_description: '',
      recovery_email: '',
      company_logo_url: '',
      website_url: '',
      youtube_url: '',
      linkedin_url: '',
      twitter_url: '',
      instagram_url: '',
      facebook_url: '',
      is_active: false,
    });
  }

  return res.json({ message: 'Compte supprimé avec succès.' });
}

// ─── Changement mot de passe ─────────────────────────────────────────────────

async function changePassword(req, res) {
  const { current_password, new_password, new_password_confirm } = req.body;
  if (!current_password || !new_password || !new_password_confirm) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }

  const user = await User.findByPk(req.user.id);
  if (!(await user.checkPassword(current_password))) {
    return res.status(400).json({ current_password: 'Mot de passe actuel incorrect.' });
  }
  if (new_password !== new_password_confirm) {
    return res.status(400).json({ new_password: 'Les mots de passe ne correspondent pas.' });
  }
  const pwdError = validatePassword(new_password);
  if (pwdError) return res.status(400).json({ new_password: pwdError });

  await user.update({ password: new_password });
  return res.json({ message: 'Mot de passe modifié avec succès.' });
}

// ─── Reset mot de passe — demande ────────────────────────────────────────────

async function passwordResetRequest(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ email: 'Email requis.' });

  let user = await User.findOne({ where: { email, role: 'PARTICIPANT', is_active: true } });
  if (!user) {
    user = await User.findOne({ where: { recovery_email: email, role: 'COMPANY', is_active: true } });
  }

  if (user) {
    // Générer un token signé avec le hash du mot de passe actuel (invalide après changement)
    const tokenPayload = {
      user_id: user.id,
      pwd_hash: user.password.slice(-8), // fragment du hash — invalide si mdp changé
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
    const uid = Buffer.from(String(user.id)).toString('base64');
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${uid}/${token}/`;
    sendPasswordReset(email, resetLink).catch(() => {});
  }

  return res.json({
    message: 'Si cet email est associé à un compte, un lien de réinitialisation a été envoyé.',
  });
}

// ─── Reset mot de passe — confirmation ──────────────────────────────────────

async function passwordResetConfirm(req, res) {
  const { uid, token, new_password, new_password_confirm } = req.body;
  if (!uid || !token || !new_password || !new_password_confirm) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }
  if (new_password !== new_password_confirm) {
    return res.status(400).json({ new_password: 'Les mots de passe ne correspondent pas.' });
  }
  const pwdError = validatePassword(new_password);
  if (pwdError) return res.status(400).json({ new_password: pwdError });

  let userId;
  try {
    userId = Buffer.from(uid, 'base64').toString('utf8');
  } catch {
    return res.status(400).json({ error: 'Lien invalide.' });
  }

  const user = await User.findByPk(userId);
  if (!user) return res.status(400).json({ error: 'Lien invalide.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Vérifier que le fragment de hash correspond (invalide si mdp déjà changé)
    if (decoded.user_id !== user.id || decoded.pwd_hash !== user.password.slice(-8)) {
      return res.status(400).json({ error: 'Lien invalide ou expiré.' });
    }
  } catch {
    return res.status(400).json({ error: 'Lien invalide ou expiré.' });
  }

  await user.update({ password: new_password });
  return res.json({ message: 'Mot de passe réinitialisé avec succès.' });
}

// ─── Upload document vérification ────────────────────────────────────────────

async function uploadVerificationDocument(req, res) {
  const user = req.user;
  if (user.role !== 'COMPANY') {
    return res.status(403).json({ error: 'Réservé aux comptes entreprise.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier fourni. Champ attendu : "verification_document".' });
  }

  const updates = { verification_document: `/media/verification_docs/${req.file.filename}` };
  if (['REJECTED', 'PENDING'].includes(user.verification_status)) {
    updates.verification_status = 'NEEDS_REVIEW';
  }
  await user.update(updates);

  return res.json({
    message: 'Document reçu. Votre dossier est en cours de révision.',
    verification_status: user.verification_status,
  });
}

// ─── Admin — Stats globales ───────────────────────────────────────────────────

async function adminStats(req, res) {
  const { sequelize } = require('../models');
  const { QueryTypes } = require('sequelize');
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalParticipants,
    totalCompanies,
    newUsersThisMonth,
    totalEvents,
    eventsByStatus,
    eventsByFormat,
    newEventsThisMonth,
    totalRegistrations,
    registrationsByStatus,
    topEvents,
  ] = await Promise.all([
    User.count({ where: { role: 'PARTICIPANT' } }),
    User.count({ where: { role: 'COMPANY' } }),
    User.count({ where: { date_joined: { [Op.gte]: firstDayOfMonth } } }),
    Event.count(),
    Promise.all([
      Event.count({ where: { status: 'PUBLISHED' } }),
      Event.count({ where: { status: 'DRAFT' } }),
      Event.count({ where: { status: 'CANCELLED' } }),
    ]),
    Promise.all([
      Event.count({ where: { format: 'ONSITE' } }),
      Event.count({ where: { format: 'ONLINE' } }),
      Event.count({ where: { format: 'HYBRID' } }),
    ]),
    Event.count({ where: { created_at: { [Op.gte]: firstDayOfMonth } } }),
    Registration.count(),
    Promise.all([
      Registration.count({ where: { status: 'CONFIRMED' } }),
      Registration.count({ where: { status: 'PENDING' } }),
      Registration.count({ where: { status: 'REJECTED' } }),
      Registration.count({ where: { status: 'CANCELLED' } }),
    ]),
    sequelize.query(
      `SELECT e.id, e.title, e.capacity,
              COUNT(r.id) as confirmed_count
       FROM events e
       LEFT JOIN registrations r ON r.event_id = e.id
       GROUP BY e.id
       ORDER BY confirmed_count DESC
       LIMIT 5`,
      { type: QueryTypes.SELECT }
    ),
  ]);

  const [
    totalAdmins,
    activeUsers,
    companiesPending,
    companiesNeedsReview,
    companiesVerified,
    companiesRejected,
    totalViews,
    waitlistCount,
  ] = await Promise.all([
    User.count({ where: { role: 'ADMIN' } }),
    User.count({ where: { is_active: true } }),
    User.count({ where: { role: 'COMPANY', verification_status: 'PENDING' } }),
    User.count({ where: { role: 'COMPANY', verification_status: 'NEEDS_REVIEW' } }),
    User.count({ where: { role: 'COMPANY', verification_status: 'VERIFIED' } }),
    User.count({ where: { role: 'COMPANY', verification_status: 'REJECTED' } }),
    sequelize.query('SELECT COALESCE(SUM(view_count), 0) as total FROM events', { type: QueryTypes.SELECT }),
    Registration.count({ where: { status: 'WAITLIST' } }),
  ]);

  return res.json({
    users: {
      total_participants: totalParticipants,
      total_companies: totalCompanies,
      total_admins: totalAdmins,
      total: totalParticipants + totalCompanies + totalAdmins,
      active_total: activeUsers,
      new_this_month: newUsersThisMonth,
      company_verification: {
        pending: companiesPending,
        needs_review: companiesNeedsReview,
        verified: companiesVerified,
        rejected: companiesRejected,
      },
    },
    events: {
      total: totalEvents,
      total_views: parseInt(totalViews[0].total) || 0,
      new_this_month: newEventsThisMonth,
      by_status: {
        published: eventsByStatus[0],
        draft: eventsByStatus[1],
        cancelled: eventsByStatus[2],
      },
      by_format: {
        onsite: eventsByFormat[0],
        online: eventsByFormat[1],
        hybrid: eventsByFormat[2],
      },
      top_5_popular: topEvents,
    },
    registrations: {
      total: totalRegistrations,
      by_status: {
        confirmed: registrationsByStatus[0],
        pending: registrationsByStatus[1],
        rejected: registrationsByStatus[2],
        cancelled: registrationsByStatus[3],
        waitlist: waitlistCount,
      },
    },
  });
}

// ─── Admin — Liste utilisateurs ───────────────────────────────────────────────

async function adminListUsers(req, res) {
  const { role, is_active, search } = req.query;

  const where = { role: { [Op.ne]: 'ADMIN' } };
  if (role && ['PARTICIPANT', 'COMPANY'].includes(role)) where.role = role;
  if (is_active !== undefined) where.is_active = is_active === 'true';

  if (search && search.trim()) {
    const terms = search.trim().split(/\s+/).filter(Boolean);
    const andClauses = terms.map(term => ({
      [Op.or]: [
        { email: { [Op.like]: `%${term}%` } },
        { first_name: { [Op.like]: `%${term}%` } },
        { last_name: { [Op.like]: `%${term}%` } },
        { employer_name: { [Op.like]: `%${term}%` } },
        { school_name: { [Op.like]: `%${term}%` } },
        { study_level: { [Op.like]: `%${term}%` } },
        { professional_company_name: { [Op.like]: `%${term}%` } },
        { job_title: { [Op.like]: `%${term}%` } },
        { participant_bio: { [Op.like]: `%${term}%` } },
        { favorite_domain: { [Op.like]: `%${term}%` } },
        { company_name: { [Op.like]: `%${term}%` } },
        { company_identifier: { [Op.like]: `%${term}%` } },
        { recovery_email: { [Op.like]: `%${term}%` } },
      ],
    }));
    where[Op.and] = andClauses;
  }

  const rows = await User.findAll({
    where,
    attributes: [
      'id', 'role', 'email', 'company_name', 'company_identifier',
      'first_name', 'last_name', 'is_active', 'date_joined', 'verification_status',
    ],
    order: [['date_joined', 'ASC']],
  });

  const results = rows.map(u => ({
    id: u.id,
    role: u.role,
    email: u.email,
    name: u.role === 'PARTICIPANT'
      ? `${u.first_name} ${u.last_name}`.trim()
      : u.company_name,
    is_active: u.is_active,
    date_joined: u.date_joined,
    verification_status: u.verification_status,
  }));

  return res.json({ count: results.length, results });
}

// ─── Admin — Suspendre / Activer ─────────────────────────────────────────────

async function adminSuspendUser(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  if (user.role === 'ADMIN') return res.status(403).json({ error: 'Impossible de suspendre un admin.' });
  await user.update({ is_active: false });
  return res.json({ message: `Compte ${user.id} suspendu avec succès.` });
}

async function adminActivateUser(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  await user.update({ is_active: true });
  return res.json({ message: `Compte ${user.id} réactivé avec succès.` });
}

// ─── Admin — Suppression RGPD ─────────────────────────────────────────────────

async function adminDeleteUser(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  if (user.role === 'ADMIN') return res.status(403).json({ error: 'Impossible de supprimer un admin.' });

  const now = new Date();
  // Annuler les inscriptions aux events futurs
  await Registration.update(
    { status: 'CANCELLED' },
    {
      where: {
        participant_id: user.id,
        status: ['PENDING', 'CONFIRMED'],
      },
    }
  );

  if (user.role === 'PARTICIPANT') {
    await user.update({
      email: `deleted_${user.id}@deleted.neurovent.com`,
      first_name: '[Supprimé]',
      last_name: '[Supprimé]',
      employer_name: '',
      school_name: '',
      study_level: '',
      professional_company_name: '',
      job_title: '',
      job_started_at: null,
      participant_avatar_url: '',
      participant_bio: '',
      favorite_domain: '',
      personal_website_url: '',
      github_url: '',
      participant_linkedin_url: '',
      is_active: false,
    });
  } else {
    await user.update({
      company_name: '[Entreprise supprimée]',
      company_description: '',
      recovery_email: '',
      company_logo_url: '',
      website_url: '',
      youtube_url: '',
      linkedin_url: '',
      twitter_url: '',
      instagram_url: '',
      facebook_url: '',
      is_active: false,
    });
  }

  return res.json({ message: `Compte ${req.params.id} supprimé avec succès.` });
}

// ─── Admin — Companies en attente ────────────────────────────────────────────

async function adminPendingCompanies(req, res) {
  const { status: verStatus = 'PENDING' } = req.query;

  const companies = await User.findAll({
    where: { role: 'COMPANY', verification_status: verStatus },
    attributes: [
      'id', 'company_name', 'siret', 'legal_representative',
      'verification_status', 'verification_source',
      'verification_document', 'review_note', 'verified_at',
      'recovery_email', 'date_joined',
    ],
    order: [['date_joined', 'ASC']],
  });

  return res.json(companies);
}

// ─── Admin — Vérifier une company ────────────────────────────────────────────

async function adminVerifyCompany(req, res) {
  const company = await User.findOne({ where: { id: req.params.id, role: 'COMPANY' } });
  if (!company) return res.status(404).json({ error: 'Entreprise introuvable.' });

  const { verification_status: newStatus, review_note } = req.body;
  const allowed = ['VERIFIED', 'REJECTED', 'NEEDS_REVIEW'];
  if (!allowed.includes(newStatus)) {
    return res.status(400).json({ verification_status: `Valeur invalide. Choisir parmi : ${allowed.join(', ')}` });
  }

  const updates = { verification_status: newStatus };
  if (review_note !== undefined) updates.review_note = review_note;

  if (newStatus === 'VERIFIED') {
    updates.verified_at = new Date();
    updates.verification_source = 'MANUAL';
  } else if (['REJECTED', 'NEEDS_REVIEW'].includes(newStatus)) {
    updates.verified_at = null;
  }

  await company.update(updates);
  await company.reload();

  sendCompanyVerificationResult(company).catch(() => {});

  return res.json({
    id: company.id,
    company_name: company.company_name,
    siret: company.siret,
    legal_representative: company.legal_representative,
    verification_status: company.verification_status,
    verification_source: company.verification_source,
    verification_document: company.verification_document,
    review_note: company.review_note,
    verified_at: company.verified_at,
    recovery_email: company.recovery_email,
    date_joined: company.date_joined,
  });
}

// ─── Profil public participant ────────────────────────────────────────

async function getParticipantPublicProfile(req, res) {
  const participant = await User.findOne({
    where: { id: req.params.id, role: 'PARTICIPANT' },
    include: [{ association: 'tags', attributes: ['id', 'name'], through: { attributes: [] } }],
  });

  if (!participant) return res.status(404).json({ error: 'Participant introuvable.' });

  // Un participant ne peut voir que son propre profil complet ; company/admin voient tout
  if (req.user.role === 'PARTICIPANT' && req.user.id !== participant.id) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  const { password, recovery_email, verification_document, ...data } = participant.toJSON();
  return res.json(data);
}

// ─── Admin — Détail utilisateur ───────────────────────────────────────

async function adminGetUser(req, res) {
  const user = await User.findByPk(req.params.id, {
    include: [{ association: 'tags', attributes: ['id', 'name'], through: { attributes: [] } }],
  });

  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  if (user.role === 'ADMIN') return res.status(403).json({ error: 'Profil admin indisponible.' });

  const { password, ...data } = user.toJSON();
  return res.json(data);
}

// ─── Admin — Liste complète companies ───────────────────────────────

async function adminListCompanies(req, res) {
  const { verification_status, is_active, search } = req.query;

  const where = { role: 'COMPANY' };
  const validStatuses = ['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW'];
  if (verification_status && validStatuses.includes(verification_status)) {
    where.verification_status = verification_status;
  }
  if (is_active !== undefined) where.is_active = is_active === 'true';

  if (search && search.trim()) {
    const terms = search.trim().split(/\s+/).filter(Boolean);
    const andClauses = terms.map(term => ({
      [Op.or]: [
        { company_name: { [Op.like]: `%${term}%` } },
        { company_identifier: { [Op.like]: `%${term}%` } },
        { recovery_email: { [Op.like]: `%${term}%` } },
        { company_description: { [Op.like]: `%${term}%` } },
        { siret: { [Op.like]: `%${term}%` } },
        { legal_representative: { [Op.like]: `%${term}%` } },
        { review_note: { [Op.like]: `%${term}%` } },
        { website_url: { [Op.like]: `%${term}%` } },
        { linkedin_url: { [Op.like]: `%${term}%` } },
        { twitter_url: { [Op.like]: `%${term}%` } },
        { instagram_url: { [Op.like]: `%${term}%` } },
        { facebook_url: { [Op.like]: `%${term}%` } },
      ],
    }));
    where[Op.and] = andClauses;
  }

  const companies = await User.findAll({
    where,
    include: [{ association: 'tags', attributes: ['id', 'name'], through: { attributes: [] } }],
    order: [['date_joined', 'ASC']],
  });

  const results = companies.map(c => {
    const { password, ...data } = c.toJSON();
    return data;
  });

  return res.json({ count: results.length, results });
}

module.exports = {
  registerParticipant,
  registerCompany,
  loginParticipant,
  loginCompany,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  deleteAccount,
  changePassword,
  passwordResetRequest,
  passwordResetConfirm,
  uploadVerificationDocument,
  getParticipantPublicProfile,
  adminStats,
  adminListUsers,
  adminGetUser,
  adminSuspendUser,
  adminActivateUser,
  adminDeleteUser,
  adminPendingCompanies,
  adminVerifyCompany,
  adminListCompanies,
};

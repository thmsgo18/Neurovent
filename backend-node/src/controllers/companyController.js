'use strict';

const { User, Event } = require('../models');

/**
 * GET /api/companies/:id/
 * Profil public d'une company — accessible sans authentification.
 * Retourne les infos publiques + les events publiés.
 * Ne retourne PAS recovery_email ni company_identifier.
 */
async function getCompanyPublicProfile(req, res) {
  const company = await User.findOne({
    where: { id: req.params.id, role: 'COMPANY', is_active: true },
    include: [{ association: 'tags', attributes: ['id', 'name'], through: { attributes: [] } }],
  });

  if (!company) return res.status(404).json({ error: 'Entreprise introuvable.' });

  // Events publiés de la company
  const publishedEvents = await Event.findAll({
    where: { company_id: company.id, status: 'PUBLISHED' },
    attributes: ['id', 'title', 'date_start', 'format', 'capacity'],
    include: [{ association: 'registrations', attributes: ['status'] }],
    order: [['date_start', 'ASC']],
  });

  const events = publishedEvents.map(e => {
    const confirmed = (e.registrations || []).filter(r => r.status === 'CONFIRMED').length;
    return {
      id: e.id,
      title: e.title,
      date_start: e.date_start,
      format: e.format,
      spots_remaining: e.capacity - confirmed,
    };
  });

  return res.json({
    id: company.id,
    company_name: company.company_name,
    company_logo: company.company_logo || null,
    company_description: company.company_description,
    website_url: company.website_url,
    youtube_url: company.youtube_url,
    linkedin_url: company.linkedin_url,
    twitter_url: company.twitter_url,
    instagram_url: company.instagram_url,
    facebook_url: company.facebook_url,
    tags: (company.tags || []).map(t => ({ id: t.id, name: t.name })),
    events,
    member_since: company.date_joined,
  });
}

/**
 * GET /api/companies/
 * Recherche publique des companies — accessible sans auth.
 * Filtres : ?search=... & ?organization=...
 */
async function listCompanies(req, res) {
  const { search, organization } = req.query;
  const { Op } = require('sequelize');
  const { Tag } = require('../models');

  const where = { role: 'COMPANY', is_active: true };

  if (organization && organization.trim()) {
    where.company_name = organization.trim();
  }

  if (search && search.trim()) {
    const terms = search.trim().split(/\s+/).filter(Boolean);
    const andClauses = terms.map(term => ({
      [Op.or]: [
        { company_name: { [Op.like]: `%${term}%` } },
        { company_description: { [Op.like]: `%${term}%` } },
      ],
    }));
    where[Op.and] = andClauses;
  }

  const companies = await User.findAll({
    where,
    include: [
      { association: 'tags', attributes: ['id', 'name'], through: { attributes: [] } },
      { association: 'events', attributes: ['id'], where: { status: 'PUBLISHED' }, required: false },
    ],
    order: [['company_name', 'ASC']],
  });

  const results = companies.map(c => ({
    id: c.id,
    company_name: c.company_name,
    company_logo: c.company_logo || c.company_logo_url || null,
    company_description: c.company_description,
    website_url: c.website_url,
    linkedin_url: c.linkedin_url,
    twitter_url: c.twitter_url,
    tags: (c.tags || []).map(t => ({ id: t.id, name: t.name })),
    event_count: (c.events || []).length,
    member_since: c.date_joined,
    verification_status: c.verification_status,
  }));

  return res.json({ count: results.length, results });
}

module.exports = { getCompanyPublicProfile, listCompanies };

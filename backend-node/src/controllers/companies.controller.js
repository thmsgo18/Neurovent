const db = require('../db/database');
const { serializeEventList, getUserTags } = require('../utils/helpers');

// GET /api/companies/:id/ — profil public d'une company
exports.companyPublicProfile = (req, res) => {
  const company = db.prepare(`
    SELECT * FROM users WHERE id = ? AND role = 'COMPANY' AND is_active = 1
  `).get(req.params.id);

  if (!company) return res.status(404).json({ error: 'Entreprise introuvable.' });

  // Events publiés de la company
  const events = db.prepare(`
    SELECT * FROM events WHERE company_id = ? AND status = 'PUBLISHED' ORDER BY date_start
  `).all(company.id);

  return res.json({
    id: company.id,
    company_name: company.company_name,
    company_logo: company.company_logo ? `/media/${company.company_logo}` : null,
    company_description: company.company_description,
    website_url: company.website_url,
    youtube_url: company.youtube_url,
    linkedin_url: company.linkedin_url,
    twitter_url: company.twitter_url,
    instagram_url: company.instagram_url,
    facebook_url: company.facebook_url,
    tags: getUserTags(company.id),
    events: events.map(serializeEventList),
  });
};

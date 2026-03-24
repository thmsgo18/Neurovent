const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production_use_a_long_random_string';
const JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '2h';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

/**
 * Génère une paire de tokens JWT (access + refresh) pour un utilisateur.
 * Le payload d'accès contient le rôle et les infos de base (comme Django simplejwt).
 */
function generateTokens(user) {
  const accessJti = crypto.randomUUID();
  const refreshJti = crypto.randomUUID();

  const accessPayload = {
    user_id: user.id,
    role: user.role,
    jti: accessJti,
    type: 'access',
  };

  if (user.role === 'PARTICIPANT') {
    accessPayload.email = user.email;
    accessPayload.first_name = user.first_name;
    accessPayload.last_name = user.last_name;
  } else if (user.role === 'COMPANY') {
    accessPayload.company_name = user.company_name;
    accessPayload.company_identifier = user.company_identifier;
  }

  const refreshPayload = {
    user_id: user.id,
    role: user.role,
    jti: refreshJti,
    type: 'refresh',
  };

  const access = jwt.sign(accessPayload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES });
  const refresh = jwt.sign(refreshPayload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });

  return { access, refresh };
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = { generateTokens, verifyToken, decodeToken };

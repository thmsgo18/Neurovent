'use strict';

/**
 * emailService.js — Centralisation de tous les emails de la plateforme Neurovent.
 *
 * Équivalent Node.js de emails.py (Django).
 * Toutes les fonctions d'envoi email sont ici.
 * Les contrôleurs importent uniquement la fonction dont ils ont besoin.
 *
 * Fonctions disponibles :
 *   - sendRegistrationConfirmed(registration, fromWaitlist)
 *   - sendRegistrationRejected(registration)
 *   - sendRegistrationRemovedByOrganizer(registration)
 *   - sendEventCancelled(event)
 *   - sendPasswordReset(recipientEmail, resetLink)
 *   - sendCompanyVerificationResult(company)
 */

const transporter = require('../config/email');

const FROM = process.env.EMAIL_FROM || 'Neurovent <neurovent.noreply@gmail.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BRAND_NAME = 'Neurovent';

// ─── Palette dark premium (identique au template Django base.html) ────────────
const PALETTE = {
  bg: '#0d0d12',
  bg_alt: '#111118',
  surface: '#151820',
  surface_high: '#1b2030',
  surface_raised: '#1e243a',
  border: 'rgba(255,255,255,0.06)',
  border_strong: 'rgba(255,255,255,0.12)',
  text: '#f1f0ff',
  text_muted: '#8b8fa8',
  text_dim: '#4a4d65',
  accent: '#7c6ff7',
  accent_soft: 'rgba(124,111,247,0.10)',
  secondary: '#64b5f6',
  button: '#7c6ff7',
  button_text: '#ffffff',
};

// ─── Générateur HTML (équivalent de base.html Django) ────────────────────────

/**
 * Génère un email HTML au format dark premium Neurovent.
 *
 * @param {Object} opts
 * @param {string} opts.title         - Titre principal (h1)
 * @param {string} opts.eyebrow       - Badge au-dessus du titre
 * @param {string} [opts.preheader]   - Texte preview invisible
 * @param {string} [opts.greetingName] - Prénom du destinataire
 * @param {string[]} [opts.introLines]  - Lignes d'introduction
 * @param {string} [opts.detailTitle]   - Titre du bloc de détails
 * @param {Array<[string,string]>} [opts.detailItems] - Paires [label, valeur]
 * @param {string} [opts.statsTitle]    - Titre du bloc stats
 * @param {Array<[string,string]>} [opts.statsItems]  - Paires [label, valeur] pour stats
 * @param {string} [opts.bulletTitle]   - Titre du bloc bullets
 * @param {string[]} [opts.bulletItems] - Éléments de liste
 * @param {string} [opts.ctaUrl]        - URL du bouton CTA
 * @param {string} [opts.ctaLabel]      - Texte du bouton CTA
 * @param {string[]} [opts.noteLines]   - Lignes de note en bas
 * @param {string} [opts.replyTo]       - Email de réponse affiché en footer
 * @returns {string} HTML complet de l'email
 */
function buildEmailHTML({
  title,
  eyebrow = BRAND_NAME,
  preheader = '',
  greetingName = '',
  introLines = [],
  detailTitle = '',
  detailItems = [],
  statsTitle = '',
  statsItems = [],
  bulletTitle = '',
  bulletItems = [],
  ctaUrl = '',
  ctaLabel = '',
  noteLines = [],
  replyTo = 'contact@neurovent.io',
}) {
  const p = PALETTE;

  const greeting = greetingName ? `Hello ${greetingName},` : 'Hello,';

  const introHTML = introLines.map(line =>
    `<p style="margin:0 0 14px;font-size:16px;line-height:26px;color:${p.text_muted};">${line}</p>`
  ).join('');

  const detailHTML = detailItems.length ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
      style="margin-top:26px;border:1px solid ${p.border};border-radius:20px;background:${p.surface_high};">
      <tr><td style="padding:22px 22px 8px;">
        ${detailTitle ? `<div style="font-size:13px;font-weight:700;color:${p.accent};text-transform:uppercase;letter-spacing:0.14em;margin-bottom:14px;">${detailTitle}</div>` : ''}
        ${detailItems.map(([label, value]) => `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:12px;">
            <tr>
              <td valign="top" style="width:160px;padding:0 12px 0 0;font-size:13px;line-height:22px;color:${p.text_dim};font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">${label}</td>
              <td valign="top" style="font-size:14px;line-height:22px;color:${p.text};">${value}</td>
            </tr>
          </table>
        `).join('')}
      </td></tr>
    </table>` : '';

  const statsHTML = statsItems.length ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
      style="margin-top:26px;border-radius:20px;background:${p.surface_raised};border:1px solid ${p.border};">
      <tr><td style="padding:22px;">
        ${statsTitle ? `<div style="font-size:13px;font-weight:700;color:${p.secondary};text-transform:uppercase;letter-spacing:0.14em;margin-bottom:14px;">${statsTitle}</div>` : ''}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          ${statsItems.map(([label, value]) => `
            <td style="padding:0 12px 0 0;" valign="top">
              <div style="font-size:26px;line-height:32px;font-weight:800;color:${p.text};">${value}</div>
              <div style="margin-top:4px;font-size:13px;line-height:18px;color:${p.text_muted};">${label}</div>
            </td>
          `).join('')}
        </tr></table>
      </td></tr>
    </table>` : '';

  const bulletHTML = bulletItems.length ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
      style="margin-top:26px;border:1px solid ${p.border};border-radius:20px;background:${p.surface_high};">
      <tr><td style="padding:22px 22px 10px;">
        ${bulletTitle ? `<div style="font-size:13px;font-weight:700;color:${p.accent};text-transform:uppercase;letter-spacing:0.14em;margin-bottom:14px;">${bulletTitle}</div>` : ''}
        <ul style="margin:0;padding-left:20px;color:${p.text_muted};">
          ${bulletItems.map(item => `<li style="margin:0 0 10px;font-size:15px;line-height:24px;">${item}</li>`).join('')}
        </ul>
      </td></tr>
    </table>` : '';

  const ctaHTML = ctaUrl && ctaLabel ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
      <tr>
        <td align="center" bgcolor="${p.button}" style="border-radius:14px;box-shadow:0 0 24px ${p.accent_soft};">
          <a href="${ctaUrl}" style="display:inline-block;padding:15px 24px;font-size:15px;line-height:20px;font-weight:700;color:${p.button_text};text-decoration:none;">${ctaLabel}</a>
        </td>
      </tr>
    </table>` : '';

  const noteHTML = noteLines.length ? `
    <div style="margin-top:28px;padding:18px 20px;border-radius:18px;background:rgba(255,255,255,0.03);border:1px solid ${p.border};">
      ${noteLines.map(line => `<p style="margin:0 0 10px;font-size:14px;line-height:22px;color:${p.text_muted};">${line}</p>`).join('')}
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${p.bg};font-family:Arial,Helvetica,sans-serif;color:${p.text};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
    style="background:radial-gradient(circle at top left,${p.accent_soft} 0%,transparent 28%),${p.bg};margin:0;padding:28px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:0 auto;">

        <!-- Header card -->
        <tr><td style="padding:0 20px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
            style="background:linear-gradient(135deg,${p.bg_alt} 0%,${p.surface} 58%,${p.surface_high} 100%);border:1px solid ${p.border};border-radius:28px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.42);">
            <tr><td style="padding:32px 32px 28px;">
              <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${p.text_muted};font-weight:700;">${BRAND_NAME}</div>
              <div style="margin-top:18px;display:inline-block;padding:7px 12px;border-radius:999px;background:${p.accent_soft};border:1px solid ${p.border_strong};color:${p.text};font-size:12px;font-weight:700;">${eyebrow}</div>
              <h1 style="margin:18px 0 0;color:${p.text};font-size:32px;line-height:1.12;font-weight:800;letter-spacing:-0.03em;">${title}</h1>
            </td></tr>
          </table>
        </td></tr>

        <!-- Body card -->
        <tr><td style="padding:0 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
            style="background:${p.surface};border:1px solid ${p.border};border-radius:28px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,0.35);">
            <tr><td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:${p.text};">${greeting}</p>
              ${introHTML}
              ${detailHTML}
              ${statsHTML}
              ${bulletHTML}
              ${ctaHTML}
              ${noteHTML}
              <p style="margin:28px 0 0;font-size:15px;line-height:24px;color:${p.text_muted};">
                See you soon,<br/>
                <strong style="color:${p.text};">${BRAND_NAME}</strong>
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:18px 28px 0;text-align:center;">
          <p style="margin:0;font-size:12px;line-height:20px;color:${p.text_dim};">
            This email was sent automatically by ${BRAND_NAME}.
          </p>
          <p style="margin:6px 0 0;font-size:12px;line-height:20px;color:${p.text_dim};">
            You can reply to this email if you need help: ${replyTo}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Helpers internes ────────────────────────────────────────────────────────

function _isValidRecipient(email) {
  return Boolean(email) && !email.includes('deleted.neurovent.com');
}

async function _send(subject, textMessage, recipientEmail, htmlMessage = null) {
  if (!_isValidRecipient(recipientEmail)) return;
  try {
    const mailOptions = {
      from: FROM,
      to: recipientEmail,
      subject,
      text: textMessage,
      html: htmlMessage || undefined,
    };
    await transporter.sendMail(mailOptions);
  } catch {
    // fail_silently — l'opération principale ne doit pas échouer à cause de l'email
  }
}

function _buildDetailItems(event) {
  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const formatLabels = { ONSITE: 'Présentiel', ONLINE: 'Distanciel', HYBRID: 'Présentiel + Live' };
  const items = [
    ['Événement', event.title],
    ['Début', formatDate(event.date_start)],
    ['Fin', formatDate(event.date_end)],
    ['Format', formatLabels[event.format] || event.format],
  ];
  if (['ONSITE', 'HYBRID'].includes(event.format)) {
    if (event.address_full) items.push(['Adresse', event.address_full]);
    if (event.address_city) items.push(['Ville', `${event.address_city}${event.address_country ? ', ' + event.address_country : ''}`]);
  }
  if (['ONLINE', 'HYBRID'].includes(event.format)) {
    if (event.online_platform) items.push(['Plateforme', event.online_platform]);
    if (event.online_link) items.push(['Lien', `<a href="${event.online_link}" style="color:#7c6ff7;">${event.online_link}</a>`]);
  }
  return items;
}

function _formatEventDetails(event) {
  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const formatLabels = { ONSITE: 'Présentiel', ONLINE: 'Distanciel', HYBRID: 'Présentiel + Live' };

  const lines = [
    `  Titre   : ${event.title}`,
    `  Début   : ${formatDate(event.date_start)}`,
    `  Fin     : ${formatDate(event.date_end)}`,
    `  Format  : ${formatLabels[event.format] || event.format}`,
  ];

  if (['ONSITE', 'HYBRID'].includes(event.format)) {
    if (event.address_full) lines.push(`  Adresse : ${event.address_full}`);
    if (event.address_city) {
      lines.push(`  Ville   : ${event.address_city}${event.address_country ? `, ${event.address_country}` : ''}`);
    }
  }

  if (['ONLINE', 'HYBRID'].includes(event.format)) {
    if (event.online_platform) lines.push(`  Plateforme : ${event.online_platform}`);
    if (event.online_link) lines.push(`  Lien    : ${event.online_link}`);
  }

  return lines.join('\n');
}

// ─── Inscriptions ────────────────────────────────────────────────────────────

async function sendRegistrationConfirmed(registration, fromWaitlist = false) {
  const participant = registration.participant;
  const event = registration.event;
  const eventLink = `${FRONTEND_URL}/events/${event.id}/`;

  const intro = fromWaitlist
    ? `Bonne nouvelle ! Vous étiez sur liste d'attente pour "${event.title}" et une place vient de se libérer. Votre inscription est maintenant confirmée !`
    : `Votre inscription à l'événement est confirmée. Nous vous attendons !`;

  const detailItems = _buildDetailItems(event);

  const html = buildEmailHTML({
    title: fromWaitlist ? 'Place disponible — vous êtes confirmé !' : 'Inscription confirmée',
    eyebrow: 'Confirmation d\'inscription',
    preheader: `Votre inscription à ${event.title} est confirmée.`,
    greetingName: participant.first_name,
    introLines: [intro],
    detailTitle: 'Détails de l\'événement',
    detailItems,
    ctaUrl: eventLink,
    ctaLabel: 'Voir l\'événement',
  });

  await _send(
    `Inscription confirmée — ${event.title}`,
    `Bonjour ${participant.first_name},\n\n${intro}\n\n─── Détails ───\n${_formatEventDetails(event)}\n\nVoir : ${eventLink}\n\n— L'équipe Neurovent`,
    participant.email,
    html,
  );
}

async function sendRegistrationPending(registration) {
  const participant = registration.participant;
  const event = registration.event;
  const eventLink = `${FRONTEND_URL}/events/${event.id}/`;
  const details = _formatEventDetails(event);

  const html = buildEmailHTML({
    title: 'Demande d\'inscription reçue',
    eyebrow: 'En attente de validation',
    preheader: `Votre demande pour ${event.title} est en cours d'examen.`,
    greetingName: participant.first_name,
    introLines: [
      `Votre demande d'inscription à "${event.title}" a bien été reçue.`,
      'Elle est en attente de validation par l\'organisateur. Vous recevrez un email dès qu\'une décision sera prise.',
    ],
    detailTitle: 'Détails de l\'événement',
    detailItems: _buildDetailItems(event),
    ctaUrl: eventLink,
    ctaLabel: 'Voir l\'événement',
  });

  await _send(
    `Inscription en attente — ${event.title}`,
    `Hello ${participant.first_name},\n\nYour registration request for "${event.title}" has been received.\n\nIt is currently pending organizer review.\n\n─── Event details ───\n${details}\n\nView event: ${eventLink}\n\n- The Neurovent team`,
    participant.email,
    html,
  );
}

async function sendRegistrationWaitlist(registration, waitlistPosition) {
  const participant = registration.participant;
  const event = registration.event;
  const eventLink = `${FRONTEND_URL}/events/${event.id}/`;
  const position = waitlistPosition || '?';
  const details = _formatEventDetails(event);

  const html = buildEmailHTML({
    title: 'Vous êtes sur liste d\'attente',
    eyebrow: 'Liste d\'attente',
    preheader: `L'événement ${event.title} est complet — vous êtes #${position} sur la liste d'attente.`,
    greetingName: participant.first_name,
    introLines: [
      `L'événement "${event.title}" est actuellement complet. Votre inscription a été placée sur liste d'attente.`,
      `Votre position actuelle : <strong style="color:#f1f0ff;">#${position}</strong>`,
      'Si une place se libère, vous recevrez automatiquement un email de confirmation.',
    ],
    detailTitle: 'Détails de l\'événement',
    detailItems: _buildDetailItems(event),
    ctaUrl: eventLink,
    ctaLabel: 'Voir l\'événement',
  });

  await _send(
    `Liste d'attente — ${event.title}`,
    `Hello ${participant.first_name},\n\nThe event "${event.title}" is currently full.\n\nYour current position: ${position}\n\n─── Event details ───\n${details}\n\nView event: ${eventLink}\n\n- The Neurovent team`,
    participant.email,
    html,
  );
}

async function sendRegistrationRejected(registration) {
  const participant = registration.participant;
  const event = registration.event;
  const browseLink = `${FRONTEND_URL}/events/`;
  const dateStr = new Date(event.date_start).toLocaleDateString('fr-FR');

  const html = buildEmailHTML({
    title: 'Inscription non retenue',
    eyebrow: 'Décision de l\'organisateur',
    greetingName: participant.first_name,
    introLines: [
      `Nous sommes désolés de vous informer que votre inscription à "${event.title}" (le ${dateStr}) n'a pas été retenue par l'organisateur.`,
    ],
    ctaUrl: browseLink,
    ctaLabel: 'Explorer d\'autres événements',
  });

  await _send(
    `Inscription non retenue — ${event.title}`,
    `Bonjour ${participant.first_name},\n\nVotre inscription à "${event.title}" (le ${dateStr}) n'a pas été retenue.\n\nAutres événements : ${browseLink}\n\n— L'équipe Neurovent`,
    participant.email,
    html,
  );
}

async function sendRegistrationRemovedByOrganizer(registration) {
  const participant = registration.participant;
  const event = registration.event;
  const browseLink = `${FRONTEND_URL}/events/`;
  const dateStr = new Date(event.date_start).toLocaleString('fr-FR');

  const html = buildEmailHTML({
    title: 'Inscription retirée',
    eyebrow: 'Modification par l\'organisateur',
    greetingName: participant.first_name,
    introLines: [
      `L'organisateur a retiré votre inscription à "${event.title}" prévu le ${dateStr}.`,
      'Si vous pensez qu\'il s\'agit d\'une erreur, contactez directement l\'organisation de l\'événement.',
    ],
    ctaUrl: browseLink,
    ctaLabel: 'Explorer d\'autres événements',
  });

  await _send(
    `Inscription retirée par l'organisateur — ${event.title}`,
    `Bonjour ${participant.first_name},\n\nVotre inscription à "${event.title}" (${dateStr}) a été retirée par l'organisateur.\n\nAutres événements : ${browseLink}\n\n— L'équipe Neurovent`,
    participant.email,
    html,
  );
}

// ─── Événements ──────────────────────────────────────────────────────────────

async function sendEventCancelled(event) {
  const { Registration } = require('../models');
  const browseLink = `${FRONTEND_URL}/events/`;
  const dateStr = new Date(event.date_start).toLocaleString('fr-FR');

  const registrations = await Registration.findAll({
    where: {
      event_id: event.id,
      status: ['CONFIRMED', 'PENDING', 'WAITLIST'],
    },
    include: [{ association: 'participant', attributes: ['first_name', 'email'] }],
  });

  for (const reg of registrations) {
    const html = buildEmailHTML({
      title: 'Événement annulé',
      eyebrow: 'Annulation',
      greetingName: reg.participant.first_name,
      introLines: [
        `L'événement "${event.title}" prévu le ${dateStr} a été annulé par l'organisateur.`,
        'Votre inscription a été automatiquement annulée.',
      ],
      ctaUrl: browseLink,
      ctaLabel: 'Explorer d\'autres événements',
    });

    await _send(
      `Événement annulé — ${event.title}`,
      `Bonjour ${reg.participant.first_name},\n\n"${event.title}" (${dateStr}) a été annulé.\n\nAutres événements : ${browseLink}\n\n— L'équipe Neurovent`,
      reg.participant.email,
      html,
    );
  }
}

// ─── Authentification ────────────────────────────────────────────────────────

async function sendPasswordReset(recipientEmail, resetLink) {
  const html = buildEmailHTML({
    title: 'Réinitialisation du mot de passe',
    eyebrow: 'Sécurité du compte',
    preheader: 'Cliquez pour réinitialiser votre mot de passe Neurovent.',
    introLines: [
      'Vous avez demandé la réinitialisation de votre mot de passe sur Neurovent.',
      'Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable 24 heures.',
    ],
    ctaUrl: resetLink,
    ctaLabel: 'Réinitialiser mon mot de passe',
    noteLines: [
      'Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email — votre mot de passe ne sera pas modifié.',
    ],
  });

  await _send(
    'Réinitialisation de votre mot de passe — Neurovent',
    `Bonjour,\n\nRéinitialisez votre mot de passe :\n${resetLink}\n\nCe lien est valable 24 heures.\n\n— L'équipe Neurovent`,
    recipientEmail,
    html,
  );
}

async function sendCompanyVerificationResult(company) {
  const email = company.recovery_email;
  const name = company.company_name;
  const verStatus = company.verification_status;

  let subject, body, html;

  if (verStatus === 'VERIFIED') {
    subject = 'Compte organisation vérifié — Neurovent';
    body = `Bonne nouvelle ! Le compte "${name}" a été vérifié via SIRENE. Vous pouvez créer des événements.`;
    html = buildEmailHTML({
      title: 'Compte vérifié ✓',
      eyebrow: 'Vérification SIRENE',
      introLines: [
        `Bonne nouvelle ! Le compte organisation "${name}" a été vérifié automatiquement via le répertoire SIRENE.`,
        'Vous pouvez dès maintenant créer et publier des événements sur Neurovent.',
      ],
      ctaUrl: `${FRONTEND_URL}/events/create`,
      ctaLabel: 'Créer un événement',
    });
  } else if (verStatus === 'NEEDS_REVIEW') {
    subject = 'Vérification en cours — Neurovent';
    body = `Votre demande de compte "${name}" est en cours de révision manuelle (1–2 jours ouvrés).`;
    html = buildEmailHTML({
      title: 'Vérification en cours',
      eyebrow: 'Révision manuelle',
      introLines: [
        `Votre demande de compte organisation "${name}" est en cours de révision manuelle par notre équipe.`,
        'Ce processus prend généralement 1 à 2 jours ouvrés. Vous recevrez un email dès qu\'une décision sera prise.',
      ],
      noteLines: [
        'Si votre dossier est incomplet, vous pourrez transmettre un justificatif (Kbis ou extrait RNE) via votre espace compte.',
      ],
    });
  } else if (verStatus === 'REJECTED') {
    subject = 'Demande refusée — Neurovent';
    body = `Nous n'avons pas pu vérifier le compte "${name}". SIRET invalide ou établissement radié.`;
    html = buildEmailHTML({
      title: 'Vérification impossible',
      eyebrow: 'Demande refusée',
      introLines: [
        `Nous n'avons pas pu vérifier votre compte organisation "${name}".`,
      ],
      bulletTitle: 'Raisons possibles',
      bulletItems: [
        'SIRET introuvable ou invalide dans le répertoire SIRENE',
        'Établissement fermé ou radié',
      ],
      noteLines: [
        'Si vous pensez qu\'il s\'agit d\'une erreur, répondez à cet email avec un justificatif officiel (Kbis ou extrait RNE).',
      ],
    });
  } else {
    return; // PENDING ou statut inconnu — pas d'email
  }

  await _send(subject, body, email, html);
}

// ─── Notifications planifiées ────────────────────────────────────────────────

async function sendEventReminder(registration, reminderKey) {
  const participant = registration.participant;
  const event = registration.event;
  const eventLink = `${FRONTEND_URL}/events/${event.id}/`;

  const labels = {
    '7d': ['dans une semaine', 'D-7'],
    '1d': ['demain', 'D-1'],
    '3h': ['dans quelques heures', 'H-3'],
  };
  const [timingText, badge] = labels[reminderKey] || ['bientôt', ''];
  const details = _formatEventDetails(event);

  const html = buildEmailHTML({
    title: `Rappel ${badge} — ${event.title}`,
    eyebrow: `Rappel ${badge}`,
    preheader: `L'événement "${event.title}" commence ${timingText}.`,
    greetingName: participant.first_name,
    introLines: [`L'événement "${event.title}" commence ${timingText}. Voici les informations pratiques.`],
    detailTitle: 'Informations pratiques',
    detailItems: _buildDetailItems(event),
    ctaUrl: eventLink,
    ctaLabel: 'Voir l\'événement',
  });

  await _send(
    `Rappel ${badge} — ${event.title}`,
    `Hello ${participant.first_name},\n\nL'événement "${event.title}" commence ${timingText}.\n\n${details}\n\nVoir : ${eventLink}\n\n- The Neurovent team`,
    participant.email,
    html,
  );
}

async function sendEventAccessRevealed(registration, revealTargets) {
  const participant = registration.participant;
  const event = registration.event;
  const eventLink = `${FRONTEND_URL}/events/${event.id}/`;

  const readable = [];
  if (revealTargets.includes('address')) readable.push('l\'adresse complète');
  if (revealTargets.includes('online')) readable.push('le lien d\'accès');
  const targetsText = readable.join(' et ');
  const details = _formatEventDetails(event);

  const html = buildEmailHTML({
    title: 'Informations pratiques disponibles',
    eyebrow: 'Nouveaux détails',
    preheader: `${targetsText} pour ${event.title} est maintenant disponible.`,
    greetingName: participant.first_name,
    introLines: [`Bonne nouvelle : ${targetsText} pour "${event.title}" est maintenant disponible.`],
    detailTitle: 'Détails complets de l\'événement',
    detailItems: _buildDetailItems(event),
    ctaUrl: eventLink,
    ctaLabel: 'Voir l\'événement',
  });

  await _send(
    `Informations pratiques disponibles — ${event.title}`,
    `Hello ${participant.first_name},\n\n${targetsText} pour "${event.title}" est maintenant disponible.\n\n${details}\n\nVoir : ${eventLink}\n\n- The Neurovent team`,
    participant.email,
    html,
  );
}

async function sendEventOrganizerDigest(event) {
  const { Registration } = require('../models');

  const activeRegistrations = await Registration.findAll({
    where: {
      event_id: event.id,
      status: ['CONFIRMED', 'PENDING', 'WAITLIST'],
    },
    include: [{ association: 'participant', attributes: ['first_name', 'last_name', 'email'] }],
  });

  const confirmedCount = activeRegistrations.filter(r => r.status === 'CONFIRMED').length;
  const pendingCount = activeRegistrations.filter(r => r.status === 'PENDING').length;
  const waitlistCount = activeRegistrations.filter(r => r.status === 'WAITLIST').length;

  const accessibilityEntries = activeRegistrations
    .filter(r => r.accessibility_needs && r.accessibility_needs.trim())
    .map(r => {
      const name = r.participant
        ? `${r.participant.first_name} ${r.participant.last_name}`.trim() || r.participant.email
        : 'Unknown';
      return `  - ${name} : ${r.accessibility_needs.trim()}`;
    });

  const accessibilityBlock = accessibilityEntries.length > 0
    ? accessibilityEntries.join('\n')
    : '  - No specific accessibility needs reported';

  const eventLink = `${FRONTEND_URL}/events/${event.id}/`;

  const html = buildEmailHTML({
    title: `Récapitulatif avant événement`,
    eyebrow: 'Digest organisateur',
    preheader: `Résumé avant "${event.title}".`,
    introLines: [`Voici votre récapitulatif avant l'événement "${event.title}".`],
    statsTitle: 'Participation',
    statsItems: [
      ['Confirmés', String(confirmedCount)],
      ['En attente', String(pendingCount)],
      ['Liste d\'attente', String(waitlistCount)],
    ],
    bulletTitle: 'Besoins d\'accessibilité',
    bulletItems: accessibilityEntries.length > 0
      ? accessibilityEntries.map(e => e.replace('  - ', ''))
      : ['Aucun besoin spécifique signalé'],
    ctaUrl: eventLink,
    ctaLabel: 'Voir l\'événement',
  });

  await _send(
    `Récapitulatif avant événement — ${event.title}`,
    `Hello,\n\nRécapitulatif avant "${event.title}".\n\nConfirmés : ${confirmedCount}\nEn attente : ${pendingCount}\nListe d'attente : ${waitlistCount}\n\nAccessibilité :\n${accessibilityBlock}\n\nVoir : ${eventLink}\n\n- The Neurovent team`,
    event.company ? event.company.recovery_email : null,
    html,
  );
}

async function sendEventCapacityAlert(event, alertType) {
  const { Registration } = require('../models');

  const confirmedCount = await Registration.count({
    where: { event_id: event.id, status: 'CONFIRMED' },
  });
  const waitlistCount = await Registration.count({
    where: { event_id: event.id, status: 'WAITLIST' },
  });
  const remaining = Math.max((event.capacity || 0) - confirmedCount, 0);

  let subject, intro;
  if (alertType === 'FULL') {
    subject = `Event full — ${event.title}`;
    intro = `Your event "${event.title}" is now full.\n\nConfirmed attendees: ${confirmedCount}/${event.capacity}\nWaiting list: ${waitlistCount}`;
  } else {
    subject = `Event almost full — ${event.title}`;
    intro = `Your event "${event.title}" is approaching maximum capacity.\n\nConfirmed attendees: ${confirmedCount}/${event.capacity}\nRemaining spots: ${remaining}`;
  }

  const eventLink = `${FRONTEND_URL}/events/${event.id}/`;
  const recipientEmail = event.company ? event.company.recovery_email : null;

  const isFullAlert = alertType === 'FULL';
  const html = buildEmailHTML({
    title: isFullAlert ? 'Événement complet' : 'Événement bientôt complet',
    eyebrow: isFullAlert ? 'Alerte capacité' : 'Alerte capacité',
    introLines: [intro],
    statsTitle: 'Capacité',
    statsItems: isFullAlert
      ? [['Confirmés', `${confirmedCount}/${event.capacity}`], ['Liste d\'attente', String(waitlistCount)]]
      : [['Confirmés', `${confirmedCount}/${event.capacity}`], ['Places restantes', String(remaining)]],
    ctaUrl: eventLink,
    ctaLabel: 'Voir l\'événement',
  });

  await _send(
    subject,
    `Hello,\n\n${intro}\n\nOpen event: ${eventLink}\n\n- The Neurovent team`,
    recipientEmail,
    html,
  );
}

async function sendEventUpdated(registration, changes) {
  const participant = registration.participant;
  const event = registration.event;
  const eventLink = `${FRONTEND_URL}/events/${event.id}/`;

  const changeLines = changes.map(c => `  - ${c}`).join('\n');
  const details = _formatEventDetails(event);

  const html = buildEmailHTML({
    title: 'Mise à jour importante',
    eyebrow: 'Événement modifié',
    preheader: `Les informations de "${event.title}" ont été mises à jour.`,
    greetingName: participant.first_name,
    introLines: [`Les informations de l'événement "${event.title}" ont été mises à jour.`],
    bulletTitle: 'Principales modifications',
    bulletItems: changes,
    detailTitle: 'Détails mis à jour',
    detailItems: _buildDetailItems(event),
    ctaUrl: eventLink,
    ctaLabel: 'Voir l\'événement',
  });

  await _send(
    `Mise à jour importante — ${event.title}`,
    `Hello ${participant.first_name},\n\nLes informations de "${event.title}" ont été mises à jour.\n\nModifications :\n${changeLines}\n\n${details}\n\nVoir : ${eventLink}\n\n- The Neurovent team`,
    participant.email,
    html,
  );
}

module.exports = {
  sendRegistrationConfirmed,
  sendRegistrationPending,
  sendRegistrationWaitlist,
  sendRegistrationRejected,
  sendRegistrationRemovedByOrganizer,
  sendEventCancelled,
  sendPasswordReset,
  sendCompanyVerificationResult,
  sendEventReminder,
  sendEventAccessRevealed,
  sendEventOrganizerDigest,
  sendEventCapacityAlert,
  sendEventUpdated,
};

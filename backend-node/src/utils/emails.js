/**
 * emails.js — Centralisation de tous les emails de la plateforme Neurovent.
 * Miroir exact de backend-django/emails.py
 *
 * Fonctions disponibles :
 *   - sendRegistrationConfirmed(registration, fromWaitlist = false)
 *   - sendRegistrationRejected(registration)
 *   - sendEventCancelled(event, registrations)
 *   - sendPasswordReset(recipientEmail, resetLink)
 */

const nodemailer = require('nodemailer');

// ─── Transporter SMTP ─────────────────────────────────────────────────────────

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

function isValidRecipient(email) {
  return Boolean(email) && !email.includes('deleted.neurovent.com');
}

async function send(subject, textMessage, recipientEmail) {
  if (!isValidRecipient(recipientEmail)) return;
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || 'Neurovent <neurovent.noreply@gmail.com>',
      to: recipientEmail,
      subject,
      text: textMessage,
    });
  } catch {
    // fail_silently — l'opération principale ne doit pas échouer à cause de l'email
  }
}

function formatEventDetails(event) {
  const formatLabel = { ONSITE: 'Présentiel', ONLINE: 'Distanciel', HYBRID: 'Présentiel + Live' };
  const start = new Date(event.date_start);
  const end = new Date(event.date_end);
  const fmt = (d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const lines = [
    `  Titre   : ${event.title}`,
    `  Début   : ${fmt(start)}`,
    `  Fin     : ${fmt(end)}`,
    `  Format  : ${formatLabel[event.format] || event.format}`,
  ];

  if (['ONSITE', 'HYBRID'].includes(event.format)) {
    if (event.address_full) lines.push(`  Adresse : ${event.address_full}`);
    if (event.address_city) {
      lines.push(`  Ville   : ${event.address_city}${event.address_country ? ', ' + event.address_country : ''}`);
    }
  }

  if (['ONLINE', 'HYBRID'].includes(event.format)) {
    if (event.online_platform) lines.push(`  Plateforme : ${event.online_platform}`);
    if (event.online_link) lines.push(`  Lien    : ${event.online_link}`);
  }

  return lines.join('\n');
}

// ─── Fonctions publiques ──────────────────────────────────────────────────────

/**
 * Email de confirmation d'inscription.
 * fromWaitlist=true quand le participant vient d'être promu depuis la liste d'attente.
 */
async function sendRegistrationConfirmed(registration, fromWaitlist = false) {
  const { participant, event } = registration;
  const eventLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/${event.id}/`;

  const intro = fromWaitlist
    ? `Bonne nouvelle ! Vous étiez sur liste d'attente pour "${event.title}" et une place vient de se libérer. Votre inscription est maintenant confirmée !\n`
    : `Votre inscription à "${event.title}" est confirmée !\n`;

  const details = formatEventDetails(event);

  await send(
    `Inscription confirmée — ${event.title}`,
    `Bonjour ${participant.first_name},\n\n${intro}\n─── Détails de l'événement ───\n${details}\n\nVoir l'événement : ${eventLink}\n\nÀ bientôt sur Neurovent !\n\n— L'équipe Neurovent`,
    participant.email,
  );
}

/**
 * Email de rejet d'inscription.
 */
async function sendRegistrationRejected(registration) {
  const { participant, event } = registration;
  const browseLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/`;
  const date = new Date(event.date_start).toLocaleDateString('fr-FR');

  await send(
    `Inscription non retenue — ${event.title}`,
    `Bonjour ${participant.first_name},\n\nNous sommes désolés de vous informer que votre inscription à "${event.title}" (le ${date}) n'a pas été retenue par l'organisateur.\n\nVous pouvez consulter d'autres événements disponibles sur Neurovent :\n${browseLink}\n\n— L'équipe Neurovent`,
    participant.email,
  );
}

/**
 * Notifie tous les inscrits actifs que l'événement est annulé.
 * @param {object} event - l'événement annulé
 * @param {Array}  registrations - tableau de {participant, event}
 */
async function sendEventCancelled(event, registrations) {
  const browseLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/`;
  const start = new Date(event.date_start);
  const dateStr = start.toLocaleDateString('fr-FR') + ' à ' + start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  for (const reg of registrations) {
    await send(
      `Événement annulé — ${event.title}`,
      `Bonjour ${reg.participant.first_name},\n\nNous avons le regret de vous informer que l'événement "${event.title}" prévu le ${dateStr} a été annulé par l'organisateur.\n\nVotre inscription a été automatiquement annulée.\n\nD'autres événements sont disponibles sur Neurovent :\n${browseLink}\n\n— L'équipe Neurovent`,
      reg.participant.email,
    );
  }
}

/**
 * Email de réinitialisation de mot de passe.
 */
async function sendPasswordReset(recipientEmail, resetLink) {
  await send(
    'Réinitialisation de votre mot de passe — Neurovent',
    `Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe sur Neurovent.\n\nCliquez sur ce lien pour choisir un nouveau mot de passe :\n${resetLink}\n\nCe lien est valable 24 heures. Après expiration, vous devrez faire une nouvelle demande.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe ne sera pas modifié.\n\n— L'équipe Neurovent`,
    recipientEmail,
  );
}

module.exports = {
  sendRegistrationConfirmed,
  sendRegistrationRejected,
  sendEventCancelled,
  sendPasswordReset,
};

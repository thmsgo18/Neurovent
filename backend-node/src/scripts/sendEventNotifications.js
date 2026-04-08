'use strict';

/**
 * sendEventNotifications.js — Notifications planifiées liées aux événements.
 *
 * Équivalent Node.js du management command Django :
 *   python manage.py send_event_notifications
 *
 * Ce script envoie :
 *   - Rappels aux participants confirmés (D-7, D-1, H-3)
 *   - Révélations d'accès (adresse complète et/ou lien visio)
 *   - Récapitulatif organisateur (J-1)
 *
 * Usage :
 *   node src/scripts/sendEventNotifications.js
 *
 * À exécuter via cron (ex: toutes les heures) :
 *   0 * * * * node /app/src/scripts/sendEventNotifications.js
 */

require('dotenv').config();

const { Op } = require('sequelize');
const { Event, Registration } = require('../models');
const {
  sendEventReminder,
  sendEventAccessRevealed,
  sendEventOrganizerDigest,
} = require('../services/emailService');

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

async function run() {
  const now = new Date();

  const upcomingEvents = await Event.findAll({
    where: {
      status: 'PUBLISHED',
      date_end: { [Op.gt]: now },
    },
    include: [
      {
        association: 'company',
        attributes: ['id', 'company_name', 'recovery_email'],
      },
      {
        association: 'registrations',
        include: [
          { association: 'participant', attributes: ['id', 'first_name', 'last_name', 'email'] },
        ],
      },
    ],
  });

  let reminderCount = 0;
  let revealCount = 0;
  let digestCount = 0;

  for (const event of upcomingEvents) {
    const delta = new Date(event.date_start) - now; // milliseconds

    const confirmedRegistrations = (event.registrations || []).filter(
      r => r.status === 'CONFIRMED'
    );

    // ─── Rappels participants ─────────────────────────────────────────────────
    let reminderKey = null;
    let reminderField = null;

    if (delta > 0 && delta <= 3 * MS_PER_HOUR && event.reminder_3h_sent_at === null) {
      reminderKey = '3h';
      reminderField = 'reminder_3h_sent_at';
    } else if (delta > 3 * MS_PER_HOUR && delta <= MS_PER_DAY && event.reminder_1d_sent_at === null) {
      reminderKey = '1d';
      reminderField = 'reminder_1d_sent_at';
    } else if (delta > MS_PER_DAY && delta <= 7 * MS_PER_DAY && event.reminder_7d_sent_at === null) {
      reminderKey = '7d';
      reminderField = 'reminder_7d_sent_at';
    }

    if (reminderKey && confirmedRegistrations.length > 0) {
      for (const reg of confirmedRegistrations) {
        // Attacher l'event à la registration pour l'email
        reg.event = event;
        await sendEventReminder(reg, reminderKey).catch(() => {});
        reminderCount++;
      }
      await event.update({ [reminderField]: now });
    }

    // ─── Révélations d'accès ──────────────────────────────────────────────────
    const revealTargets = [];

    if (
      ['ONSITE', 'HYBRID'].includes(event.format) &&
      event.address_visibility === 'PARTIAL' &&
      event.address_reveal_date &&
      now >= new Date(event.address_reveal_date) &&
      event.address_reveal_email_sent_at === null &&
      event.address_full
    ) {
      revealTargets.push('address');
    }

    if (
      ['ONLINE', 'HYBRID'].includes(event.format) &&
      event.online_visibility === 'PARTIAL' &&
      event.online_reveal_date &&
      now >= new Date(event.online_reveal_date) &&
      event.online_reveal_email_sent_at === null &&
      event.online_link
    ) {
      revealTargets.push('online');
    }

    if (revealTargets.length > 0 && confirmedRegistrations.length > 0) {
      for (const reg of confirmedRegistrations) {
        reg.event = event;
        await sendEventAccessRevealed(reg, revealTargets).catch(() => {});
        revealCount++;
      }
      const revealUpdates = {};
      if (revealTargets.includes('address')) revealUpdates.address_reveal_email_sent_at = now;
      if (revealTargets.includes('online')) revealUpdates.online_reveal_email_sent_at = now;
      await event.update(revealUpdates);
    }

    // ─── Récapitulatif organisateur (J-1) ─────────────────────────────────────
    if (delta > 0 && delta <= MS_PER_DAY && event.organizer_digest_sent_at === null) {
      await sendEventOrganizerDigest(event).catch(() => {});
      digestCount++;
      await event.update({ organizer_digest_sent_at: now });
    }
  }

  console.log(
    `Notifications envoyées (rappels=${reminderCount}, revelations=${revealCount}, recaps=${digestCount})`
  );
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erreur lors de l\'envoi des notifications:', err);
    process.exit(1);
  });

'use strict';

/**
 * notificationUtils.js — Utilitaires de notifications planifiées pour les événements.
 *
 * Équivalent Node.js de events/notification_utils.py (Django).
 */

const { sendEventCapacityAlert } = require('../services/emailService');

const NOTIFICATION_SNAPSHOT_FIELDS = [
  'date_start',
  'date_end',
  'address_full',
  'address_city',
  'address_country',
  'address_visibility',
  'address_reveal_date',
  'online_platform',
  'online_link',
  'online_visibility',
  'online_reveal_date',
];

/**
 * Capture les champs importants d'un event avant une modification.
 * @param {object} event — instance Sequelize Event
 * @returns {object}
 */
function captureEventNotificationSnapshot(event) {
  const snapshot = {};
  for (const field of NOTIFICATION_SNAPSHOT_FIELDS) {
    snapshot[field] = event[field];
  }
  return snapshot;
}

/**
 * Compare un snapshot pris avant modification avec l'event modifié.
 * Retourne une liste de messages de changement (en français).
 * @param {object} previous — snapshot avant modification
 * @param {object} event — instance Sequelize Event après modification
 * @returns {string[]}
 */
function getEventUpdateMessages(previous, event) {
  const changes = [];

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

  const prevStart = previous.date_start ? String(new Date(previous.date_start)) : null;
  const prevEnd = previous.date_end ? String(new Date(previous.date_end)) : null;
  const newStart = event.date_start ? String(new Date(event.date_start)) : null;
  const newEnd = event.date_end ? String(new Date(event.date_end)) : null;

  if (prevStart !== newStart || prevEnd !== newEnd) {
    changes.push(
      `La date ou l'horaire a été mis à jour (nouveau créneau : ${fmtDate(event.date_start)} → ${fmtDate(event.date_end)}).`
    );
  }

  const addressFields = ['address_full', 'address_city', 'address_country'];
  if (addressFields.some(f => previous[f] !== event[f])) {
    changes.push("Le lieu de l'événement a été mis à jour.");
  }

  const onlineFields = ['online_platform', 'online_link'];
  if (onlineFields.some(f => previous[f] !== event[f])) {
    changes.push("Les informations de connexion en ligne ont été mises à jour.");
  }

  return changes;
}

/**
 * Réinitialise les flags de notifications planifiées si les champs concernés ont changé.
 * Appelle event.update() si des champs doivent être réinitialisés.
 * @param {object} event — instance Sequelize Event (déjà sauvegardé)
 * @param {object} previous — snapshot avant modification
 */
async function resetScheduledNotificationFlags(event, previous) {
  const updates = {};

  const prevStart = previous.date_start ? String(new Date(previous.date_start)) : null;
  const newStart = event.date_start ? String(new Date(event.date_start)) : null;

  if (prevStart !== newStart) {
    for (const field of ['reminder_7d_sent_at', 'reminder_1d_sent_at', 'reminder_3h_sent_at', 'organizer_digest_sent_at']) {
      if (event[field] !== null) updates[field] = null;
    }
  }

  const addressRelated = ['address_full', 'address_city', 'address_country', 'address_visibility', 'address_reveal_date'];
  if (addressRelated.some(f => previous[f] !== event[f])) {
    if (event.address_reveal_email_sent_at !== null) updates.address_reveal_email_sent_at = null;
  }

  const onlineRelated = ['online_platform', 'online_link', 'online_visibility', 'online_reveal_date'];
  if (onlineRelated.some(f => previous[f] !== event[f])) {
    if (event.online_reveal_email_sent_at !== null) updates.online_reveal_email_sent_at = null;
  }

  if (Object.keys(updates).length > 0) {
    await event.update(updates);
  }
}

/**
 * Vérifie si l'event atteint un seuil de capacité (80% ou 100%) et envoie une alerte.
 * Gère aussi la réinitialisation des flags si la capacité redescend.
 * @param {object} event — instance Sequelize Event avec company chargée
 */
async function notifyEventCapacityMilestones(event) {
  if (event.status !== 'PUBLISHED' || event.unlimited_capacity || !event.capacity) {
    const updates = {};
    if (event.almost_full_notified_at !== null) updates.almost_full_notified_at = null;
    if (event.full_notified_at !== null) updates.full_notified_at = null;
    if (Object.keys(updates).length > 0) await event.update(updates);
    return;
  }

  const { Registration } = require('../models');
  const confirmedCount = await Registration.count({
    where: { event_id: event.id, status: 'CONFIRMED' },
  });
  const fillRatio = confirmedCount / event.capacity;
  const now = new Date();
  const updates = {};

  if (confirmedCount < event.capacity && event.full_notified_at !== null) {
    updates.full_notified_at = null;
  }
  if (fillRatio < 0.8 && event.almost_full_notified_at !== null) {
    updates.almost_full_notified_at = null;
  }

  if (confirmedCount >= event.capacity) {
    if (event.full_notified_at === null) {
      await sendEventCapacityAlert(event, 'FULL');
      updates.full_notified_at = now;
    }
  } else if (fillRatio >= 0.8 && event.almost_full_notified_at === null) {
    await sendEventCapacityAlert(event, 'ALMOST_FULL');
    updates.almost_full_notified_at = now;
  }

  if (Object.keys(updates).length > 0) await event.update(updates);
}

module.exports = {
  captureEventNotificationSnapshot,
  getEventUpdateMessages,
  resetScheduledNotificationFlags,
  notifyEventCapacityMilestones,
};

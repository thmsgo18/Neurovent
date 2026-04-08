'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  // ─── Organisateur ────────────────────────────────────────────────────
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },

  // ─── Infos de base ───────────────────────────────────────────────────
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  banner: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  date_start: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  date_end: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1 },
  },
  unlimited_capacity: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'CANCELLED'),
    defaultValue: 'DRAFT',
    allowNull: false,
  },
  view_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  // ─── Format & inscription ────────────────────────────────────────────
  format: {
    type: DataTypes.ENUM('ONSITE', 'ONLINE', 'HYBRID'),
    defaultValue: 'ONSITE',
    allowNull: false,
  },
  registration_mode: {
    type: DataTypes.ENUM('AUTO', 'VALIDATION'),
    defaultValue: 'AUTO',
    allowNull: false,
  },
  registration_deadline: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  allow_registration_during_event: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  // ─── Localisation (ONSITE / HYBRID) ─────────────────────────────────
  address_full: {
    type: DataTypes.STRING(300),
    defaultValue: '',
  },
  address_city: {
    type: DataTypes.STRING(100),
    defaultValue: '',
  },
  address_country: {
    type: DataTypes.STRING(100),
    defaultValue: '',
  },
  address_visibility: {
    type: DataTypes.ENUM('FULL', 'PARTIAL'),
    defaultValue: 'FULL',
  },
  address_reveal_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // ─── Lien en ligne (ONLINE / HYBRID) ────────────────────────────────
  online_platform: {
    type: DataTypes.STRING(100),
    defaultValue: '',
  },
  online_link: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  online_visibility: {
    type: DataTypes.ENUM('FULL', 'PARTIAL'),
    defaultValue: 'FULL',
  },
  online_reveal_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // ─── Suivi notifications email ──────────────────────────────────────────
  reminder_7d_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reminder_1d_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reminder_3h_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  address_reveal_email_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  online_reveal_email_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  almost_full_notified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  full_notified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  organizer_digest_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'events',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// ─── Propriétés calculées ────────────────────────────────────────────────────

Event.prototype.isRegistrationOpen = function () {
  const now = new Date();
  if (this.registration_deadline && now >= new Date(this.registration_deadline)) return false;
  if (now >= new Date(this.date_end)) return false;
  if (now >= new Date(this.date_start)) {
    // Event a commencé : seulement ONLINE/HYBRID si l'organisateur l'autorise
    return (
      this.allow_registration_during_event === true &&
      ['ONLINE', 'HYBRID'].includes(this.format)
    );
  }
  return true;
};

Event.prototype.getSpotsRemaining = function () {
  if (this.unlimited_capacity) return null;
  if (!this.registrations) return this.capacity;
  const confirmed = this.registrations.filter(r => r.status === 'CONFIRMED').length;
  return this.capacity - confirmed;
};

Event.prototype.getVisibleAddress = function () {
  if (!['ONSITE', 'HYBRID'].includes(this.format)) return null;
  const now = new Date();
  const revealPassed = this.address_reveal_date && now >= new Date(this.address_reveal_date);
  if (this.address_visibility === 'FULL' || revealPassed) {
    return {
      city: this.address_city,
      country: this.address_country,
      full: this.address_full,
      is_full_revealed: true,
    };
  }
  return {
    city: this.address_city,
    country: this.address_country,
    full: null,
    is_full_revealed: false,
  };
};

Event.prototype.getVisibleOnline = function () {
  if (!['ONLINE', 'HYBRID'].includes(this.format)) return null;
  const now = new Date();
  const revealPassed = this.online_reveal_date && now >= new Date(this.online_reveal_date);
  if (this.online_visibility === 'FULL' || revealPassed) {
    return {
      platform: this.online_platform,
      link: this.online_link,
      is_link_revealed: true,
    };
  }
  return {
    platform: this.online_platform,
    link: null,
    is_link_revealed: false,
  };
};

module.exports = Event;

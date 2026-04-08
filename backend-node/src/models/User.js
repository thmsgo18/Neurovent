'use strict';

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  // ─── Commun ──────────────────────────────────────────────────────────
  role: {
    type: DataTypes.ENUM('PARTICIPANT', 'COMPANY', 'ADMIN'),
    defaultValue: 'PARTICIPANT',
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_staff: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  // ─── Participant ─────────────────────────────────────────────────────
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
    validate: { isEmail: true },
  },
  first_name: {
    type: DataTypes.STRING(100),
    defaultValue: '',
  },
  last_name: {
    type: DataTypes.STRING(100),
    defaultValue: '',
  },
  employer_name: {
    type: DataTypes.STRING(200),
    defaultValue: '',
  },
  participant_profile_type: {
    type: DataTypes.ENUM('STUDENT', 'PROFESSIONAL'),
    defaultValue: 'STUDENT',
  },
  school_name: {
    type: DataTypes.STRING(200),
    defaultValue: '',
  },
  study_level: {
    type: DataTypes.STRING(120),
    defaultValue: '',
  },
  professional_company_name: {
    type: DataTypes.STRING(200),
    defaultValue: '',
  },
  job_title: {
    type: DataTypes.STRING(200),
    defaultValue: '',
  },
  job_started_at: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  participant_avatar_url: {
    type: DataTypes.STRING(500),
    defaultValue: '',
  },
  participant_bio: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  favorite_domain: {
    type: DataTypes.STRING(200),
    defaultValue: '',
  },
  personal_website_url: {
    type: DataTypes.STRING(500),
    defaultValue: '',
  },
  github_url: {
    type: DataTypes.STRING(500),
    defaultValue: '',
  },
  participant_linkedin_url: {
    type: DataTypes.STRING(500),
    defaultValue: '',
  },

  // ─── Company ─────────────────────────────────────────────────────────
  company_identifier: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: true,
    validate: {
      is: /^[a-zA-Z0-9\-]+$/,
      len: [3, 50],
    },
  },
  recovery_email: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  company_name: {
    type: DataTypes.STRING(200),
    defaultValue: '',
  },
  company_logo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  company_logo_url: {
    type: DataTypes.STRING(500),
    defaultValue: '',
  },
  company_description: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  website_url: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  youtube_url: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  linkedin_url: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  twitter_url: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  instagram_url: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  facebook_url: {
    type: DataTypes.STRING,
    defaultValue: '',
  },

  // ─── Vérification SIRENE ─────────────────────────────────────────────
  siret: {
    type: DataTypes.STRING(14),
    defaultValue: '',
  },
  legal_representative: {
    type: DataTypes.STRING(200),
    defaultValue: '',
  },
  verification_status: {
    type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW'),
    defaultValue: 'PENDING',
  },
  verification_source: {
    type: DataTypes.STRING(20),
    defaultValue: '',
  },
  verification_document: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  review_note: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'date_joined',
  updatedAt: 'updated_at',
});

// ─── Méthodes d'instance ─────────────────────────────────────────────────────

User.prototype.checkPassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

User.prototype.setPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(plainPassword, salt);
};

User.prototype.toPublicJSON = function () {
  const data = this.toJSON();
  delete data.password;
  return data;
};

User.prototype.getDisplayName = function () {
  if (this.role === 'COMPANY') return this.company_name || this.company_identifier || '';
  return `${this.first_name} ${this.last_name}`.trim() || this.email || '';
};

// ─── Hook: hash du mot de passe avant création/mise à jour ───────────────────

User.beforeCreate(async (user) => {
  if (user.password) {
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

module.exports = User;

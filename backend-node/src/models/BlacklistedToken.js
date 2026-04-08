'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * BlacklistedToken — Tokens JWT révoqués (logout).
 *
 * Équivalent Node.js du TokenBlacklist de djangorestframework-simplejwt.
 * Chaque entrée correspond à un refresh token invalidé lors d'un logout.
 */
const BlacklistedToken = sequelize.define('BlacklistedToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  blacklisted_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'blacklisted_tokens',
  timestamps: false,
});

module.exports = BlacklistedToken;

'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Registration = sequelize.define('Registration', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  participant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'events', key: 'id' },
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'WAITLIST'),
    defaultValue: 'PENDING',
    allowNull: false,
  },
  accessibility_needs: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  company_comment: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
}, {
  tableName: 'registrations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['participant_id', 'event_id'],
      name: 'unique_participant_event',
    },
  ],
});

module.exports = Registration;

'use strict';

const sequelize = require('../config/database');
const User = require('./User');
const Event = require('./Event');
const Registration = require('./Registration');
const Tag = require('./Tag');
const BlacklistedToken = require('./BlacklistedToken');

// ─── Tables de jointure ManyToMany ───────────────────────────────────────────

const UserTag = sequelize.define('UserTag', {}, {
  tableName: 'user_tags',
  timestamps: false,
});

const EventTag = sequelize.define('EventTag', {}, {
  tableName: 'event_tags',
  timestamps: false,
});

// ─── Associations ────────────────────────────────────────────────────────────

// User ↔ Tag (M2M)
User.belongsToMany(Tag, { through: UserTag, foreignKey: 'user_id', as: 'tags' });
Tag.belongsToMany(User, { through: UserTag, foreignKey: 'tag_id', as: 'users' });

// Event ↔ Tag (M2M)
Event.belongsToMany(Tag, { through: EventTag, foreignKey: 'event_id', as: 'tags' });
Tag.belongsToMany(Event, { through: EventTag, foreignKey: 'tag_id', as: 'events' });

// Event → User (company)
Event.belongsTo(User, { foreignKey: 'company_id', as: 'company' });
User.hasMany(Event, { foreignKey: 'company_id', as: 'events' });

// Registration → User (participant)
Registration.belongsTo(User, { foreignKey: 'participant_id', as: 'participant' });
User.hasMany(Registration, { foreignKey: 'participant_id', as: 'registrations' });

// Registration → Event
Registration.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
Event.hasMany(Registration, { foreignKey: 'event_id', as: 'registrations' });

module.exports = {
  sequelize,
  User,
  Event,
  Registration,
  Tag,
  BlacklistedToken,
  UserTag,
  EventTag,
};

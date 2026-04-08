'use strict';

const { Sequelize } = require('sequelize');
const path = require('path');

const dialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;

if (dialect === 'sqlite') {
  const storage = process.env.DB_STORAGE === ':memory:'
    ? ':memory:'
    : process.env.DB_STORAGE
      ? path.resolve(process.cwd(), process.env.DB_STORAGE)
      : path.join(__dirname, '../../neurovent.sqlite');

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    }
  );
}

module.exports = sequelize;

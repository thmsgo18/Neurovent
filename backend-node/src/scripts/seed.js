'use strict';

/**
 * seed.js — Pré-remplit la base de données avec les tags curatés.
 * Équivalent de la migration Django 0002_seed_curated_topics.
 *
 * Usage : node src/scripts/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { sequelize, Tag } = require('../models');

const CURATED_TOPICS = [
  'Neuroscience', 'Cognitive Neuroscience', 'Computational Neuroscience',
  'Neuroimaging', 'Brain-Computer Interfaces', 'Neural Engineering',
  'Neurotechnology', 'Cognitive Science', 'Psychology', 'Behavioral Science',
  'Digital Health', 'Mental Health Research', 'Clinical Research',
  'Biostatistics', 'Bioinformatics', 'Systems Biology', 'Genomics',
  'Biomedical Engineering', 'Medical Imaging', 'Public Health', 'Epidemiology',
  'Ethics in AI', 'Responsible AI', 'AI Safety', 'Trustworthy AI',
  'Explainable AI', 'Machine Learning', 'Deep Learning',
  'Natural Language Processing', 'Computer Vision', 'Reinforcement Learning',
  'Robotics', 'Human-Computer Interaction', 'Federated Learning', 'Privacy',
  'Differential Privacy', 'Cybersecurity', 'Data Governance', 'Data Science',
  'Causal Inference', 'Statistics', 'Optimization', 'Signal Processing',
  'Wearable Sensors', 'Assistive Technologies', 'Health Informatics',
  'Scientific Reproducibility', 'Open Science', 'Research Methods',
  'Innovation in Healthcare',
];

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    let created = 0;
    for (const name of CURATED_TOPICS) {
      const [, wasCreated] = await Tag.findOrCreate({ where: { name } });
      if (wasCreated) created++;
    }

    console.log(`Seed terminé. ${created} nouveaux tags créés, ${CURATED_TOPICS.length - created} déjà présents.`);
    process.exit(0);
  } catch (err) {
    console.error('Erreur lors du seed :', err);
    process.exit(1);
  }
}

seed();

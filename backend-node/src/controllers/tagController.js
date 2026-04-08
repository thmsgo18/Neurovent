'use strict';

const { Tag } = require('../models');

async function listTags(req, res) {
  const tags = await Tag.findAll({ order: [['name', 'ASC']] });
  return res.json(tags.map(t => ({ id: t.id, name: t.name })));
}

async function createTag(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ name: 'Le nom du tag est requis.' });
  }

  const existing = await Tag.findOne({ where: { name: name.trim() } });
  if (existing) return res.status(400).json({ name: 'Ce tag existe déjà.' });

  const tag = await Tag.create({ name: name.trim() });
  return res.status(201).json({ id: tag.id, name: tag.name });
}

async function deleteTag(req, res) {
  const tag = await Tag.findByPk(req.params.id);
  if (!tag) return res.status(404).json({ error: 'Tag introuvable.' });
  await tag.destroy();
  return res.status(204).send();
}

module.exports = { listTags, createTag, deleteTag };

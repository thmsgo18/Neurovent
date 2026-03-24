const db = require('../db/database');

// GET /api/tags/ — liste publique
exports.listTags = (req, res) => {
  const tags = db.prepare('SELECT id, name, created_at FROM tags ORDER BY name').all();
  return res.json(tags);
};

// POST /api/tags/create/ — admin uniquement
exports.createTag = (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Le nom du tag est requis.' });
  }

  const existing = db.prepare('SELECT id FROM tags WHERE lower(name) = lower(?)').get(name.trim());
  if (existing) {
    return res.status(400).json({ error: 'Un tag avec ce nom existe déjà.' });
  }

  const result = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name.trim());
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(tag);
};

// DELETE /api/tags/:id/delete/ — admin uniquement
exports.deleteTag = (req, res) => {
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
  if (!tag) return res.status(404).json({ error: 'Tag introuvable.' });

  db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
  return res.status(204).send();
};

'use strict';

require('dotenv').config();

const app = require('./app');
const { sequelize } = require('./src/models');

const PORT = process.env.PORT || 8001;

async function start() {
  try {
    // Synchroniser les modèles avec la base de données
    // En production, utiliser des migrations Sequelize plutôt que sync({ alter: true })
    await sequelize.authenticate();
    console.log('Connexion à la base de données établie.');

    await sequelize.sync({ alter: true });
    console.log('Modèles synchronisés avec la base de données.');

    // Créer le compte admin par défaut s'il n'existe pas
    const { User } = require('./src/models');
    const bcrypt = require('bcryptjs');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@neurovent.com';
    const existing = await User.findOne({ where: { email: adminEmail } });
    if (!existing) {
      const salt = await bcrypt.genSalt(12);
      const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', salt);
      await User.create({
        role: 'ADMIN',
        email: adminEmail,
        password: hashed,
        first_name: 'Admin',
        last_name: 'Neurovent',
        is_staff: true,
        is_active: true,
      });
      console.log(`Compte admin créé : ${adminEmail}`);
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 Neurovent Node.js API démarrée sur http://localhost:${PORT}`);
      console.log(`   Health check : http://localhost:${PORT}/api/health/`);
      console.log(`   Environnement : ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (err) {
    console.error('Impossible de démarrer le serveur :', err);
    process.exit(1);
  }
}

start();

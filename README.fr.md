<div align="center">

[🇬🇧 English](./README.md) · [🇫🇷 Français](./README.fr.md)

# Neurovent

**La plateforme de gestion d'événements pour les communautés scientifiques et tech.**

[![Django](https://img.shields.io/badge/Django-6.0-0C4B33?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.16-A30000?style=for-the-badge&logo=django&logoColor=white)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Sequelize](https://img.shields.io/badge/Sequelize-6-52B0E7?style=for-the-badge&logo=sequelize&logoColor=white)](https://sequelize.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-45ba4b?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Render](https://img.shields.io/badge/Render-Backend-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://render.com/)

---

🌐 **[Démo en ligne](https://neurovent-web.vercel.app)** · 📖 **[Documentation API](https://neurovent-api.onrender.com/api/docs/)** · 📄 **[Rapport de projet](./Project_Report_EventHub_Neurovent_Prog_web.pdf)**

</div>

---

## Qu'est-ce que Neurovent ?

Organiser des événements scientifiques — conférences, ateliers, séminaires — est bien plus complexe qu'il n'y paraît. Chercheurs et institutions ont besoin d'annoncer des événements, de gérer des inscriptions avec des limites de capacité, de traiter des listes d'attente, de valider des participants et de communiquer clairement à chaque étape. La plupart des outils généralistes sont soit trop limités, soit trop lourds pour les besoins spécifiques des communautés académiques et scientifiques.

**Neurovent** est une plateforme dédiée qui couvre le cycle de vie complet d'un événement :

- Les **organisations** créent et gèrent des événements, contrôlent les modes d'inscription, examinent les candidatures et exportent leurs données.
- Les **participants** parcourent les événements, s'inscrivent en un clic, suivent l'état de leur inscription et rejoignent automatiquement les listes d'attente lorsque la capacité est atteinte.
- Les **administrateurs** supervisent toute la plateforme : vérification des organisations, modération du contenu, gestion des utilisateurs et suivi des statistiques.

Le projet a été réalisé dans le cadre du cours de Programmation Web du M1 IAD-VMI à l'Université Paris Cité (2025–2026). Il implémente intentionnellement la même API REST **deux fois** — une fois avec Django/DRF et une fois avec Express.js/Sequelize — pour comparer les deux écosystèmes côte à côte.

---

## Vue d'ensemble de l'architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Navigateur utilisateur                 │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│              React 19 SPA  (Vercel)                     │
│  • Routage par rôle  • Auth JWT  • i18n (FR/EN)         │
└────────────────────────┬────────────────────────────────┘
                         │ Appels REST API
          ┌──────────────┴──────────────┐
          │                             │
┌─────────▼──────────┐       ┌──────────▼───────────────┐
│  Django + DRF      │       │  Express.js + Sequelize  │
│  (API principale)  │       │  (Implémentation         │
│  Render — Python   │       │   parallèle, comparaison)│
└─────────┬──────────┘       └──────────────────────────┘
          │
┌─────────▼──────────┐
│  PostgreSQL        │
│  (Render — EU)     │
└────────────────────┘
```

Le frontend est une application monopage qui cible le backend Django en production. Le backend Node.js expose une API identique et sert de référence pour la comparaison.

---

## Stack technique

### Frontend
| Technologie | Rôle |
|---|---|
| React 19 | Framework UI |
| React Router v6 | Routage côté client & garde-routes |
| Lucide React / React Icons | Bibliothèques d'icônes |
| CSS (natif) | Style — sans framework |
| Playwright | Tests end-to-end |

### Backend — Django (Principal)
| Technologie | Rôle |
|---|---|
| Django 6 | Framework web |
| Django REST Framework | API REST |
| SimpleJWT + token blacklist | Auth JWT & déconnexion sécurisée |
| django-filter | Filtrage des requêtes |
| drf-spectacular | Documentation Swagger/ReDoc auto-générée |
| django-cors-headers | Gestion du CORS |
| Pillow | Traitement des images |
| WhiteNoise | Service des fichiers statiques |
| Gunicorn | Serveur WSGI |
| PostgreSQL / SQLite | Base de données (prod / dev) |

### Backend — Node.js (Alternatif)
| Technologie | Rôle |
|---|---|
| Express.js 4 | Framework HTTP |
| Sequelize 6 | ORM |
| jsonwebtoken | JWT |
| bcryptjs | Hachage des mots de passe |
| Nodemailer | Envoi d'e-mails |
| Multer | Upload de fichiers |
| SQLite | Base de données (dev) |

---

## Démarrage rapide

### Prérequis

- Python 3.11+
- Node.js 18+
- npm 9+

---

### 1. Cloner le dépôt

```bash
git clone https://github.com/thmsgo18/Neurovent.git
cd Neurovent
```

---

### 2. Backend Django (Principal)

```bash
cd backend-django

# Créer et activer un environnement virtuel
python3 -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows

# Installer les dépendances
pip install -r requirements.txt

# Appliquer les migrations
python manage.py migrate

# (Optionnel) Peupler la base avec des données de démonstration
python scripts/reset_and_seed_demo.py

# Lancer le serveur de développement
python manage.py runserver
```

L'API est disponible aux adresses suivantes :

| URL | Description |
|---|---|
| `http://127.0.0.1:8000/api/` | Racine de l'API REST |
| `http://127.0.0.1:8000/api/docs/` | Swagger UI |
| `http://127.0.0.1:8000/api/redoc/` | ReDoc |
| `http://127.0.0.1:8000/admin/` | Interface d'administration Django |

---

### 3. Frontend React

```bash
cd frontend-react

# Installer les dépendances
npm install

# Créer le fichier d'environnement local
echo "REACT_APP_API_BASE=http://localhost:8000" > .env

# Lancer le serveur de développement
npm start
```

L'application s'ouvre sur `http://localhost:3000`.

---

### 4. Backend Node.js (Optionnel)

```bash
cd backend-node

npm install

# Configurer les variables d'environnement
cp .env.example .env   # puis éditer .env selon vos besoins

npm run dev            # démarre sur le port 8001
```

---

### 5. Tests end-to-end

```bash
# Depuis la racine du dépôt
npm run qa:install     # Installer Playwright + Chromium (première fois uniquement)
npm run qa:test        # Lancer tous les tests E2E
npm run qa:ui          # Ouvrir l'interface graphique Playwright
npm run qa:record      # Enregistrer de nouvelles interactions
npm run qa:inspect     # Inspecter les tests enregistrés
```

---

### Comptes de démonstration

Après l'exécution du script de seed, les comptes suivants sont disponibles :

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Participant | `amelie.rousseau@participants.neurovent.demo` | `Participant2026!` |
| Organisation | `atlas-neuro-labs` | `Company2026!` |
| Administrateur | `admin@neurovent.demo` | `Admin2026!` |

---

## Référence API

L'API complète est auto-documentée. Avec le backend Django en cours d'exécution, ouvrez :

- **Swagger UI :** `http://localhost:8000/api/docs/`
- **ReDoc :** `http://localhost:8000/api/redoc/`

### Principaux groupes d'endpoints

| Endpoint | Description |
|---|---|
| `POST /api/auth/register/participant/` | Inscription en tant que participant |
| `POST /api/auth/register/company/` | Inscription en tant qu'organisation |
| `POST /api/auth/login/participant/` | Connexion (participant) |
| `POST /api/auth/login/company/` | Connexion (organisation) |
| `GET /api/events/` | Parcourir les événements (filtrable, paginé) |
| `POST /api/events/create/` | Créer un événement *(COMPANY)* |
| `POST /api/registrations/create/` | S'inscrire à un événement *(PARTICIPANT)* |
| `GET /api/events/dashboard-stats/` | Tableau de bord organisation *(COMPANY)* |
| `GET /api/admin/users/` | Gestion des utilisateurs *(ADMIN)* |

---

## Pipeline de déploiement

Le projet utilise un modèle de **déploiement continu sans configuration** : chaque push sur `main` déclenche automatiquement un nouveau déploiement sur les deux plateformes.

```
git push origin main
       │
       ├──► Vercel détecte un changement dans frontend-react/
       │     Build :  npm run build
       │     Serve :  CDN statique (réseau edge mondial)
       │     URL :    https://neurovent-web.vercel.app
       │
       └──► Render détecte un changement dans backend-django/
             Build :  pip install -r requirements.txt
                      python manage.py collectstatic --noinput
                      python manage.py migrate
             Start :  gunicorn config.wsgi:application
             URL :    https://neurovent-api.onrender.com
```

### Variables d'environnement

#### Frontend (Vercel)
| Variable | Valeur |
|---|---|
| `REACT_APP_API_BASE` | `https://neurovent-api.onrender.com` |

#### Backend (Render)
| Variable | Description |
|---|---|
| `SECRET_KEY` | Clé secrète Django |
| `DEBUG` | `False` en production |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `FRONTEND_URL` | URL du frontend (pour les liens dans les e-mails) |
| `CORS_ALLOWED_ORIGINS` | Origines autorisées séparées par des virgules |
| `ALLOWED_HOSTS` | Hôtes autorisés séparés par des virgules |
| `EMAIL_HOST` | Hôte SMTP *(optionnel)* |
| `EMAIL_HOST_USER` | Utilisateur SMTP *(optionnel)* |
| `EMAIL_HOST_PASSWORD` | Mot de passe SMTP *(optionnel)* |

> Si `EMAIL_HOST` n'est pas défini, le contenu des e-mails est affiché dans le terminal au lieu d'être envoyé — pratique pour le développement local.

---

## Fonctionnalités & Rôles

> Pour une description complète de toutes les fonctionnalités et des choix de conception, consulter le 📄 [Rapport de projet](./Project_Report_EventHub_Neurovent_Prog_web.pdf).

---

### Participant

Les participants sont des individus (chercheurs, étudiants, professionnels) qui découvrent et assistent aux événements.

**Compte & profil**
- Créer un compte avec e-mail et mot de passe
- Uploader une photo de profil, renseigner une bio et des coordonnées
- Changer son mot de passe ou le réinitialiser par e-mail
- Supprimer son compte (conformité RGPD)

**Découverte des événements**
- Parcourir tous les événements publiés avec pagination
- Filtrer par format (conférence, atelier, séminaire…), tags thématiques, plage de dates, ville ou pays
- Recherche plein texte sur les titres et descriptions
- Consulter la page détaillée d'un événement : description, organisateur, lieu, capacité, places restantes

**Inscriptions**
- S'inscrire à un événement en un clic
- Suivre l'état de son inscription en temps réel : `En attente` · `Confirmée` · `Refusée` · `Annulée` · `Liste d'attente`
- Annuler une inscription à tout moment
- Rejoindre la liste d'attente automatiquement si l'événement est complet — être promu et notifié par e-mail dès qu'une place se libère

---

### Organisation

Les organisations sont des institutions (laboratoires, entreprises, associations) qui créent et gèrent des événements.

**Compte & vérification**
- S'inscrire avec un identifiant unique et un numéro SIRET
- L'activation du compte est soumise à une vérification par l'administrateur
- Uploader un logo, ajouter une description et des informations de contact

**Gestion des événements**
- Créer des événements avec : titre, description, format, tags thématiques, date & heure, lieu, capacité, image de bannière
- Choisir un mode d'inscription :
  - **Direct** — les inscriptions sont confirmées immédiatement
  - **Validation** — chaque inscription doit être approuvée ou refusée manuellement
- Modifier ou annuler un événement à tout moment (tous les participants inscrits sont notifiés par e-mail)
- Dépublier un événement pour le retirer de la liste publique

**Gestion des participants**
- Consulter toutes les inscriptions pour chaque événement
- Approuver ou refuser les demandes en attente (mode Validation)
- Retirer manuellement un participant d'un événement
- Exporter la liste complète des participants au format **CSV**

**Tableau de bord & statistiques**
- Tableau de bord global : nombre d'événements, inscriptions totales, taux de remplissage
- Statistiques par événement : compteurs confirmés / en attente / refusés / liste d'attente
- Export d'un résumé de performance en CSV sur l'ensemble des événements

---

### Administrateur

Les administrateurs ont une vision globale et un contrôle total sur la plateforme.

**Gestion des utilisateurs**
- Consulter tous les utilisateurs inscrits (participants et organisations)
- Activer ou désactiver n'importe quel compte
- Supprimer des comptes si nécessaire

**Vérification des organisations**
- Examiner les demandes d'inscription des organisations
- Approuver ou rejeter en fonction du SIRET et des documents fournis
- Les organisations rejetées reçoivent un e-mail explicatif

**Supervision de la plateforme**
- Consulter les statistiques globales de la plateforme
- Accéder à l'interface d'administration Django pour la gestion bas niveau des données

---

### Fonctionnalités transversales

**Notifications e-mail**
Chaque étape clé du cycle de vie déclenche un e-mail automatique :
confirmation / refus d'inscription, annulation d'événement, promotion depuis la liste d'attente, réinitialisation de mot de passe, résultat de vérification d'organisation.

**Cycle de vie d'une inscription**

```
        ┌──────────────────────────────┐
        │     Événement complet ?      │
        │   OUI → LISTE D'ATTENTE      │
        │   NON ↓                      │
        │  Mode Direct ?               │
        │   OUI → CONFIRMÉE            │
        │   NON → EN ATTENTE           │
        │          │                   │
        │    L'organisation            │
        │    examine                   │
        │    ├─ Approuve → CONFIRMÉE   │
        │    └─ Refuse  → REFUSÉE      │
        └──────────────────────────────┘
Annulation à n'importe quelle étape → ANNULÉE
En attente → CONFIRMÉE si une place se libère
```

**Interface bilingue**
Le frontend intègre un support complet **français / anglais** via un système i18n. Les utilisateurs changent de langue à tout moment sans rechargement de page.

---

## Structure du projet

```
Neurovent/
├── backend-django/          # API REST principale (Python / Django)
│   ├── config/              # Paramètres, URLs, WSGI
│   ├── users/               # Auth, profils, outils admin
│   ├── events/              # CRUD événements, stats, export CSV
│   ├── registrations/       # Cycle de vie des inscriptions & liste d'attente
│   ├── tags/                # Taxonomie des sujets
│   ├── scripts/             # Générateur de données de démo
│   └── templates/emails/    # Templates d'e-mails transactionnels
│
├── backend-node/            # API REST alternative (Node.js / Express)
│   ├── src/
│   │   ├── models/          # Modèles Sequelize
│   │   ├── controllers/     # Logique métier
│   │   ├── routes/          # Routeurs Express
│   │   ├── middleware/       # Auth, permissions, upload de fichiers
│   │   └── services/        # E-mail, SIRENE, blacklist de tokens
│   └── server.js
│
├── frontend-react/          # SPA React 19
│   ├── src/
│   │   ├── api/             # Clients API
│   │   ├── components/      # Composants UI réutilisables
│   │   ├── pages/           # Pages des routes
│   │   ├── store/           # État auth (JWT + rôle)
│   │   ├── i18n/            # Traductions FR / EN
│   │   └── App.js           # Définition des routes
│   └── public/
│
├── playwright-tests/        # Suite de tests E2E
├── playwright.config.cjs    # Configuration Playwright
└── scripts/                 # Utilitaires pour les tests
```

---

## Auteurs

| | Nom | GitHub |
|---|---|---|
| | Thomas Gourmelen | [@thmsgo18](https://github.com/thmsgo18) |
| | Noureddine Mohammedi | [@Mr-Noredine](https://github.com/Mr-Noredine) |
| | Azouaou Zouaoui | [@Azouaou1](https://github.com/Azouaou1) |

M1 IAD · Université Paris Cité · Programmation Web 2025–2026

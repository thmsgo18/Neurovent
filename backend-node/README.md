# Neurovent — Backend Node.js / Express

API REST Node.js construite avec **Express.js** + **Sequelize** + **SQLite**.
Réplique fidèle du backend Django — mêmes endpoints, même logique métier, même contrat API.

---

## Sommaire

1. [Stack technique](#stack-technique)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Démarrage](#démarrage)
5. [Endpoints API](#endpoints-api)
6. [Architecture](#architecture)
7. [Logique métier clé](#logique-métier-clé)
8. [Comparaison Django vs Node.js](#comparaison-django-vs-nodejs)

---

## Stack technique

| Composant | Django (Thomas) | Node.js (Azouaou) |
|-----------|-----------------|-------------------|
| Framework | Django 6 + DRF | Express.js 4 |
| ORM | Django ORM | Sequelize 6 |
| Base de données | SQLite (dev) | SQLite (dev) |
| Auth | JWT simplejwt | jsonwebtoken |
| Upload fichiers | Pillow + ImageField | Multer |
| Emails | Django core mail | Nodemailer |
| CORS | django-cors-headers | cors |
| Filtres | django-filter | logique manuelle |
| Docs API | drf-spectacular (Swagger) | — |

**Dépendances Node.js :**
```
express          — Framework HTTP
sequelize        — ORM (SQLite / PostgreSQL)
sqlite3          — Driver SQLite
jsonwebtoken     — Génération et vérification JWT
bcryptjs         — Hachage des mots de passe
nodemailer       — Envoi d'emails (SMTP Gmail)
multer           — Upload de fichiers (images, documents)
cors             — Cross-Origin Resource Sharing
axios            — Client HTTP (appel API SIRENE)
string-similarity — Comparaison de noms entreprise (vérification SIRENE)
dotenv           — Variables d'environnement
csv-writer       — Export CSV
uuid             — Génération d'identifiants uniques
```

---

## Installation

```bash
cd backend-node
npm install
```

---

## Configuration

Copier le fichier `.env.example` et le remplir :

```bash
cp .env.example .env
```

Variables importantes :

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du serveur | `8001` |
| `JWT_SECRET` | Clé secrète JWT — **changer en prod** | — |
| `JWT_ACCESS_EXPIRES` | Durée de vie du token d'accès | `2h` |
| `JWT_REFRESH_EXPIRES` | Durée de vie du refresh token | `7d` |
| `EMAIL_HOST_USER` | Adresse Gmail SMTP | — |
| `EMAIL_HOST_PASSWORD` | Mot de passe d'application Google (16 car.) | — |
| `FRONTEND_URL` | URL du frontend React (pour les emails) | `http://localhost:5173` |
| `ADMIN_EMAIL` | Email du compte admin initial | `admin@neurovent.com` |
| `ADMIN_PASSWORD` | Mot de passe du compte admin initial | `admin123` |

---

## Démarrage

```bash
# Développement (rechargement automatique avec nodemon)
npm run dev

# Production
npm start

# Pré-remplir les tags curatés (neurosciences, ML, IA...)
npm run seed
```

Le serveur démarre sur `http://localhost:8001`.

Au premier démarrage :
- La base SQLite est créée automatiquement (`neurovent.sqlite`)
- Tous les modèles sont synchronisés
- Un compte admin est créé si `ADMIN_EMAIL` n'existe pas

---

## Endpoints API

Base URL : `http://localhost:8001`
Authentification : `Authorization: Bearer <access_token>`

### Authentification (`/api/auth/`)

| Méthode | URL | Accès | Description |
|---------|-----|-------|-------------|
| POST | `/api/auth/register/participant/` | Public | Inscription participant |
| POST | `/api/auth/register/company/` | Public | Inscription company (déclenche vérification SIRENE) |
| POST | `/api/auth/login/participant/` | Public | Login participant (email + password) |
| POST | `/api/auth/login/company/` | Public | Login company (identifier + password) |
| POST | `/api/auth/token/refresh/` | Public | Obtenir un nouveau access token |
| POST | `/api/auth/logout/` | Connecté | Blackliste le refresh token |
| GET | `/api/auth/me/` | Connecté | Voir son profil |
| PATCH | `/api/auth/me/` | Connecté | Modifier son profil (supporte multipart pour le logo) |
| DELETE | `/api/auth/me/` | Connecté | Suppression compte RGPD (anonymisation) |
| PATCH | `/api/auth/me/password/` | Connecté | Changer son mot de passe |
| POST | `/api/auth/password-reset/` | Public | Demande de reset par email |
| POST | `/api/auth/password-reset/confirm/` | Public | Confirmer le reset avec le token |
| PATCH | `/api/auth/me/verification/document/` | Company | Upload Kbis/RNE |
| GET | `/api/auth/admin/stats/` | Admin | Statistiques globales plateforme |
| GET | `/api/auth/admin/users/` | Admin | Liste utilisateurs (`?role=`, `?is_active=`, `?page=`) |
| PATCH | `/api/auth/admin/users/:id/suspend/` | Admin | Suspendre un compte |
| PATCH | `/api/auth/admin/users/:id/activate/` | Admin | Réactiver un compte |
| DELETE | `/api/auth/admin/users/:id/delete/` | Admin | Suppression RGPD forcée |
| GET | `/api/auth/admin/companies/pending/` | Admin | Companies en attente (`?status=`) |
| PATCH | `/api/auth/admin/companies/:id/verify/` | Admin | Vérifier manuellement une company |

### Événements (`/api/events/`)

| Méthode | URL | Accès | Description |
|---------|-----|-------|-------------|
| GET | `/api/events/` | Public | Liste events PUBLISHED (paginée, filtrée) |
| GET | `/api/events/:id/` | Public | Détail event (incrémente view_count) |
| POST | `/api/events/create/` | Company VERIFIED | Créer un event (multipart pour bannière) |
| PUT/PATCH | `/api/events/:id/update/` | Company owner | Modifier un event |
| DELETE | `/api/events/:id/delete/` | Company owner | Supprimer un event |
| GET | `/api/events/my-events/` | Company | Tous ses events (tous statuts) |
| GET | `/api/events/:id/stats/` | Company owner / Admin | Stats d'un event |
| GET | `/api/events/recommended/` | Participant | Events recommandés selon ses tags |
| GET | `/api/events/dashboard-stats/` | Company / Admin | Stats dashboard |
| GET | `/api/events/dashboard-stats/export-summary/` | Company / Admin | Export CSV résumé |
| GET | `/api/events/dashboard-stats/export-performance/` | Company / Admin | Export CSV performance |

**Filtres disponibles sur `GET /api/events/` :**
```
?format=ONSITE|ONLINE|HYBRID
?tags=1&tags=2          → events avec au moins un de ces tags
?date_after=2026-04-01  → events démarrant après cette date
?date_before=2026-05-01 → events démarrant avant cette date
?city=Paris
?country=France
?search=neurosciences   → recherche dans titre + description
?ordering=date_start    → tri croissant (défaut)
?ordering=-date_start   → tri décroissant
?page=2                 → page 2 (10 events par page)
?status=DRAFT           → admin uniquement
```

### Inscriptions (`/api/registrations/`)

| Méthode | URL | Accès | Description |
|---------|-----|-------|-------------|
| POST | `/api/registrations/` | Participant | S'inscrire à un event |
| GET | `/api/registrations/my/` | Participant | Ses inscriptions (`?status=`) |
| PATCH | `/api/registrations/:id/cancel/` | Participant | Annuler son inscription |
| GET | `/api/registrations/event/:id/` | Company | Inscrits d'un event |
| PATCH | `/api/registrations/:id/status/` | Company / Admin | Confirmer ou rejeter |
| PATCH | `/api/registrations/:id/remove/` | Company / Admin | Retirer manuellement |
| GET | `/api/registrations/event/:id/export/` | Company owner / Admin | Export CSV des inscrits |

### Tags (`/api/tags/`)

| Méthode | URL | Accès | Description |
|---------|-----|-------|-------------|
| GET | `/api/tags/` | Public | Liste de tous les tags |
| POST | `/api/tags/create/` | Admin | Créer un tag |
| DELETE | `/api/tags/:id/delete/` | Admin | Supprimer un tag |

### Companies (`/api/companies/`)

| Méthode | URL | Accès | Description |
|---------|-----|-------|-------------|
| GET | `/api/companies/:id/` | Public | Profil public + events publiés |

---

## Architecture

```
backend-node/
├── server.js              ← Point d'entrée — démarrage, sync DB, compte admin
├── app.js                 ← Configuration Express (CORS, middlewares, routes)
├── package.json
├── .env.example
├── media/                 ← Fichiers uploadés (créé automatiquement)
│   ├── logos/             ← Logos des companies
│   ├── banners/           ← Bannières des events
│   └── verification_docs/ ← Kbis / RNE
└── src/
    ├── config/
    │   ├── database.js    ← Configuration Sequelize (SQLite / PostgreSQL)
    │   └── email.js       ← Configuration Nodemailer (SMTP)
    ├── models/
    │   ├── index.js       ← Associations entre modèles (équiv. Django ForeignKey/M2M)
    │   ├── User.js        ← CustomUser (PARTICIPANT | COMPANY | ADMIN)
    │   ├── Event.js       ← Event avec propriétés calculées
    │   ├── Registration.js ← Registration avec contrainte unique_together
    │   └── Tag.js         ← Tag
    ├── middleware/
    │   ├── auth.js        ← Vérification JWT (authenticate, optionalAuthenticate)
    │   ├── permissions.js ← Guards par rôle (requireParticipant, requireCompany...)
    │   └── upload.js      ← Multer pour logos, bannières, documents
    ├── services/
    │   ├── emailService.js  ← Centralisation emails (≡ emails.py Django)
    │   ├── sireneService.js ← Vérification SIRET via API Annuaire Entreprises
    │   └── tokenBlacklist.js ← Blacklist refresh tokens (logout)
    ├── controllers/
    │   ├── authController.js          ← Auth, profil, admin users
    │   ├── eventController.js         ← CRUD events, stats, dashboard
    │   ├── registrationController.js  ← Inscriptions, waitlist, export
    │   ├── tagController.js           ← CRUD tags
    │   └── companyController.js       ← Profil public company
    ├── routes/
    │   ├── auth.js          ← /api/auth/*
    │   ├── events.js        ← /api/events/*
    │   ├── registrations.js ← /api/registrations/*
    │   ├── tags.js          ← /api/tags/*
    │   └── companies.js     ← /api/companies/*
    └── scripts/
        └── seed.js          ← Pré-remplit les 50 tags curatés
```

---

## Logique métier clé

### JWT — Claims personnalisés

**Participant :**
```json
{ "user_id": 1, "role": "PARTICIPANT", "email": "...", "first_name": "...", "last_name": "..." }
```

**Company :**
```json
{ "user_id": 2, "role": "COMPANY", "company_name": "...", "company_identifier": "..." }
```

- Access token : 2h
- Refresh token : 7 jours
- Logout : blackliste le refresh token en mémoire

### Inscription & Liste d'attente

| Scénario | Résultat |
|----------|---------|
| Mode AUTO + places disponibles | `CONFIRMED` immédiat + email |
| Mode AUTO + event complet | `WAITLIST` (liste d'attente) |
| Mode VALIDATION + places disponibles | `PENDING` (la company confirme/rejette) |
| Mode VALIDATION + event complet | Erreur 400 |

Quand une inscription passe à `CANCELLED` ou `REJECTED` :
- Le premier participant en `WAITLIST` (par `created_at`) est automatiquement promu à `CONFIRMED`
- Un email "place libérée" lui est envoyé

### Réinscription après annulation

Si un participant tente de se réinscrire à un event auquel il avait déjà participé (`CANCELLED` ou `REJECTED`) :
- L'inscription existante est **réactivée** (pas de nouvelle ligne)
- Évite la contrainte `unique_together` (participant, event)

### Vérification SIRENE

À chaque inscription company :
1. Appel à `https://api.annuaire-entreprises.data.gouv.fr/etablissement/{siret}`
2. Vérification que l'établissement est actif (`etat_administratif = 'A'`)
3. Comparaison du nom déclaré avec le nom officiel (seuil : 70% de similarité)
4. Résultats : `VERIFIED` | `NEEDS_REVIEW` | `REJECTED`
5. Email de notification envoyé à `recovery_email`

### Suppression RGPD

- **Par l'utilisateur** (`DELETE /api/auth/me/`) : anonymisation données + `is_active = false`
- **Par l'admin** (`DELETE /api/auth/admin/users/:id/delete/`) : même processus
- **Suspension admin** (`PATCH /api/auth/admin/users/:id/suspend/`) : `is_active = false` seulement, réversible

### Visibilité adresse / lien en ligne

| Visibilité | Résultat |
|------------|---------|
| `FULL` | Toujours visible complètement |
| `PARTIAL` sans `reveal_date` | Ville + pays ou nom plateforme seulement |
| `PARTIAL` + `reveal_date` passée | Révèle l'adresse/lien complet |

### Emails

Toutes les fonctions d'email sont centralisées dans `src/services/emailService.js`.
Équivalent exact de `emails.py` Django.

| Fonction | Déclencheur |
|----------|------------|
| `sendRegistrationConfirmed` | Inscription confirmée (direct ou depuis waitlist) |
| `sendRegistrationRejected` | Inscription rejetée par la company |
| `sendRegistrationRemovedByOrganizer` | Retrait manuel par l'organisateur |
| `sendEventCancelled` | Event annulé (tous les inscrits actifs) |
| `sendPasswordReset` | Demande de reset mot de passe |
| `sendCompanyVerificationResult` | Résultat vérification SIRENE |

Les emails échouent silencieusement — l'opération principale n'est pas bloquée.

---

## Comparaison Django vs Node.js

| Critère | Django | Node.js |
|---------|--------|---------|
| **ORM** | Django ORM (Python) | Sequelize (JS) |
| **Migrations** | Auto-générées | `sync({ alter: true })` en dev |
| **Validation** | Serializers DRF | Logique manuelle dans les controllers |
| **Permissions** | Classes BasePermission | Middleware fonctions |
| **Pagination** | DRF Pagination | Manuelle (limit/offset) |
| **Filtres** | django-filter | Logique manuelle dans les queries |
| **Admin** | Interface Django Admin | Endpoints REST `/api/auth/admin/` |
| **Docs API** | Swagger auto (drf-spectacular) | README |
| **Tests** | 96 tests Django (unittest) | — |
| **Async** | Synchrone (WSGI/ASGI) | Asynchrone natif (event loop) |
| **Déploiement** | Gunicorn | Node.js natif |

### Points forts du backend Node.js

- **Asynchrone natif** : toutes les opérations I/O (DB, email, API SIRENE) sont non bloquantes
- **Même contrat API** : tous les endpoints Django sont reproduits à l'identique
- **Léger** : pas de framework lourd, configuration explicite
- **Flexible** : basculer SQLite → PostgreSQL en changeant 2 variables `.env`

### Points forts du backend Django

- **ORM puissant** : migrations auto, requêtes complexes, N+1 évité avec `select_related`
- **DRF** : sérialisation, validation, pagination et permissions intégrées
- **Admin** : interface d'administration clés-en-main
- **Tests** : 96 tests couvrant tous les endpoints

---

## Lancer les deux backends en parallèle

```bash
# Terminal 1 — Django (port 8000)
cd backend-django
source .venv/bin/activate
python manage.py runserver

# Terminal 2 — Node.js (port 8001)
cd backend-node
npm run dev
```

Les deux APIs exposent le même contrat REST.
Le frontend React peut utiliser l'un ou l'autre en changeant `VITE_API_URL` dans son `.env`.

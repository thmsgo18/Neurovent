# Neurovent — Backend Node.js

API REST Express.js — miroir fonctionnel du backend Django.
Réalisé par **Azouaou** dans le cadre du projet M1 IAD-VMI.

---

## Installation et démarrage

```bash
cd backend-node
npm install
npm run dev      # développement (nodemon)
# ou
npm start        # production
```

L'API démarre sur **http://localhost:3001**

---

## Endpoints

> Base URL : `http://localhost:3001`
> Auth : header `Authorization: Bearer <access_token>`

### Authentification

| Méthode | URL | Accès | Description |
|---------|-----|-------|-------------|
| POST | `/api/auth/register/participant/` | Public | Inscription participant |
| POST | `/api/auth/register/company/` | Public | Inscription company |
| POST | `/api/auth/login/participant/` | Public | Login participant (email + password) |
| POST | `/api/auth/login/company/` | Public | Login company (identifier + password) |
| POST | `/api/auth/token/refresh/` | Public | Renouveler l'access token |
| POST | `/api/auth/logout/` | Connecté | Déconnexion (blacklist refresh token) |
| GET | `/api/auth/me/` | Connecté | Voir son profil |
| PATCH | `/api/auth/me/` | Connecté | Modifier son profil |
| DELETE | `/api/auth/me/` | Connecté | Supprimer son compte (RGPD) |
| PATCH | `/api/auth/me/password/` | Connecté | Changer son mot de passe |
| POST | `/api/auth/password-reset/` | Public | Demander reset mot de passe |
| POST | `/api/auth/password-reset/confirm/` | Public | Confirmer reset mot de passe |
| GET | `/api/auth/admin/stats/` | Admin | Statistiques globales |
| GET | `/api/auth/admin/users/` | Admin | Liste utilisateurs |
| PATCH | `/api/auth/admin/users/:id/suspend/` | Admin | Suspendre un compte |
| PATCH | `/api/auth/admin/users/:id/activate/` | Admin | Réactiver un compte |
| DELETE | `/api/auth/admin/users/:id/delete/` | Admin | Supprimer un compte (RGPD) |

### Événements

| Méthode | URL | Accès | Description |
|---------|-----|-------|-------------|
| GET | `/api/events/` | Public | Liste events PUBLISHED (paginée, filtrée) |
| GET | `/api/events/:id/` | Public | Détail event |
| POST | `/api/events/create/` | Company | Créer un event |
| PATCH | `/api/events/:id/update/` | Company (owner) | Modifier un event |
| DELETE | `/api/events/:id/delete/` | Company (owner) | Supprimer un event |
| GET | `/api/events/my-events/` | Company | Mes events (tous statuts) |
| GET | `/api/events/recommended/` | Participant | Events recommandés par tags |
| GET | `/api/events/:id/stats/` | Company (owner) / Admin | Stats d'un event |

**Filtres sur GET /api/events/ :**
```
?format=ONSITE|ONLINE|HYBRID
?tags=1&tags=2        → OR logic
?date_after=2026-04-01
?date_before=2026-05-01
?city=Paris
?country=France
?search=neurosciences
?ordering=date_start|-date_start|capacity|-capacity|created_at|-created_at
?page=2
?status=DRAFT|PUBLISHED|CANCELLED   (admin uniquement)
```

### Inscriptions

| Méthode | URL | Accès | Description |
|---------|-----|-------|-------------|
| POST | `/api/registrations/` | Participant | S'inscrire à un event |
| GET | `/api/registrations/my/` | Participant | Mes inscriptions (`?status=CONFIRMED`) |
| PATCH | `/api/registrations/:id/cancel/` | Participant | Annuler son inscription |
| GET | `/api/registrations/event/:id/` | Company | Inscrits d'un event |
| PATCH | `/api/registrations/:id/status/` | Company / Admin | Confirmer ou rejeter |
| GET | `/api/registrations/event/:id/export/` | Company / Admin | Export CSV |

### Tags

| Méthode | URL | Accès |
|---------|-----|-------|
| GET | `/api/tags/` | Public |
| POST | `/api/tags/create/` | Admin |
| DELETE | `/api/tags/:id/delete/` | Admin |

### Companies

| Méthode | URL | Accès |
|---------|-----|-------|
| GET | `/api/companies/:id/` | Public |

---

## Tests rapides avec curl

### 1. Créer un admin (directement en base SQLite)
```bash
# Installer sqlite3 si besoin : sudo apt install sqlite3
sqlite3 neurovent.sqlite "
  INSERT INTO users (role, is_active, is_staff, email, password_hash, first_name, last_name)
  VALUES ('ADMIN', 1, 1, 'admin@neurovent.com',
    '\$2a\$10\$rBnDPpfNxJ6QKRqLcGzGMONSZxVQi6k1hXv7sJTHjlmY0vRyuLrSu',
    'Admin', 'Neurovent');
"
# Mot de passe : admin1234
```

### 2. Inscrire un participant
```bash
curl -X POST http://localhost:3001/api/auth/register/participant/ \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"motdepasse123","password_confirm":"motdepasse123","first_name":"Alice","last_name":"Martin"}'
```

### 3. Login participant
```bash
curl -X POST http://localhost:3001/api/auth/login/participant/ \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"motdepasse123"}'
# → retourne {"access":"...","refresh":"..."}
```

### 4. Voir son profil
```bash
curl http://localhost:3001/api/auth/me/ \
  -H "Authorization: Bearer <access_token>"
```

### 5. Inscrire une company
```bash
curl -X POST http://localhost:3001/api/auth/register/company/ \
  -H "Content-Type: application/json" \
  -d '{"company_identifier":"braincorp","password":"motdepasse123","password_confirm":"motdepasse123","company_name":"BrainCorp","recovery_email":"contact@braincorp.com"}'
```

### 6. Login company
```bash
curl -X POST http://localhost:3001/api/auth/login/company/ \
  -H "Content-Type: application/json" \
  -d '{"identifier":"braincorp","password":"motdepasse123"}'
```

### 7. Créer un event (company connectée)
```bash
curl -X POST http://localhost:3001/api/events/create/ \
  -H "Authorization: Bearer <company_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Conference ML 2026",
    "description": "Une conférence sur le Machine Learning",
    "date_start": "2026-05-10T09:00:00",
    "date_end": "2026-05-10T18:00:00",
    "capacity": 100,
    "format": "ONSITE",
    "status": "PUBLISHED",
    "address_city": "Paris",
    "address_country": "France",
    "tag_ids": []
  }'
```

### 8. Liste des events
```bash
curl "http://localhost:3001/api/events/"
curl "http://localhost:3001/api/events/?format=ONSITE&city=Paris&page=1"
```

### 9. Créer des tags (admin)
```bash
curl -X POST http://localhost:3001/api/tags/create/ \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Machine Learning"}'
```

### 10. Uploader un logo company (multipart)
```bash
curl -X PATCH http://localhost:3001/api/auth/me/ \
  -H "Authorization: Bearer <company_access_token>" \
  -F "company_logo=@logo.png" \
  -F "company_name=BrainCorp Updated"
```

---

## Structure du projet

```
backend-node/
├── src/
│   ├── server.js                    # Point d'entrée HTTP
│   ├── app.js                       # Express + routes + CORS
│   ├── db/
│   │   └── database.js              # SQLite (better-sqlite3) + schéma
│   ├── middleware/
│   │   ├── auth.js                  # JWT Bearer, permissions par rôle
│   │   └── upload.js                # Multer (logos/bannières)
│   ├── utils/
│   │   ├── jwt.js                   # generateTokens, verifyToken
│   │   ├── emails.js                # Nodemailer (confirmation, rejet, annulation)
│   │   └── helpers.js               # Pagination, sérialisation, visibilité
│   ├── controllers/
│   │   ├── auth.controller.js       # Inscription, login, profil, admin
│   │   ├── events.controller.js     # CRUD events, filtres, stats, recommandations
│   │   ├── registrations.controller.js  # Inscriptions, waitlist, CSV
│   │   ├── tags.controller.js       # Tags
│   │   └── companies.controller.js  # Profil public company
│   └── routes/
│       ├── auth.routes.js
│       ├── events.routes.js
│       ├── registrations.routes.js
│       ├── tags.routes.js
│       └── companies.routes.js
├── media/                           # Fichiers uploadés (auto-créé)
│   ├── logos/
│   └── banners/
├── neurovent.sqlite                 # Base SQLite (auto-créé au démarrage)
├── package.json
├── .env
└── README.md
```

---

## Différences Node.js vs Django

| Aspect | Django | Node.js |
|--------|--------|---------|
| Framework | Django REST Framework | Express.js |
| ORM | Django ORM | better-sqlite3 (SQL brut) |
| Auth | djangorestframework-simplejwt | jsonwebtoken |
| Hachage | PBKDF2 (Django) | bcryptjs |
| Upload | Pillow + ImageField | Multer |
| Email | EmailMultiAlternatives | Nodemailer |
| Reset mdp | default_token_generator | UUID + table SQLite |
| Blacklist JWT | djrest_simplejwt blacklist | Table token_blacklist SQLite |
| Pagination | PageNumberPagination | Manuel (LIMIT/OFFSET) |
| Validation | DRF Serializers | Validation manuelle |
| Admin | Django Admin UI | Endpoints JSON |

# Neurovent

Plateforme de gestion d'événements scientifiques — Projet de Programmation Web (M1 IAD-VMI, 2025-2026)

---

## Présentation

**Neurovent** est une application web full-stack permettant de créer, gérer et rejoindre des événements scientifiques (conférences, workshops, séminaires) autour de thématiques comme le Machine Learning, les Neurosciences, l'IA et plus encore.

Le projet est une implémentation de la consigne "EventHub" de l'enseignante, avec une coloration thématique neurosciences/IA.

---

## Équipe

| Personne | Rôle | Responsabilité principale |
|----------|------|---------------------------|
| **Thomas** | Backend Django | Modèles, API REST, JWT, permissions, logique métier |
| **Noureddine** | Frontend React | Composants, pages, formulaires, intégration API |
| **Azouaou** | Node.js + Déploiement | API Express simplifiée, comparaison Django vs Node, rapport |

---

## Architecture du projet

```
neurovent/
├── backend-django/     # API principale (Django + DRF + JWT)
├── frontend-react/     # Interface utilisateur (React + React Router)
├── backend-node/       # API simplifiée pour comparaison (Express.js)
├── docs/               # Rapport, slides, comparaison technique
├── CLAUDE.md           # Contexte complet du projet pour l'IA
└── README.md
```

---

## Stack technique

| Partie | Technologies |
|--------|-------------|
| Backend principal | Django 6.0.2, Django REST Framework, JWT, SQLite |
| Frontend | React, React Router DOM, CSS natif, Lucide React |
| Backend comparaison | Node.js, Express.js |
| Auth | JWT (djangorestframework-simplejwt) |

---

## Les 4 types d'utilisateurs

### Visiteur (non connecté)
Accès en lecture seule à la plateforme. Peut parcourir les événements publiés et voir leurs détails, mais ne peut pas s'inscrire.

### Participant
Utilisateur inscrit souhaitant assister à des événements.

**Informations de compte :** prénom, nom, email (login), mot de passe
**Peut :**
- Voir et rechercher des événements
- S'inscrire à un événement
- Annuler une inscription
- Gérer son profil (employer, tags d'intérêt)

### Company (Organisateur)
Entreprise ou organisation qui crée et gère des événements.

**Informations de compte :** identifiant unique (login), email de récupération, nom d'entreprise, mot de passe
> L'identifiant permet à plusieurs membres d'une même entreprise de partager le compte.

**Peut :**
- Créer, modifier et supprimer ses événements
- Choisir le mode d'inscription (automatique ou avec validation)
- Voir la liste des inscrits à ses événements
- Confirmer ou rejeter des inscriptions (mode VALIDATION)
- Gérer son profil (logo, description, liens réseaux sociaux, tags)

### Admin
Administrateur de la plateforme, accès via Django Admin (`/admin/`).

**Peut :**
- Voir et gérer tous les comptes
- Voir et modérer tous les événements
- Suspendre / réactiver un compte (`PATCH /api/auth/admin/users/<id>/suspend/`)
- Gérer la liste des tags
- Consulter les statistiques globales (`GET /api/auth/admin/stats/`)

---

## Les événements

### Formats
| Format | Description |
|--------|-------------|
| `ONSITE` | Présentiel uniquement → adresse physique |
| `ONLINE` | Distanciel uniquement → lien de connexion |
| `HYBRID` | Présentiel + retransmission live → adresse + lien |

### Statuts
| Statut | Description |
|--------|-------------|
| `DRAFT` | Brouillon, non visible publiquement |
| `PUBLISHED` | Publié, inscriptions ouvertes |
| `CANCELLED` | Annulé |

### Modes d'inscription
| Mode | Comportement |
|------|-------------|
| `AUTO` | Le participant est **immédiatement confirmé** à l'inscription |
| `VALIDATION` | L'inscription est **en attente** (PENDING), la company doit confirmer ou rejeter |

### Date limite d'inscription
La company peut fixer une `registration_deadline`. Passé cette date, plus aucune inscription n'est acceptée. Sans deadline, les inscriptions sont ouvertes jusqu'au début de l'event.

### Bannière
Chaque event peut avoir une image/bannière uploadée par la company (format recommandé : 1200x400px).

### Visibilité de l'adresse / du lien
La company peut choisir ce qu'elle révèle publiquement :
- `FULL` → information complète toujours visible
- `PARTIAL` → affiche seulement la ville + pays (adresse) ou le nom de la plateforme (lien)
- Avec une **date de révélation optionnelle** : l'info complète devient visible automatiquement à cette date

---

## Les inscriptions

### Statuts possibles
| Statut | Description |
|--------|-------------|
| `PENDING` | En attente de validation (mode VALIDATION uniquement) |
| `CONFIRMED` | Inscription confirmée |
| `REJECTED` | Inscription rejetée par la company |
| `CANCELLED` | Annulée par le participant |
| `WAITLIST` | En liste d'attente (event complet, mode AUTO) |

### Liste d'attente (Waitlist)
Quand un event en mode `AUTO` est complet, le participant est automatiquement mis en `WAITLIST` au lieu de recevoir une erreur. Dès qu'une place se libère (annulation ou rejet), le **premier de la liste d'attente est automatiquement confirmé**. Le champ `waitlist_position` indique sa position (1 = premier).

---

## Permissions par rôle

| Action | Visiteur | Participant | Company | Admin |
|--------|----------|-------------|---------|-------|
| Voir la liste des events | ✅ | ✅ | ✅ | ✅ |
| Voir le détail d'un event | ✅ | ✅ | ✅ | ✅ |
| Voir le profil public d'une company | ✅ | ✅ | ✅ | ✅ |
| S'inscrire à un event | ❌ | ✅ | ❌ | ❌ |
| Rejoindre la liste d'attente | ❌ | ✅ | ❌ | ❌ |
| Voir les recommandations | ❌ | ✅ | ❌ | ❌ |
| Supprimer son compte | ❌ | ✅ | ✅ | ❌ |
| Créer un event | ❌ | ❌ | ✅ | ❌ |
| Modifier / supprimer son event | ❌ | ❌ | ✅ | ✅ |
| Valider des inscriptions | ❌ | ❌ | ✅ (owner) | ✅ |
| Voir les stats d'un event | ❌ | ❌ | ✅ (owner) | ✅ |
| Voir les stats globales | ❌ | ❌ | ❌ | ✅ |
| Suspendre / réactiver un compte | ❌ | ❌ | ❌ | ✅ |
| Gérer les tags | ❌ | ❌ | ❌ | ✅ |

---

## Lancer le projet

### Backend Django
```bash
cd backend-django
source .venv/bin/activate
python manage.py runserver
```
→ API disponible sur `http://127.0.0.1:8000`
→ Admin Django sur `http://127.0.0.1:8000/admin/`

### Frontend React
```bash
cd frontend-react
npm install
npm run dev
```
→ Interface disponible sur `http://localhost:5173` (ou `3000` selon la config)

---

## API Contract

> Base URL : `http://127.0.0.1:8000`
> Authentification : header `Authorization: Bearer <access_token>`

### Authentification & Profil

| Méthode | URL | Accès | Body |
|---------|-----|-------|------|
| POST | `/api/auth/register/participant/` | Public | `email, password, password_confirm, first_name, last_name` |
| POST | `/api/auth/register/company/` | Public | `company_identifier, password, password_confirm, company_name, recovery_email` |
| POST | `/api/auth/login/participant/` | Public | `email, password` |
| POST | `/api/auth/login/company/` | Public | `identifier, password` |
| POST | `/api/auth/token/refresh/` | Public | `refresh` |
| GET | `/api/auth/me/` | Connecté | — |
| PATCH | `/api/auth/me/` | Connecté | champs à modifier (`tag_ids` pour les tags) |
| DELETE | `/api/auth/me/` | Connecté | — Suppression RGPD |
| GET | `/api/auth/admin/stats/` | Admin | — |
| PATCH | `/api/auth/admin/users/<id>/suspend/` | Admin | — |
| PATCH | `/api/auth/admin/users/<id>/activate/` | Admin | — |

> **Note tags :** pour lire → champ `tags` retourne `[{id, name}]`. Pour écrire → envoyer `tag_ids: [1, 2]`

### Événements

| Méthode | URL | Accès | Notes |
|---------|-----|-------|-------|
| GET | `/api/events/` | Public | Liste events PUBLISHED — paginée (10/page) |
| GET | `/api/events/<id>/` | Public | Détail d'un event |
| POST | `/api/events/create/` | Company | Créer un event |
| PUT/PATCH | `/api/events/<id>/update/` | Company (owner) | Modifier son event |
| DELETE | `/api/events/<id>/delete/` | Company (owner) | Supprimer son event |
| GET | `/api/events/my-events/` | Company | Tous ses events (tous statuts) |
| GET | `/api/events/<id>/stats/` | Company (owner) / Admin | Stats de l'event |
| GET | `/api/events/recommended/` | Participant | Events recommandés selon ses tags |

**Filtres disponibles sur `GET /api/events/` :**
```
?format=ONSITE|ONLINE|HYBRID
?tags=1&tags=2          → events avec au moins un de ces tags
?date_after=2026-04-01
?date_before=2026-05-01
?city=Paris
?country=France
?search=neurosciences
?ordering=date_start ou ?ordering=-date_start
?page=2
```

### Companies

| Méthode | URL | Accès | Notes |
|---------|-----|-------|-------|
| GET | `/api/companies/<id>/` | Public | Profil public + events publiés |

### Inscriptions

| Méthode | URL | Accès | Body / Notes |
|---------|-----|-------|--------------|
| POST | `/api/registrations/` | Participant | `{"event": <id>}` |
| GET | `/api/registrations/my/` | Participant | Ses inscriptions |
| PATCH | `/api/registrations/<id>/cancel/` | Participant | Annule l'inscription |
| GET | `/api/registrations/event/<id>/` | Company | Inscrits d'un event |
| PATCH | `/api/registrations/<id>/status/` | Company | `{"status": "CONFIRMED"}` ou `"REJECTED"` |

### Documentation API

| URL | Description |
|-----|-------------|
| `/api/docs/` | Interface Swagger interactive |
| `/api/redoc/` | Interface ReDoc |

### Tags

| Méthode | URL | Accès | Body |
|---------|-----|-------|------|
| GET | `/api/tags/` | Public | — |
| POST | `/api/tags/create/` | Admin | `{"name": "Neurosciences"}` |

---

## Deadlines

| Date | Étape |
|------|-------|
| ~27 mars 2026 | Démo intermédiaire enseignante |
| 10 avril 2026 | Rendu final (code + rapport + présentation) |

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

---

## Permissions par rôle

| Action | Visiteur | Participant | Company | Admin |
|--------|----------|-------------|---------|-------|
| Voir la liste des events | ✅ | ✅ | ✅ | ✅ |
| Voir le détail d'un event | ✅ | ✅ | ✅ | ✅ |
| S'inscrire à un event | ❌ | ✅ | ❌ | ❌ |
| Créer un event | ❌ | ❌ | ✅ | ❌ |
| Modifier / supprimer son event | ❌ | ❌ | ✅ | ✅ |
| Valider des inscriptions | ❌ | ❌ | ✅ (owner) | ✅ |
| Voir les stats globales | ❌ | ❌ | ❌ | ✅ |
| Gérer les tags | ❌ | ❌ | ❌ | ✅ |
| Désactiver un compte | ❌ | ❌ | ❌ | ✅ |

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
| GET | `/api/auth/admin/stats/` | Admin | — |

> **Note tags :** pour lire → champ `tags` retourne `[{id, name}]`. Pour écrire → envoyer `tag_ids: [1, 2]`

### Événements

| Méthode | URL | Accès | Notes |
|---------|-----|-------|-------|
| GET | `/api/events/` | Public | Liste des events PUBLISHED |
| GET | `/api/events/<id>/` | Public | Détail d'un event |
| POST | `/api/events/create/` | Company | Créer un event |
| PUT/PATCH | `/api/events/<id>/update/` | Company (owner) | Modifier son event |
| DELETE | `/api/events/<id>/delete/` | Company (owner) | Supprimer son event |
| GET | `/api/events/my-events/` | Company | Tous ses events (tous statuts) |

### Inscriptions

| Méthode | URL | Accès | Body / Notes |
|---------|-----|-------|--------------|
| POST | `/api/registrations/` | Participant | `{"event": <id>}` |
| GET | `/api/registrations/my/` | Participant | Ses inscriptions |
| PATCH | `/api/registrations/<id>/cancel/` | Participant | Annule l'inscription |
| GET | `/api/registrations/event/<id>/` | Company | Inscrits d'un event |
| PATCH | `/api/registrations/<id>/status/` | Company | `{"status": "CONFIRMED"}` ou `"REJECTED"` |

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

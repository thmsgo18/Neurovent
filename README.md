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
| Backend principal | Django 6.0.2, Django REST Framework, JWT, SQLite, python-decouple |
| Frontend | React, React Router DOM, CSS natif, Lucide React |
| Backend comparaison | Node.js, Express.js |
| Auth | JWT (djangorestframework-simplejwt + token blacklist) |

---

## Les 4 types d'utilisateurs

### Visiteur (non connecté)
Accès en lecture seule à la plateforme. Peut parcourir les événements publiés et voir leurs détails, mais ne peut pas s'inscrire.

### Participant
Utilisateur inscrit souhaitant assister à des événements.

**Informations de compte :** prénom, nom, email (login), mot de passe
**Peut :**
- Voir et rechercher des événements
- S'inscrire à un événement (avec besoins d'accessibilité optionnels)
- Rejoindre une liste d'attente si l'event est complet (mode AUTO)
- Annuler une inscription
- Gérer son profil (employer, tags d'intérêt)

### Company (Organisateur)
Entreprise ou organisation qui crée et gère des événements.

**Informations de compte :** identifiant unique (login), email de récupération, nom d'entreprise, SIRET, représentant légal, mot de passe

**Vérification entreprise :** à l'inscription, le SIRET est contrôlé automatiquement via l'API officielle INSEE/SIRENE. Statuts possibles :
| Statut | Description |
|--------|-------------|
| `PENDING` | Vérification en cours |
| `VERIFIED` | Entreprise validée — peut créer des événements |
| `NEEDS_REVIEW` | Révision manuelle requise — envoyer un Kbis ou RNE |
| `REJECTED` | SIRET invalide ou établissement fermé |

**Peut :**
- Créer, modifier et supprimer ses événements (**uniquement si VERIFIED**)
- Choisir le mode d'inscription (automatique ou avec validation)
- Voir la liste des inscrits à ses événements
- Confirmer ou rejeter des inscriptions (mode VALIDATION), avec un commentaire
- Gérer son profil (logo, description, liens réseaux sociaux, tags)
- Exporter la liste des inscrits en CSV
- Uploader un justificatif Kbis/RNE si la vérification auto a échoué

### Admin
Administrateur de la plateforme, accès via Django Admin (`/admin/`) et API.

**Peut :**
- Voir et gérer tous les comptes
- Suspendre / réactiver un compte (`PATCH /api/auth/admin/users/<id>/suspend/`)
- Supprimer (anonymiser) n'importe quel compte non-admin (`DELETE /api/auth/admin/users/<id>/delete/`)
- Lister les utilisateurs avec filtre par rôle (`GET /api/auth/admin/users/`)
- Valider ou rejeter n'importe quelle inscription
- Voir et modérer tous les événements (filtre `?status=DRAFT` disponible)
- Exporter les inscrits de n'importe quel event en CSV
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
| `DRAFT` | Brouillon, non visible publiquement (404 sur l'endpoint public) |
| `PUBLISHED` | Publié, inscriptions ouvertes |
| `CANCELLED` | Annulé — notification email envoyée aux inscrits |

### Modes d'inscription
| Mode | Comportement |
|------|-------------|
| `AUTO` | Le participant est **immédiatement confirmé** — ou mis en **liste d'attente** si complet |
| `VALIDATION` | L'inscription est **en attente** (PENDING), la company ou un admin doit confirmer ou rejeter |

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
| `REJECTED` | Inscription rejetée par la company ou l'admin |
| `CANCELLED` | Annulée par le participant |
| `WAITLIST` | En liste d'attente (event complet, mode AUTO uniquement) |

### Liste d'attente (Waitlist)
Quand un event en mode `AUTO` est complet, le participant est automatiquement mis en `WAITLIST` au lieu de recevoir une erreur. Dès qu'une place se libère (annulation ou rejet), le **premier de la liste d'attente est automatiquement confirmé** et reçoit un email. Le champ `waitlist_position` indique sa position (1 = premier).

### Champs d'inscription
- `accessibility_needs` — besoins d'accessibilité (PMR, daltonisme...), renseigné par le participant à l'inscription
- `company_comment` — commentaire de l'organisateur, visible par le participant lors de la confirmation/rejet

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
| Supprimer un compte (admin) | ❌ | ❌ | ❌ | ✅ |
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
| POST | `/api/auth/register/company/` | Public | `company_identifier, password, password_confirm, company_name, recovery_email, siret, legal_representative` |
| POST | `/api/auth/login/participant/` | Public | `email, password` |
| POST | `/api/auth/login/company/` | Public | `identifier, password` |
| POST | `/api/auth/token/refresh/` | Public | `refresh` |
| POST | `/api/auth/logout/` | Connecté | `refresh` — blackliste le token |
| GET | `/api/auth/me/` | Connecté | — |
| PATCH | `/api/auth/me/` | Connecté | champs à modifier (`tag_ids` pour les tags) |
| DELETE | `/api/auth/me/` | Connecté | — Suppression RGPD |
| PATCH | `/api/auth/me/password/` | Connecté | `current_password, new_password, new_password_confirm` |
| POST | `/api/auth/password-reset/` | Public | `email` — envoie un lien de reset par email |
| POST | `/api/auth/password-reset/confirm/` | Public | `uid, token, new_password, new_password_confirm` |
| GET | `/api/auth/admin/stats/` | Admin | — |
| GET | `/api/auth/admin/users/` | Admin | `?role=PARTICIPANT\|COMPANY\|ADMIN` |
| PATCH | `/api/auth/admin/users/<id>/suspend/` | Admin | — |
| PATCH | `/api/auth/admin/users/<id>/activate/` | Admin | — |
| DELETE | `/api/auth/admin/users/<id>/delete/` | Admin | — Impossible sur un autre admin |
| GET | `/api/auth/admin/companies/pending/` | Admin | `?status=PENDING\|NEEDS_REVIEW\|VERIFIED\|REJECTED` |
| PATCH | `/api/auth/admin/companies/<id>/verify/` | Admin | `{"verification_status": "VERIFIED\|REJECTED", "review_note": "..."}` |
| PATCH | `/api/auth/me/verification/document/` | Company | Upload Kbis/RNE (`multipart/form-data`, champ `verification_document`) |

> **Note tags :** pour lire → champ `tags` retourne `[{id, name}]`. Pour écrire → envoyer `tag_ids: [1, 2]`

### Événements

| Méthode | URL | Accès | Notes |
|---------|-----|-------|-------|
| GET | `/api/events/` | Public | Liste events PUBLISHED — paginée (10/page) |
| GET | `/api/events/<id>/` | Public | Détail d'un event PUBLISHED (404 si DRAFT) |
| POST | `/api/events/create/` | Company **VERIFIED** | Créer un event |
| PUT/PATCH | `/api/events/<id>/update/` | Company (owner) | Modifier son event |
| DELETE | `/api/events/<id>/delete/` | Company (owner) | Supprimer son event |
| GET | `/api/events/my-events/` | Company | Tous ses events (tous statuts) |
| GET | `/api/events/<id>/stats/` | Company (owner) / Admin | Stats de l'event |
| GET | `/api/events/recommended/` | Participant | Events recommandés selon ses tags |

**Filtres `GET /api/events/` :**
```
?format=ONSITE|ONLINE|HYBRID   ?tags=1&tags=2   ?date_after=   ?date_before=
?city=   ?country=   ?search=   ?ordering=date_start   ?page=2
?status=DRAFT   → admin uniquement
```

### Companies

| Méthode | URL | Accès | Notes |
|---------|-----|-------|-------|
| GET | `/api/companies/<id>/` | Public | Profil public + events publiés |

### Inscriptions

| Méthode | URL | Accès | Body / Notes |
|---------|-----|-------|--------------|
| POST | `/api/registrations/` | Participant | `{"event": <id>, "accessibility_needs": "..."}` |
| GET | `/api/registrations/my/` | Participant | `?status=CONFIRMED\|PENDING\|WAITLIST\|...` |
| PATCH | `/api/registrations/<id>/cancel/` | Participant | Annule + promeut le 1er WAITLIST |
| GET | `/api/registrations/event/<id>/` | Company | Inscrits d'un event |
| PATCH | `/api/registrations/<id>/status/` | Company / Admin | `{"status": "CONFIRMED\|REJECTED", "company_comment": "..."}` |
| GET | `/api/registrations/event/<id>/export/` | Company (owner) / Admin | Export CSV des inscrits |

### Tags

| Méthode | URL | Accès | Body |
|---------|-----|-------|------|
| GET | `/api/tags/` | Public | — |
| POST | `/api/tags/create/` | Admin | `{"name": "Neurosciences"}` |
| DELETE | `/api/tags/<id>/delete/` | Admin | — |

### Documentation API

| URL | Description |
|-----|-------------|
| `/api/docs/` | Interface Swagger interactive |
| `/api/redoc/` | Interface ReDoc |

---

## Deadlines

| Date | Étape |
|------|-------|
| ~27 mars 2026 | Démo intermédiaire enseignante |
| 10 avril 2026 | Rendu final (code + rapport + présentation) |

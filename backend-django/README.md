# Backend Django — Neurovent

API REST principale du projet Neurovent.

## Stack

- Django 6
- Django REST Framework
- djangorestframework-simplejwt + token blacklist
- django-filter
- drf-spectacular (Swagger / ReDoc)
- django-cors-headers
- Pillow
- python-decouple
- SQLite en developpement

## Installation

```bash
cd backend-django
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

URLs locales :

| URL | Description |
|-----|-------------|
| http://127.0.0.1:8000 | API REST |
| http://127.0.0.1:8000/admin/ | Interface Django admin |
| http://127.0.0.1:8000/api/docs/ | Swagger UI |
| http://127.0.0.1:8000/api/redoc/ | ReDoc |

## Configuration `.env`

Creer un fichier `.env` dans `backend-django/`. Copier `.env.example` comme base.

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=neurovent.noreply@gmail.com
EMAIL_HOST_PASSWORD=xxxxxxxxxxxxxxxx
EMAIL_FAIL_SILENTLY=False
FRONTEND_URL=http://localhost:3000
```

Variables supplementaires pour la prod :

```env
SECRET_KEY=change-me
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1
```

Comportement email :
- config SMTP presente → envoi reel via SMTP
- config absente → affichage dans le terminal uniquement
- `EMAIL_FAIL_SILENTLY=False` → erreur remontee immediatement si envoi echoue

## Structure des applications

```
backend-django/
├── config/              # settings.py, urls.py principal
├── users/               # auth, profils, moderation admin, verification organization
├── events/              # CRUD events, filtres, stats, exports CSV, vues admin
├── registrations/       # cycle de vie registration, waitlist, moderation
├── tags/                # topics et taxonomie
├── emails.py            # envoi d'emails systeme
├── scripts/             # reset_and_seed_demo.py
└── media/               # uploads locaux (avatars, logos, documents)
```

## Modele metier

### Roles utilisateur

Un seul modele `CustomUser` avec trois roles : `PARTICIPANT`, `COMPANY`, `ADMIN`.

### Event

- `status` : `DRAFT`, `PUBLISHED`, `CANCELLED`
- `format` : `ONSITE`, `ONLINE`, `HYBRID`
- `registration_mode` : `AUTO` (confirmation immediate) ou `VALIDATION` (review manuelle)
- `capacity` / `unlimited_capacity`
- `registration_deadline`
- `allow_registration_during_event`
- Visibilite de l'adresse : `address_visibility`, `address_reveal_date`
- Visibilite du lien online : `online_visibility`, `online_reveal_date`

### Registration

Statuts : `PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`, `WAITLIST`

Le backend gere automatiquement :
- auto-confirmation selon le `registration_mode`
- promotion depuis la waitlist quand une place se libere
- envoi d'emails a chaque changement de statut

## Endpoints — ce que le frontend consomme

### Auth

| Methode | URL | Description |
|---------|-----|-------------|
| POST | `/api/auth/register/participant/` | Inscription participant |
| POST | `/api/auth/register/company/` | Inscription organization |
| POST | `/api/auth/login/participant/` | Login par email + password |
| POST | `/api/auth/login/company/` | Login par company_identifier + password |
| POST | `/api/auth/token/refresh/` | Renouvellement du access token |
| POST | `/api/auth/logout/` | Blacklist du refresh token |
| GET | `/api/auth/me/` | Profil de l'utilisateur connecte |
| PATCH | `/api/auth/me/` | Mise a jour du profil |
| DELETE | `/api/auth/me/` | Suppression du compte (RGPD) |
| PATCH | `/api/auth/me/password/` | Changement de mot de passe |
| POST | `/api/auth/password-reset/` | Envoi email de reset |
| POST | `/api/auth/password-reset/confirm/` | Confirmation reset avec uid + token |
| GET | `/api/auth/participants/<id>/` | Profil public d'un participant |

### Organizations (public)

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/companies/` | Liste publique des organizations |
| GET | `/api/companies/<id>/` | Profil public d'une organization |

### Events

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/events/` | Liste publique (filtrable) |
| GET | `/api/events/<id>/` | Detail d'un event |
| POST | `/api/events/create/` | Creer un event (COMPANY) |
| PATCH | `/api/events/<id>/update/` | Modifier un event (COMPANY) |
| DELETE | `/api/events/<id>/delete/` | Supprimer un event (COMPANY) |
| GET | `/api/events/my-events/` | Events de l'organization connectee |
| GET | `/api/events/<id>/stats/` | Stats d'un event (COMPANY) |
| GET | `/api/events/dashboard-stats/` | Stats globales organization |
| GET | `/api/events/dashboard-stats/export-summary/` | Export CSV summary |
| GET | `/api/events/dashboard-stats/export-performance/` | Export CSV performance |

### Registrations

| Methode | URL | Description |
|---------|-----|-------------|
| POST | `/api/registrations/create/` | S'inscrire a un event |
| GET | `/api/registrations/my/` | Registrations de l'utilisateur connecte |
| PATCH | `/api/registrations/<id>/cancel/` | Annuler sa registration |
| GET | `/api/registrations/event/<event_id>/` | Liste des registrations d'un event (COMPANY) |
| PATCH | `/api/registrations/<id>/status/` | Changer le statut (COMPANY) |
| DELETE | `/api/registrations/<id>/remove/` | Supprimer une registration (COMPANY) |
| GET | `/api/registrations/event/<event_id>/export/` | Export CSV des registrations |

### Admin

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/auth/admin/users/` | Liste des participants |
| GET | `/api/auth/admin/users/<id>/` | Detail participant |
| PATCH | `/api/auth/admin/users/<id>/suspend/` | Suspendre un compte |
| PATCH | `/api/auth/admin/users/<id>/activate/` | Reactiver un compte |
| DELETE | `/api/auth/admin/users/<id>/delete/` | Supprimer un compte |
| GET | `/api/auth/admin/companies/` | Liste des organizations |
| GET | `/api/auth/admin/companies/pending/` | Organizations en attente de verification |
| PATCH | `/api/auth/admin/companies/<id>/verify/` | Verifier / refuser une organization |
| GET | `/api/auth/admin/stats/` | Statistiques globales de la plateforme |
| GET | `/api/events/admin/` | Tous les events (admin) |
| DELETE | `/api/events/admin/<id>/delete/` | Supprimer un event (admin) |

### Tags

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/tags/` | Liste des topics disponibles |

## Format des reponses

### Login participant

```json
POST /api/auth/login/participant/
→ {
    "access": "eyJ...",
    "refresh": "eyJ...",
    "role": "PARTICIPANT"
  }
```

### Login company

```json
POST /api/auth/login/company/
→ {
    "access": "eyJ...",
    "refresh": "eyJ...",
    "role": "COMPANY"
  }
```

Le payload JWT contient : `role`, `email` ou `company_identifier`, `first_name`, `last_name`.

### Erreurs

Format uniforme :

```json
{ "detail": "message d'erreur" }
```

Erreurs de validation DRF :

```json
{ "field_name": ["message"] }
```

## Headers attendus par le backend

```
Content-Type:  application/json
Authorization: Bearer <access_token>   ← pour les endpoints proteges
```

Les endpoints publics (`GET /api/events/`, `GET /api/companies/`, etc.) ne necessitent pas de token.

## CORS

Le frontend tourne sur `http://localhost:3000`. Le backend accepte les requetes cross-origin depuis cette origine en dev.

## Script de demo

```bash
cd backend-django
source .venv/bin/activate
python scripts/reset_and_seed_demo.py
```

Genere : 20 participants, 20 organizations, 1 admin, plusieurs events et registrations.

Comptes de demo :

| Role | Identifiant | Mot de passe |
|------|-------------|--------------|
| Participant | `amelie.rousseau@participants.neurovent.demo` | `Participant2026!` |
| Organization | `atlas-neuro-labs` | `Company2026!` |
| Admin | `admin@neurovent.demo` | `Admin2026!` |

## Migrations

Toujours executer apres un pull :

```bash
python manage.py migrate
```

Si une vue plante sur un champ inexistant → verifier que `migrate` a bien ete lance.

## Tests

```bash
python manage.py test users events registrations tags
```

Verification rapide apres une grosse modif :

```bash
python manage.py test users events
```

79 tests actifs sur `users` et `events`, tests complementaires sur `registrations` et `tags`.

## Points importants

- Les suppressions admin sont des suppressions metier ou des anonymisations selon le cas, pas des `DELETE` SQL directs
- L'admin produit (role `ADMIN`) et l'interface Django admin (`/admin/`) pointent sur le meme compte
- La recherche admin renvoie toujours `{ count, results }` meme sans pagination visible cote front
- Les endpoints publics `events` et `companies` ne doivent pas envoyer de token Authorization

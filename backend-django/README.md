# Backend Django — Neurovent

API REST principale du projet Neurovent.

Elle gere :
- authentification JWT
- profils participant / organization / admin
- events
- registrations
- moderation admin
- statistiques organization et admin
- emails systeme

## Stack

- Django 6
- Django REST Framework
- djangorestframework-simplejwt
- django-filter
- drf-spectacular
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
- API : [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Django admin : [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)
- Swagger : [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/)
- ReDoc : [http://127.0.0.1:8000/api/redoc/](http://127.0.0.1:8000/api/redoc/)

## Configuration `.env`

Creer un fichier `.env` dans `backend-django/`.

Exemple minimal :

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=neurovent.noreply@gmail.com
EMAIL_HOST_PASSWORD=xxxxxxxxxxxxxxxx
EMAIL_FAIL_SILENTLY=False
FRONTEND_URL=http://localhost:5173
```

Pour un envoi reel avec Gmail :
- utilisez un mot de passe d'application Google, pas votre mot de passe principal
- copiez [backend-django/.env.example](/Users/thomas/Documents/Université/Master/IAD/S2/Prog%20Web/Projet/backend-django/.env.example) vers `backend-django/.env`
- laissez `EMAIL_FAIL_SILENTLY=False` pour voir immediatement si un envoi a echoue

Comportement actuel :
- si la config SMTP est complete, Django envoie via SMTP
- si elle est absente, Django affiche les emails dans le terminal et ne les envoie pas reellement
- si SMTP echoue, l'erreur est maintenant journalisee et remontee quand `EMAIL_FAIL_SILENTLY=False`

Variables utiles en prod :

```env
SECRET_KEY=change-me
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,ton-domaine.fr
```

## Applications Django

```text
backend-django/
├── config/              # settings.py, urls.py
├── users/               # auth, profils, moderation admin, verification organization
├── events/              # CRUD events, filtres, stats, exports, vues admin
├── registrations/       # registration lifecycle, waitlist, moderation, CSV
├── tags/                # topics et taxonomie
├── emails.py            # envoi d'emails
├── scripts/             # scripts utilitaires
└── media/               # uploads locaux
```

## Modele metier

### Users

Un seul `CustomUser` avec trois roles :
- `PARTICIPANT`
- `COMPANY`
- `ADMIN`

Champs importants ajoutes au fil du projet :

#### Participant
- `participant_profile_type`
- `school_name`
- `study_level`
- `professional_company_name`
- `job_title`
- `job_started_at`
- `participant_avatar_url`
- `participant_bio`
- `favorite_domain`
- `personal_website_url`
- `github_url`
- `participant_linkedin_url`

#### Organization
- `company_identifier`
- `recovery_email`
- `company_logo` / `company_logo_url`
- `company_description`
- `website_url`
- `youtube_url`
- `linkedin_url`
- `twitter_url`
- `instagram_url`
- `facebook_url`
- `siret`
- `legal_representative`
- `verification_status`
- `verification_document`
- `review_note`
- `verified_at`

### Events

L'entite `Event` gere notamment :
- `status` : `DRAFT`, `PUBLISHED`, `CANCELLED`
- `format` : `ONSITE`, `ONLINE`, `HYBRID`
- `registration_mode` : `AUTO`, `VALIDATION`
- `registration_deadline`
- `allow_registration_during_event`
- `capacity`
- `unlimited_capacity`
- `view_count`

Visibilite publique :
- adresse onsite :
  - `address_visibility`
  - `address_reveal_date`
- lien online :
  - `online_visibility`
  - `online_reveal_date`

Suivi notifications :
- `reminder_7d_sent_at`
- `reminder_1d_sent_at`
- `reminder_3h_sent_at`
- `address_reveal_email_sent_at`
- `online_reveal_email_sent_at`
- `almost_full_notified_at`
- `full_notified_at`
- `organizer_digest_sent_at`

### Registrations

Statuts :
- `PENDING`
- `CONFIRMED`
- `REJECTED`
- `CANCELLED`
- `WAITLIST`

Le backend gere :
- auto-confirmation
- validation manuelle
- promotion automatique depuis la waitlist
- suppression par l'organization avec email

## Fonctionnalites backend importantes

### Authentification
- login participant par email
- login organization par `company_identifier`
- JWT access + refresh
- logout avec blacklist

### Verification organization
- verification auto via SIRET / SIRENE
- review manuelle
- upload de document justificatif

### Recherche events
- filtres par format, tags, ville, pays, ordering
- recherche texte flexible
- filtre organization
- filtre `upcoming_only`
- endpoint admin dedie

### Recherche organizations
- profil public organization
- recherche publique d'organizations
- liste admin organizations avec recherche sur les champs du profil

### Statistiques

#### Organization
- `GET /api/events/dashboard-stats/`
- exports CSV :
  - `export-summary`
  - `export-performance`

#### Admin
- `GET /api/auth/admin/stats/`
- `GET /api/auth/admin/users/`
- `GET /api/auth/admin/companies/`
- `GET /api/events/admin/`

## Endpoints principaux

### Auth et profil

- `POST /api/auth/register/participant/`
- `POST /api/auth/register/company/`
- `POST /api/auth/login/participant/`
- `POST /api/auth/login/company/`
- `POST /api/auth/token/refresh/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/`
- `PATCH /api/auth/me/`
- `DELETE /api/auth/me/`
- `PATCH /api/auth/me/password/`
- `POST /api/auth/password-reset/`
- `POST /api/auth/password-reset/confirm/`

### Admin users / organizations

- `GET /api/auth/admin/users/`
- `GET /api/auth/admin/users/<id>/`
- `PATCH /api/auth/admin/users/<id>/suspend/`
- `PATCH /api/auth/admin/users/<id>/activate/`
- `DELETE /api/auth/admin/users/<id>/delete/`
- `GET /api/auth/admin/companies/`
- `GET /api/auth/admin/companies/pending/`
- `PATCH /api/auth/admin/companies/<id>/verify/`
- `GET /api/auth/admin/stats/`

### Events

- `GET /api/events/`
- `GET /api/events/<id>/`
- `POST /api/events/create/`
- `PATCH /api/events/<id>/update/`
- `DELETE /api/events/<id>/delete/`
- `GET /api/events/my-events/`
- `GET /api/events/<id>/stats/`
- `GET /api/events/dashboard-stats/`
- `GET /api/events/dashboard-stats/export-summary/`
- `GET /api/events/dashboard-stats/export-performance/`
- `GET /api/events/admin/`
- `GET /api/events/admin/<id>/`
- `DELETE /api/events/admin/<id>/delete/`

### Registrations

- `POST /api/registrations/create/`
- `GET /api/registrations/my/`
- `PATCH /api/registrations/<id>/cancel/`
- `GET /api/registrations/event/<event_id>/`
- `PATCH /api/registrations/<id>/status/`
- `DELETE /api/registrations/<id>/remove/`
- `GET /api/registrations/event/<event_id>/export/`

## Script de demo

Un script de reset / seed est disponible :

```bash
cd backend-django
source .venv/bin/activate
python scripts/reset_and_seed_demo.py
```

Il recree :
- 20 participants
- 20 organizations
- 1 admin
- plusieurs events
- plusieurs registrations

## Migrations

Toujours faire apres un pull :

```bash
cd backend-django
source .venv/bin/activate
python manage.py migrate
```

Important :
- les migrations `events` couvrent maintenant aussi les champs de notification email
- si une vue plante sur un champ inexistant, verifier d'abord que `migrate` a bien ete lance

## Tests

Suite actuelle :

```bash
python manage.py test users events registrations tags
```

Les verifications les plus utiles apres une grosse modif :

```bash
python manage.py test users events
```

Etat actuel :
- `79` tests sur `users` et `events`
- tests complementaires sur `registrations` et `tags`

## Bonnes pratiques projet

- ne jamais supposer qu'une base locale est a jour sans `migrate`
- les endpoints publics `events` ne doivent pas envoyer d'Authorization si inutile
- la recherche admin renvoie un objet `{ count, results }` meme sans pagination visible
- les suppressions admin sont des suppressions metier / anonymisations selon les cas
- l'admin produit et l'admin Django pointent sur le meme role `ADMIN`

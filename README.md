# Neurovent

Plateforme web de gestion d'evenements scientifiques et tech.

Projet de Programmation Web, M1 IAD-VMI, 2025-2026.

## Vue d'ensemble

Neurovent permet de :
- decouvrir des evenements publics et des organizations
- rechercher par mot-cle, topic, organization, lieu et format
- s'inscrire a des evenements en ligne, hybrides ou en presentiel
- gerer des evenements cote organization
- moderer la plateforme cote admin

Le projet a evolue d'un simple EventHub vers une application plus complete avec :
- profils riches participant et organization
- recherche mixte events + organizations
- dashboard organization avec stats et exports CSV
- espace admin front dedie
- systeme de verification organization
- badges de progression sur les profils

## Structure du projet

```text
Projet/
├── backend-django/      # API principale Django + DRF + JWT
├── frontend-react/      # Frontend React
├── backend-node/        # Backend de comparaison (Express)
├── docs/                # Rapport / livrables
├── CLAUDE.md            # Contexte de travail pour assistants IA
└── README.md
```

## Stack technique

### Backend principal
- Django 6
- Django REST Framework
- SimpleJWT + token blacklist
- django-filter
- drf-spectacular
- Pillow
- SQLite en dev

### Frontend
- React
- React Router DOM
- CSS natif
- lucide-react

### Outillage
- tests Django sur `users`, `events`, `registrations`, `tags`
- build React via `react-scripts`

## Roles metier

### Participant
- recherche et consultation des events et organizations
- inscription / annulation
- suivi de ses registrations
- profil enrichi :
  - student ou professional
  - bio
  - avatar
  - liens
  - favorite domain
  - badges "missions accomplished"

### Organization
- creation, edition et suppression de ses events
- gestion des registrations
- export CSV
- dashboard avec stats globales
- page `My Events`
- profil enrichi :
  - logo
  - description
  - liens publics
  - domains
  - badges

### Admin
- espace admin front dedie
- onglets :
  - `Participants`
  - `Organizations`
  - `Events`
  - `Statistics`
- moderation des comptes
- verification des organizations
- suppression d'events
- vue globale de la plateforme

Important :
- l'admin Django est un vrai compte `ADMIN`
- l'admin n'a pas de page profil produit

## Fonctionnalites principales

### Recherche
- page `Search` publique
- page de resultats avec scroll interne
- recherche flexible dans :
  - titre d'event
  - description
  - nom d'organization
  - topics
  - lieu
- suggestions de topics via `#`
- topics affiches en bulles dans la barre
- affichage d'events et d'organizations dans les resultats

### Events
- formats :
  - onsite
  - online
  - hybrid
- capacite limitee ou illimitee
- registration mode :
  - auto-confirm
  - manual review
- possibilite d'autoriser l'inscription pendant un event live pour certains formats
- gestion de la visibilite de l'adresse et du meeting link
- details enrichis :
  - logo d'organization
  - lien vers le profil de l'organization
  - statut temporel reel (`upcoming`, `live`, `past`, `cancelled`, `draft`)
  - countdown avant debut et fin des inscriptions

### Dashboard organization
- stats globales :
  - views
  - registrations
  - pending
  - confirmed
  - waitlist
  - average fill rate
  - upcoming / past events
  - cancellation rate
- exports CSV :
  - summary
  - performance

### Profil
- vue `profile`
- vue `profile/edit`
- avertissement si on quitte avec des changements non sauvegardes
- profils organization publics reutilises dans plusieurs contextes

## Installation rapide

### 1. Backend Django

```bash
cd backend-django
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend local :
- API : [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Django admin : [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)
- Swagger : [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/)
- ReDoc : [http://127.0.0.1:8000/api/redoc/](http://127.0.0.1:8000/api/redoc/)

### 2. Frontend React

```bash
cd frontend-react
npm install
npm start
```

Frontend local :
- [http://localhost:3000](http://localhost:3000)

## Base de donnees de demo

Un script de reset / seed est disponible :

```bash
cd backend-django
source .venv/bin/activate
python scripts/reset_and_seed_demo.py
```

Il recree un jeu de donnees de demo coherent avec :
- participants
- organizations
- admin
- events
- registrations

Comptes de demo connus :
- participant : `amelie.rousseau@participants.neurovent.demo` / `Participant2026!`
- organization : `atlas-neuro-labs` / `Company2026!`
- admin : `admin@neurovent.demo` / `Admin2026!`

## Commandes utiles

### Tests backend

```bash
cd backend-django
source .venv/bin/activate
python manage.py test users events registrations tags
```

### Build frontend

```bash
cd frontend-react
npm run build
```

## Live Browser QA

Playwright est configure a la racine pour faire de la QA interactive sans lancer manuellement Django + React a chaque fois.

Preparation initiale :

```bash
npm install
npm run qa:install
```

Commandes utiles :

```bash
# enregistre un parcours depuis le navigateur Playwright
npm run qa:record

# ouvre l'inspecteur Playwright sur le smoke test de base
npm run qa:inspect

# lance le smoke test en mode normal
npm run qa:test

# ouvre l'UI Playwright pour explorer les tests
npm run qa:ui
```

Notes :
- le lanceur reutilise les serveurs deja demarres si `http://127.0.0.1:8000` et `http://127.0.0.1:3000` repondent
- sinon il demarre automatiquement `backend-django/.venv/bin/python manage.py runserver` et `npm start` dans `frontend-react`
- pour enregistrer une page precise : `npm run qa:record -- http://127.0.0.1:3000/login`
- le smoke test de depart verifie simplement que la home publique s'affiche correctement

## Endpoints importants

### Auth
- `POST /api/auth/register/participant/`
- `POST /api/auth/register/company/`
- `POST /api/auth/login/participant/`
- `POST /api/auth/login/company/`
- `GET /api/auth/me/`
- `PATCH /api/auth/me/`

### Events
- `GET /api/events/`
- `GET /api/events/<id>/`
- `POST /api/events/create/`
- `PATCH /api/events/<id>/update/`
- `DELETE /api/events/<id>/delete/`
- `GET /api/events/my-events/`
- `GET /api/events/dashboard-stats/`

### Admin
- `GET /api/auth/admin/users/`
- `GET /api/auth/admin/users/<id>/`
- `PATCH /api/auth/admin/users/<id>/suspend/`
- `PATCH /api/auth/admin/users/<id>/activate/`
- `DELETE /api/auth/admin/users/<id>/delete/`
- `GET /api/auth/admin/companies/`
- `PATCH /api/auth/admin/companies/<id>/verify/`
- `GET /api/events/admin/`
- `GET /api/events/admin/<id>/`
- `DELETE /api/events/admin/<id>/delete/`
- `GET /api/auth/admin/stats/`

## Etat actuel du produit

Le projet contient aujourd'hui :
- un flow participant complet
- un flow organization complet
- un flow admin front complet
- un systeme de profils publics / prives
- un vrai jeu de donnees de demo

Les deux points a toujours garder en tete en local :
- faire `python manage.py migrate` apres un pull
- faire `npm run build` et `python manage.py test users events` apres une grosse passe de modifs

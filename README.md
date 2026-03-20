# Neurovent-Web

Projet de Programmation Web (M1 IAD-VMI) pour construire une application full-stack de gestion d'evenements scientifiques.

## 1. Presentation du projet

**Neurovent-Web** est une plateforme academique pour gerer:
- des conferences et workshops (Machine Learning, Federated Learning, Multi-Agent Systems, Distributed Computing),
- des participants,
- les inscriptions des participants aux evenements.

Le projet respecte l'esprit de la consigne "EventHub" avec:
- modele relationnel propre,
- API REST,
- authentification par roles,
- frontend SPA React,
- comparaison Django vs Node.js,
- deploiement final.

## 2. Etat actuel du repository

- `backend-django/`: initialise (Django + DRF + JWT + CORS + django-filter).
- `frontend-react/`: dossier present, initialisation a faire.
- `backend-node/`: dossier present, initialisation a faire.
- `docs/`: dossier pour rapport, slides et comparaison technique.

## 3. Architecture cible

```text
neurovent-web/
├─ backend-django/      # API principale
├─ frontend-react/      # SPA React
├─ backend-node/        # API simplifiee pour comparaison
├─ docs/                # rapport + presentation
├─ Project 2026.pdf     # sujet officiel
└─ README.md
```

## 4. Prerequis (pour toute l'equipe)

- Git
- Python 3.11+ (ou version compatible Django)
- Node.js 20+ et npm 10+ (pour les parties React/Node)

Verification rapide:

```bash
python3 --version
node --version
npm --version
git --version
```

## 5. Installation du projet (backend Django)

Depuis la racine du projet:

```bash
cd backend-django
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Serveur backend en local:
- `http://127.0.0.1:8000/`
- admin Django: `http://127.0.0.1:8000/admin/`

## 6. Variables d'environnement

Pour l'instant, le projet utilise les valeurs de dev dans `settings.py`.
En production, il faudra externaliser au minimum:
- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- configuration base de donnees.

## 7. Synchronisation equipe (bonnes pratiques)

1. Recuperer les dernieres modifications:

```bash
git pull
```

2. Activer l'environnement Python avant de lancer Django:

```bash
cd backend-django
source .venv/bin/activate
```

3. Si de nouvelles migrations sont ajoutees:

```bash
python manage.py migrate
```

4. Si `requirements.txt` change:

```bash
pip install -r requirements.txt
```

## 8. Commandes utiles

Depuis `backend-django/` avec le venv actif:

```bash
python manage.py check
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

## 9. Prochaines etapes techniques

1. Implementer les modeles metier:
- `Event`
- `Participant`
- `Registration` (relation many-to-many avec contrainte anti-doublon)

2. Ajouter serializers + viewsets + routes API.
3. Ajouter endpoints JWT (`login/refresh`) et permissions par role.
4. Initialiser `frontend-react` (pages obligatoires du sujet).
5. Initialiser `backend-node` simplifie pour la comparaison Lab 8.
6. Rediger la comparaison Django vs Node dans `docs/`.

## 10. Repartition des taches par etudiant (A/B/C)

Section alignee sur la consigne officielle du PDF.

**Thomas - Backend Django**
- modeles de donnees
- implementation DRF
- logique metier
- permissions
- tests backend

**Noureddine - Frontend React**
- architecture des composants
- formulaires
- interface d'authentification
- integration API

**Azouaou - Backend Node + Deploiement**
- API Express
- analyse comparative
- configuration de deploiement
- coordination du rapport et de la presentation

Tous les membres doivent comprendre l'ensemble du projet.

## 11. Notes importantes

- Le dossier `.venv/` est local a chaque membre (non versionne).
- Le fichier `db.sqlite3` local n'est pas versionne.
- Ne jamais commiter de secrets (`.env`, cles API, etc.).

## 12. API Contract

> Base URL : `http://127.0.0.1:8000`
> Authentification : header `Authorization: Bearer <access_token>` (JWT)

### Authentification & Profil

| Methode | URL | Acces | Body attendu | Description |
| --- | --- | --- | --- | --- |
| POST | /api/auth/register/participant/ | Public | `email, password, password_confirm, first_name, last_name` | Inscription participant |
| POST | /api/auth/register/company/ | Public | `company_identifier, password, password_confirm, company_name, recovery_email` | Inscription company |
| POST | /api/auth/login/participant/ | Public | `email, password` | Login participant → JWT |
| POST | /api/auth/login/company/ | Public | `identifier, password` | Login company → JWT (pas d'email, identifiant unique) |
| POST | /api/auth/token/refresh/ | Public | `refresh` | Rafraichir le token JWT |
| GET | /api/auth/me/ | Connecte | - | Voir son profil (participant ou company) |
| PATCH | /api/auth/me/ | Connecte | champs a modifier | Modifier son profil (envoi partiel OK) |
| GET | /api/auth/admin/stats/ | Admin | - | Statistiques globales de la plateforme |

### Evenements

| Methode | URL | Acces | Body attendu | Description |
| --- | --- | --- | --- | --- |
| GET | /api/events/ | Public | - | Liste des events publies (sans token) |
| GET | /api/events/\<id\>/ | Public | - | Detail d'un event (sans token) |
| POST | /api/events/create/ | Company | `title, description, date_start, date_end, capacity, format, registration_mode, status, ...` | Creer un event |
| PUT/PATCH | /api/events/\<id\>/update/ | Company (owner) | champs a modifier | Modifier un event |
| DELETE | /api/events/\<id\>/delete/ | Company (owner) | - | Supprimer un event |
| GET | /api/events/my-events/ | Company | - | Voir tous ses events (tous statuts) |

**Valeurs possibles :**
- `format` : `ONSITE` / `ONLINE` / `HYBRID`
- `status` : `DRAFT` / `PUBLISHED` / `CANCELLED`
- `registration_mode` : `AUTO` (inscription directement confirmee) / `VALIDATION` (en attente d'approbation company)
- `address_visibility` / `online_visibility` : `FULL` / `PARTIAL`

### Inscriptions

| Methode | URL | Acces | Body attendu | Description |
| --- | --- | --- | --- | --- |
| POST | /api/registrations/ | Participant | `event: <id>` | S'inscrire a un event |
| GET | /api/registrations/my/ | Participant | - | Voir ses inscriptions |
| PATCH | /api/registrations/\<id\>/cancel/ | Participant | - | Annuler son inscription |
| GET | /api/registrations/event/\<id\>/ | Company | - | Voir les inscrits d'un event |
| PATCH | /api/registrations/\<id\>/status/ | Company | `status: CONFIRMED / REJECTED` | Confirmer ou rejeter une inscription |

**Valeurs possibles :**
- `status` retourne : `PENDING` / `CONFIRMED` / `REJECTED` / `CANCELLED`

### Tags

| Methode | URL | Acces | Body attendu | Description |
| --- | --- | --- | --- | --- |
| GET | /api/tags/ | Public | - | Liste de tous les tags disponibles |
| POST | /api/tags/create/ | Admin | `name` | Creer un tag (liste geree par l'admin) |

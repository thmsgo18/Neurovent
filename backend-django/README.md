# Backend Django — Neurovent

API REST principale du projet Neurovent. Gère l'authentification, les utilisateurs, les événements et les inscriptions.

---

## Stack

- **Django 6.0.2** + **Django REST Framework**
- **djangorestframework-simplejwt** — authentification JWT
- **django-cors-headers** — autorise les requêtes depuis React
- **Pillow** — upload d'images (logos company)
- **SQLite** — base de données (développement)

---

## Installation

```bash
cd backend-django
python3 -m venv .venv
source .venv/bin/activate        # Mac/Linux
# .venv\Scripts\activate         # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # créer le compte admin
python manage.py runserver
```

L'API est disponible sur `http://127.0.0.1:8000`
L'admin Django est sur `http://127.0.0.1:8000/admin/`

---

## Après un git pull

Si un coéquipier a modifié des modèles :

```bash
source .venv/bin/activate
pip install -r requirements.txt   # si requirements.txt a changé
python manage.py migrate          # appliquer les nouvelles migrations
python manage.py runserver
```

---

## Structure du projet

```
backend-django/
├── config/              → settings.py, urls.py (configuration globale)
├── users/               → CustomUser, authentification, profil, stats admin
├── events/              → Event, CRUD événements
├── registrations/       → Registration, inscriptions
├── tags/                → Tag, liste gérée par l'admin
├── media/               → fichiers uploadés (logos) — non versionné
├── manage.py
└── requirements.txt
```

---

## Authentification JWT

Toutes les requêtes protégées nécessitent ce header :
```
Authorization: Bearer <access_token>
```

Le token est obtenu lors du login. Il contient le rôle de l'utilisateur.

### Token participant contient :
```json
{
  "user_id": "2",
  "role": "PARTICIPANT",
  "email": "alice@test.com",
  "first_name": "Alice",
  "last_name": "Dupont"
}
```

### Token company contient :
```json
{
  "user_id": "3",
  "role": "COMPANY",
  "company_name": "BrainCorp",
  "company_identifier": "braincorp2026"
}
```

Les tokens access expirent après **2 heures**. Utiliser `/api/auth/token/refresh/` avec le `refresh` token pour en obtenir un nouveau sans se reconnecter.

---

## Endpoints API

> Base URL : `http://127.0.0.1:8000`

### Authentification & Profil

| Méthode | URL | Accès | Body |
|---------|-----|-------|------|
| POST | `/api/auth/register/participant/` | Public | `email, password, password_confirm, first_name, last_name` |
| POST | `/api/auth/register/company/` | Public | `company_identifier, password, password_confirm, company_name, recovery_email` |
| POST | `/api/auth/login/participant/` | Public | `email, password` |
| POST | `/api/auth/login/company/` | Public | `identifier, password` |
| POST | `/api/auth/token/refresh/` | Public | `refresh` |
| GET | `/api/auth/me/` | Connecté | — |
| PATCH | `/api/auth/me/` | Connecté | champs à modifier |
| GET | `/api/auth/admin/stats/` | Admin | — |

### Événements

| Méthode | URL | Accès | Notes |
|---------|-----|-------|-------|
| GET | `/api/events/` | Public | Liste events PUBLISHED — paginée (10/page) |
| GET | `/api/events/<id>/` | Public | Détail d'un event |
| POST | `/api/events/create/` | Company | Créer un event |
| PUT/PATCH | `/api/events/<id>/update/` | Company (owner) | Modifier son event |
| DELETE | `/api/events/<id>/delete/` | Company (owner) | Supprimer son event |
| GET | `/api/events/my-events/` | Company | Tous ses events (tous statuts) |
| GET | `/api/events/<id>/stats/` | Company (owner) / Admin | Stats détaillées de l'event |

**Filtres disponibles sur `GET /api/events/` :**
```
?format=ONSITE|ONLINE|HYBRID
?tags=1&tags=2          → events avec au moins un de ces tags (OR)
?date_after=2026-04-01  → events démarrant après cette date
?date_before=2026-05-01 → events démarrant avant cette date
?city=Paris             → filtre sur la ville (insensible à la casse)
?country=France         → filtre sur le pays (insensible à la casse)
?search=neurosciences   → recherche dans titre + description
?ordering=date_start    → tri croissant par date (défaut)
?ordering=-date_start   → tri décroissant par date
?page=2                 → page 2
```

**Réponse paginée :**
```json
{
  "count": 42,
  "next": "http://127.0.0.1:8000/api/events/?page=2",
  "previous": null,
  "results": [{ "id": 1, "title": "..." }, ...]
}
```
> ⚠️ Person B doit lire `response.results` (pas directement `response`).

### Companies

| Méthode | URL | Accès | Notes |
|---------|-----|-------|-------|
| GET | `/api/companies/<id>/` | Public | Profil public + events publiés de la company |

### Inscriptions

| Méthode | URL | Accès | Body |
|---------|-----|-------|------|
| POST | `/api/registrations/` | Participant | `{"event": <id>}` |
| GET | `/api/registrations/my/` | Participant | — |
| PATCH | `/api/registrations/<id>/cancel/` | Participant | — |
| GET | `/api/registrations/event/<id>/` | Company | — |
| PATCH | `/api/registrations/<id>/status/` | Company | `{"status": "CONFIRMED"}` ou `"REJECTED"` |

### Tags

| Méthode | URL | Accès | Body |
|---------|-----|-------|------|
| GET | `/api/tags/` | Public | — |
| POST | `/api/tags/create/` | Admin | `{"name": "Neurosciences"}` |

---

## Exemples de requêtes

### Inscrire un participant
```bash
curl -X POST http://127.0.0.1:8000/api/auth/register/participant/ \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@test.com", "password": "Test1234!", "password_confirm": "Test1234!", "first_name": "Alice", "last_name": "Dupont"}'
```

### Login participant → récupérer le token
```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/participant/ \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@test.com", "password": "Test1234!"}'
```

### Login company (identifiant, pas email)
```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/company/ \
  -H "Content-Type: application/json" \
  -d '{"identifier": "braincorp2026", "password": "Test1234!"}'
```

### Créer un event (token company requis)
```bash
curl -X POST http://127.0.0.1:8000/api/events/create/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <COMPANY_TOKEN>" \
  -d '{
    "title": "Neuro Summit 2026",
    "description": "Grande conférence sur les neurosciences",
    "date_start": "2026-04-15T09:00:00Z",
    "date_end": "2026-04-15T18:00:00Z",
    "capacity": 100,
    "format": "ONSITE",
    "registration_mode": "AUTO",
    "status": "PUBLISHED",
    "address_full": "123 Rue de la Science, 75001 Paris",
    "address_city": "Paris",
    "address_country": "France",
    "address_visibility": "FULL"
  }'
```

### S'inscrire à un event (token participant requis)
```bash
curl -X POST http://127.0.0.1:8000/api/registrations/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <PARTICIPANT_TOKEN>" \
  -d '{"event": 1}'
```

### Modifier son profil + ajouter des tags
```bash
curl -X PATCH http://127.0.0.1:8000/api/auth/me/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"employer_name": "Sorbonne Université", "tag_ids": [1, 2]}'
```
> Pour les tags : envoyer `tag_ids` (liste d'IDs) pour écrire, le champ `tags` retourne `[{id, name}]` en lecture.

---

## Modèles de données

### CustomUser
Un seul modèle pour tous les rôles (`PARTICIPANT`, `COMPANY`, `ADMIN`).

**Champs communs :** `role`, `is_active`, `date_joined`, `tags` (M2M)

**Champs PARTICIPANT :** `email` (login), `first_name`, `last_name`, `employer_name`

**Champs COMPANY :** `company_identifier` (login), `recovery_email`, `company_name`, `company_logo`, `company_description`, `website_url`, `youtube_url`, `linkedin_url`, `twitter_url`, `instagram_url`, `facebook_url`

### Event
**Formats :** `ONSITE` / `ONLINE` / `HYBRID`
**Statuts :** `DRAFT` / `PUBLISHED` / `CANCELLED`
**Mode inscription :** `AUTO` (confirmé direct) / `VALIDATION` (en attente)

Champs de localisation : `address_full`, `address_city`, `address_country`, `address_visibility` (`FULL`/`PARTIAL`), `address_reveal_date`

Champs distanciel : `online_platform`, `online_link`, `online_visibility`, `online_reveal_date`

### Registration
**Statuts :** `PENDING` / `CONFIRMED` / `REJECTED` / `CANCELLED`

Un participant ne peut avoir qu'une seule inscription par événement (contrainte `unique_together`).

---

## Logique métier importante

### Mode d'inscription AUTO vs VALIDATION
- `AUTO` → à la création de l'inscription, statut = `CONFIRMED` immédiatement
- `VALIDATION` → statut = `PENDING`, la company doit confirmer ou rejeter manuellement

### Visibilité adresse / lien
- `FULL` → toujours afficher l'info complète
- `PARTIAL` sans `reveal_date` → toujours afficher seulement ville+pays ou nom plateforme
- `PARTIAL` avec `reveal_date` → afficher partiel jusqu'à la date, puis complet automatiquement

### tags vs tag_ids
- **Lecture** (`GET`) → champ `tags` retourne `[{"id": 1, "name": "Neurosciences"}]`
- **Écriture** (`PATCH`) → envoyer `tag_ids: [1, 2]` (jamais `tags: [1, 2]`)

---

## Commandes utiles

```bash
# Recréer la base depuis zéro (dev uniquement, efface toutes les données)
rm db.sqlite3
find . -path "*/migrations/0*.py" -delete
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

# Après modification d'un modèle
python manage.py makemigrations
python manage.py migrate

# Vérifier que le projet n'a pas d'erreurs
python manage.py check
```

---

## Variables d'environnement (production)

En développement tout est dans `settings.py`. En production, externaliser :
- `SECRET_KEY`
- `DEBUG=False`
- `ALLOWED_HOSTS`
- Configuration base de données (PostgreSQL recommandé)
- `CORS_ALLOWED_ORIGINS` (URL du frontend déployé)

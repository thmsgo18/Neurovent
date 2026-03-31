# Backend Django — Neurovent

API REST principale du projet Neurovent. Gère l'authentification, les utilisateurs, les événements, les inscriptions et la liste d'attente.

---

## Stack

- **Django 6.0.2** + **Django REST Framework**
- **djangorestframework-simplejwt** — authentification JWT + blacklist logout
- **django-cors-headers** — autorise les requêtes depuis React
- **django-filter** — filtres avancés sur les événements
- **drf-spectacular** — documentation API interactive (Swagger / ReDoc)
- **Pillow** — upload d'images (logos company + bannières events)
- **python-decouple** — variables d'environnement (.env)
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
La doc Swagger est sur `http://127.0.0.1:8000/api/docs/`
La doc ReDoc est sur `http://127.0.0.1:8000/api/redoc/`

---

## Configuration (.env)

Créer un fichier `.env` dans `backend-django/` (jamais commité) :

```
# Email (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=neurovent.noreply@gmail.com
EMAIL_HOST_PASSWORD=xxxxxxxxxxxx

# Frontend
FRONTEND_URL=http://localhost:5173
```

> Le mot de passe email est un **mot de passe d'application Google** (16 caractères, sans espaces).
> Pour en créer un : [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (nécessite la validation en 2 étapes activée).

Ces variables ont des **valeurs par défaut** pour le dev — `SECRET_KEY`, `DEBUG` et `ALLOWED_HOSTS` n'ont pas besoin d'être dans le `.env` en développement.

---

## Déploiement (Railway / Render)

En production, ajouter ces variables supplémentaires dans le dashboard de la plateforme (pas dans un `.env` commité) :

```
SECRET_KEY=une-vraie-clé-secrète-générée
DEBUG=False
ALLOWED_HOSTS=ton-domaine.up.railway.app,localhost
```

Pour générer une `SECRET_KEY` sécurisée :
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

> En dev, `SECRET_KEY` utilise une valeur fallback insecure (préfixée `django-insecure-`).
> En prod, une vraie clé est obligatoire — ne jamais utiliser la clé insecure.

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

## Tests

```bash
# Lancer tous les tests
python manage.py test users events registrations tags

# Avec détail de chaque test
python manage.py test users events registrations tags --verbosity=2
```

**95 tests** couvrant les 4 apps :

| App | Tests | Ce qui est couvert |
|-----|-------|--------------------|
| `users` | 28 | Inscription, login, profil, mot de passe, RGPD, admin |
| `events` | 28 | CRUD, filtres, stats, recommandations, permissions |
| `registrations` | 28 | AUTO/VALIDATION, waitlist, annulation, CSV, permissions |
| `tags` | 10 | Liste, création, suppression, permissions |

---

## Structure du projet

```
backend-django/
├── config/              → settings.py, urls.py (configuration globale)
├── users/               → CustomUser, authentification, profil, stats admin
├── events/              → Event, CRUD événements, filtres, recommandations
├── registrations/       → Registration, inscriptions, liste d'attente, export CSV
├── tags/                → Tag, liste gérée par l'admin
├── emails.py            → centralisation de tous les emails de la plateforme
├── media/               → fichiers uploadés — non versionné
│   ├── logos/           → logos des companies
│   └── banners/         → bannières des events
├── .env                 → credentials — non versionné
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
| POST | `/api/auth/register/company/` | Public | `company_identifier, password, password_confirm, company_name, recovery_email, siret, legal_representative` |
| POST | `/api/auth/login/participant/` | Public | `email, password` |
| POST | `/api/auth/login/company/` | Public | `identifier, password` |
| POST | `/api/auth/token/refresh/` | Public | `refresh` |
| POST | `/api/auth/logout/` | Connecté | `refresh` — invalide le token |
| GET | `/api/auth/me/` | Connecté | — |
| PATCH | `/api/auth/me/` | Connecté | champs à modifier (`tag_ids` pour les tags) |
| DELETE | `/api/auth/me/` | Connecté | — Suppression compte RGPD |
| PATCH | `/api/auth/me/password/` | Connecté | `current_password, new_password, new_password_confirm` |
| POST | `/api/auth/password-reset/` | Public | `email` — envoie un lien par email |
| POST | `/api/auth/password-reset/confirm/` | Public | `uid, token, new_password, new_password_confirm` |
| GET | `/api/auth/admin/stats/` | Admin | — |
| GET | `/api/auth/admin/users/` | Admin | `?role=PARTICIPANT\|COMPANY\|ADMIN` — liste des utilisateurs |
| PATCH | `/api/auth/admin/users/<id>/suspend/` | Admin | — Suspend un compte |
| PATCH | `/api/auth/admin/users/<id>/activate/` | Admin | — Réactive un compte |
| DELETE | `/api/auth/admin/users/<id>/delete/` | Admin | — Suppression RGPD forcée (impossible sur un autre admin) |
| GET | `/api/auth/admin/companies/pending/` | Admin | `?status=PENDING\|NEEDS_REVIEW\|VERIFIED\|REJECTED` |
| PATCH | `/api/auth/admin/companies/<id>/verify/` | Admin | `{"verification_status": "VERIFIED\|REJECTED", "review_note": "..."}` |
| PATCH | `/api/auth/me/verification/document/` | Company | Upload Kbis/RNE — passe en NEEDS_REVIEW si PENDING/REJECTED |

> **Upload logo company** : utiliser `multipart/form-data` (pas JSON)
> ```bash
> curl -X PATCH /api/auth/me/ -H "Authorization: Bearer TOKEN" -F "company_logo=@logo.png"
> ```

### Événements

| Méthode | URL | Accès | Notes |
|---------|-----|-------|-------|
| GET | `/api/events/` | Public | Liste events PUBLISHED — paginée (10/page) |
| GET | `/api/events/<id>/` | Public | Détail d'un event **PUBLISHED** (404 si DRAFT) |
| POST | `/api/events/create/` | Company **VERIFIED** | Créer un event (403 si non vérifiée) |
| PUT/PATCH | `/api/events/<id>/update/` | Company (owner) | Modifier son event |
| DELETE | `/api/events/<id>/delete/` | Company (owner) | Supprimer son event |
| GET | `/api/events/my-events/` | Company | Tous ses events (tous statuts, y compris DRAFT) |
| GET | `/api/events/<id>/stats/` | Company (owner) / Admin | Stats détaillées de l'event |
| GET | `/api/events/recommended/` | Participant uniquement | Events recommandés selon ses tags |

> ⚠️ **Important pour Noureddine** : `GET /api/events/<id>/` retourne **404 pour un event DRAFT**.
> Pour afficher un brouillon sur le dashboard company, utiliser `GET /api/events/my-events/`.

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
?status=DRAFT           → admin uniquement — voir les events non publiés
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
> ⚠️ Noureddine doit lire `response.results` (pas directement `response`).

> **Upload bannière event** : utiliser `multipart/form-data`
> ```bash
> curl -X PATCH /api/events/1/update/ -H "Authorization: Bearer TOKEN" -F "banner=@image.png"
> ```

### Companies

| Méthode | URL | Accès | Notes |
|---------|-----|-------|-------|
| GET | `/api/companies/<id>/` | Public | Profil public + events publiés de la company |

### Inscriptions

| Méthode | URL | Accès | Body |
|---------|-----|-------|------|
| POST | `/api/registrations/` | Participant | `{"event": <id>}` — optionnel : `accessibility_needs` |
| GET | `/api/registrations/my/` | Participant | `?status=CONFIRMED\|PENDING\|WAITLIST\|CANCELLED\|REJECTED` |
| PATCH | `/api/registrations/<id>/cancel/` | Participant | — |
| GET | `/api/registrations/event/<id>/` | Company | — |
| PATCH | `/api/registrations/<id>/status/` | Company / Admin | `{"status": "CONFIRMED\|REJECTED", "company_comment": "..."}` |
| GET | `/api/registrations/event/<id>/export/` | Company (owner) / Admin | Télécharge un CSV des inscrits |

**Champs de l'inscription :**
- `accessibility_needs` — besoins d'accessibilité du participant (PMR, etc.), optionnel, renseigné à l'inscription
- `company_comment` — commentaire de l'organisateur (visible par le participant), renseigné lors de la validation

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
| `/api/schema/` | Schéma OpenAPI brut (JSON/YAML) |

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

### Logout (invalide le refresh token)
```bash
curl -X POST http://127.0.0.1:8000/api/auth/logout/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"refresh": "<REFRESH_TOKEN>"}'
```

### Login company (identifiant, pas email)
```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/company/ \
  -H "Content-Type: application/json" \
  -d '{"identifier": "braincorp2026", "password": "Test1234!"}'
```

### Créer un event
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
    "registration_deadline": "2026-04-10T23:59:00Z"
  }'
```

### S'inscrire à un event (avec besoins d'accessibilité)
```bash
curl -X POST http://127.0.0.1:8000/api/registrations/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <PARTICIPANT_TOKEN>" \
  -d '{"event": 1, "accessibility_needs": "Fauteuil roulant"}'
# Si places disponibles → status: "CONFIRMED"
# Si event complet (mode AUTO) → status: "WAITLIST", waitlist_position: 1
```

### Modifier son profil + ajouter des tags
```bash
curl -X PATCH http://127.0.0.1:8000/api/auth/me/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"employer_name": "Sorbonne Université", "tag_ids": [1, 2]}'
```
> Pour les tags : envoyer `tag_ids` (liste d'IDs) pour écrire, le champ `tags` retourne `[{id, name}]` en lecture.

### Supprimer son compte (RGPD)
```bash
curl -X DELETE http://127.0.0.1:8000/api/auth/me/ \
  -H "Authorization: Bearer <TOKEN>"
# → anonymise les données perso + annule les inscriptions futures
# → garde l'historique des events passés
```

---

## Modèles de données

### CustomUser
Un seul modèle pour tous les rôles (`PARTICIPANT`, `COMPANY`, `ADMIN`).

**Champs communs :** `role`, `is_active`, `date_joined`, `tags` (M2M)

**Champs PARTICIPANT :** `email` (login), `first_name`, `last_name`, `employer_name`

**Champs COMPANY :** `company_identifier` (login — lettres, chiffres, tirets, min 3 car.), `recovery_email`, `company_name`, `company_logo`, `company_description`, `website_url`, `youtube_url`, `linkedin_url`, `twitter_url`, `instagram_url`, `facebook_url`

### Event
**Formats :** `ONSITE` / `ONLINE` / `HYBRID`
**Statuts :** `DRAFT` / `PUBLISHED` / `CANCELLED`
**Mode inscription :** `AUTO` (confirmé direct) / `VALIDATION` (en attente)

Champs de localisation : `address_full`, `address_city`, `address_country`, `address_visibility` (`FULL`/`PARTIAL`), `address_reveal_date`

Champs distanciel : `online_platform`, `online_link`, `online_visibility`, `online_reveal_date`

Champs calculés : `spots_remaining`, `registration_open`, `is_full`

Champ date limite : `registration_deadline` (optionnel)

Champ visuel : `banner` (image uploadée, stockée dans `media/banners/`)

### Registration
**Statuts :** `PENDING` / `CONFIRMED` / `REJECTED` / `CANCELLED` / `WAITLIST`

**Champs notables :**
- `accessibility_needs` — besoins du participant (renseigné à l'inscription)
- `company_comment` — commentaire de l'organisateur (renseigné lors de la validation)
- `waitlist_position` — calculé dynamiquement, `null` si pas en WAITLIST

Un participant ne peut avoir qu'une seule inscription par événement (contrainte `unique_together`). Tenter de se réinscrire alors qu'une inscription active (PENDING/CONFIRMED/WAITLIST) existe retourne une erreur 400. En revanche, si l'inscription était CANCELLED ou REJECTED, elle est **réactivée** avec le bon statut (pas de doublon en base).

---

## Vérification entreprise (SIRENE)

À l'inscription, le SIRET est contrôlé automatiquement via l'API officielle :
```
https://api.annuaire-entreprises.data.gouv.fr/etablissement/{siret}
```
Gratuite, sans authentification requise, données INSEE en temps réel.

### Logique de décision automatique

| Condition | Statut attribué |
|-----------|----------------|
| SIRET invalide (pas 14 chiffres) | `REJECTED` |
| SIRET introuvable dans SIRENE | `REJECTED` |
| Établissement fermé ou radié | `REJECTED` |
| SIRET valide + actif + nom similaire ≥ 70% | `VERIFIED` ✅ |
| SIRET valide + actif + nom trop différent | `NEEDS_REVIEW` |
| Erreur réseau / API indisponible | `NEEDS_REVIEW` |

### Flow complet
1. Company s'inscrit avec `siret` + `legal_representative` (désormais obligatoires)
2. Backend appelle l'API SIRENE automatiquement après création du compte
3. Email envoyé à `recovery_email` avec le résultat (VERIFIED / NEEDS_REVIEW / REJECTED)
4. Si `NEEDS_REVIEW` ou `REJECTED` → upload d'un justificatif possible :
```bash
curl -X PATCH /api/auth/me/verification/document/ \
  -H "Authorization: Bearer <TOKEN>" \
  -F "verification_document=@kbis.pdf"
```
5. L'admin examine et valide/rejette via `PATCH /api/auth/admin/companies/<id>/verify/`

> **Restriction importante** : seules les companies `VERIFIED` peuvent créer des événements. Une company `PENDING` ou `NEEDS_REVIEW` reçoit un 403.

---

## Logique métier importante

### Mode d'inscription AUTO vs VALIDATION
- `AUTO` → statut = `CONFIRMED` immédiatement
- `VALIDATION` → statut = `PENDING`, la company (ou un admin) doit confirmer ou rejeter manuellement

### Liste d'attente (Waitlist)
- En mode `AUTO`, si l'event est complet → statut = `WAITLIST` (pas d'erreur)
- En mode `VALIDATION`, si l'event est complet → erreur 400 "complet"
- Dès qu'une place se libère (annulation ou rejet) → le premier en `WAITLIST` est automatiquement promu à `CONFIRMED`
- `waitlist_position` indique la position dans la file (1 = premier)

### Date limite d'inscription
- Si `registration_deadline` est définie et dépassée → inscription refusée
- Sans deadline → inscriptions ouvertes jusqu'au début de l'event
- `registration_open` (booléen) calculé automatiquement

### Visibilité adresse / lien
- `FULL` → toujours afficher l'info complète
- `PARTIAL` sans `reveal_date` → afficher seulement ville+pays ou nom plateforme
- `PARTIAL` avec `reveal_date` → partiel jusqu'à la date, puis complet automatiquement

### Suppression de compte RGPD
- Les données personnelles sont anonymisées (pas supprimées)
- Les inscriptions aux events futurs sont annulées
- L'historique des events passés est conservé (anonymisé)
- Le compte est désactivé (`is_active = False`)

### tags vs tag_ids
- **Lecture** (`GET`) → champ `tags` retourne `[{"id": 1, "name": "Neurosciences"}]`
- **Écriture** (`PATCH`) → envoyer `tag_ids: [1, 2]` (jamais `tags: [1, 2]`)

---

## Commandes utiles

```bash
# Lancer les tests
python manage.py test users events registrations tags

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

## Notifications email automatiques

Toutes les fonctions d'envoi sont centralisées dans `emails.py`.

| Déclencheur | Destinataire | Email envoyé |
|-------------|-------------|--------------|
| Inscription confirmée (AUTO ou validation manuelle) | Participant | Confirmation + détails event (lieu/lien) |
| Promotion depuis la liste d'attente | Participant | "Une place vient de se libérer" + détails |
| Inscription rejetée | Participant | Notification rejet + lien autres events |
| Event passé à CANCELLED | Tous les inscrits actifs | Notification annulation |
| Demande reset mot de passe | Demandeur | Lien de réinitialisation (valable 24h) |

> **Architecture HTML-ready** : les emails utilisent `EmailMultiAlternatives`. Pour ajouter un template HTML, passer `html_message=<contenu>` à `_send()` dans `emails.py`.

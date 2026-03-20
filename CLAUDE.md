# CLAUDE.md — Contexte complet du projet Neurovent

Ce fichier contient tout ce que Claude doit savoir pour travailler efficacement sur ce projet.

---

## 1. Présentation du projet

**Neurovent** est une plateforme de gestion d'événements scientifiques (conférences, workshops,
séminaires sur des thèmes comme le Machine Learning, les Neurosciences, l'IA, etc.).

C'est un projet académique de groupe (M1 IAD-VMI) basé sur la consigne "EventHub" de l'enseignante.
Le projet est une "coloration" de la consigne de base — même structure technique, thème neurosciences.

**Deadline finale : 10 avril 2026**
**Demo intermédiaire enseignante : ~27 mars 2026**

---

## 2. Équipe

| Personne | Rôle | Responsabilité |
|----------|------|----------------|
| **Thomas (A)** | Backend Django | Modèles, API REST, JWT, permissions, logique métier |
| **Noureddine (B)** | Frontend React | Composants, pages, formulaires, intégration API |
| **Azouaou (C)** | Node.js + Déploiement | API Express simplifiée, comparaison Django vs Node, rapport |

---

## 3. Stack technique

### Backend Django (Thomas)
- **Django 6.0.2** + **Django REST Framework**
- **djangorestframework-simplejwt** — authentification par token JWT
- **django-cors-headers** — CORS pour autoriser les requêtes React
- **Pillow** — upload d'images (logos company)
- Base de données : **SQLite** (développement)
- Dossier : `backend-django/`
- Config Django : `backend-django/config/`
- Lancer : `cd backend-django && source .venv/bin/activate && python manage.py runserver`
- URL locale : `http://127.0.0.1:8000`
- Admin Django : `http://127.0.0.1:8000/admin/` (admin@neurovent.com)

### Frontend React (Noureddine)
- **React** + **React Router DOM** (routing)
- **CSS natif** + **Lucide React** (icônes)
- **JWT** pour l'authentification (stockage et envoi du token)
- Dossier : `frontend-react/`

### Backend Node.js (Azouaou)
- **Express.js** — API simplifiée pour comparaison avec Django
- Dossier : `backend-node/` (à initialiser)

---

## 4. Architecture des apps Django

```
backend-django/
├── config/          → settings.py, urls.py, wsgi.py, asgi.py
├── users/           → CustomUser, auth, profil, stats admin
├── events/          → Event, CRUD events
├── registrations/   → Registration, inscriptions
├── tags/            → Tag, liste gérée par admin
└── participants/    → app vide (ancienne version, ignorée)
```

---

## 5. Modèles de données

### CustomUser (`users/models.py`)
Un seul modèle pour tous les types d'utilisateurs, différenciés par le champ `role`.

```
role           → PARTICIPANT | COMPANY | ADMIN
is_active      → bool (modération admin)
is_staff       → bool (accès Django admin)
date_joined    → DateTimeField auto
tags           → ManyToMany → Tag

# Champs PARTICIPANT
email          → EmailField unique (login participant)
first_name     → CharField
last_name      → CharField
employer_name  → CharField (entreprise où il travaille)

# Champs COMPANY
company_identifier → CharField unique (login company, PAS l'email)
recovery_email     → EmailField (pour récupération de compte futur)
company_name       → CharField
company_logo       → ImageField (upload_to='logos/')
company_description → TextField
website_url        → URLField
youtube_url        → URLField
linkedin_url       → URLField
twitter_url        → URLField
instagram_url      → URLField
facebook_url       → URLField
```

**Important** : `USERNAME_FIELD = 'email'` mais les companies se connectent via
`company_identifier` avec un endpoint de login séparé.

### Event (`events/models.py`)
```
company            → FK → CustomUser (role=COMPANY)
title              → CharField
description        → TextField
date_start         → DateTimeField
date_end           → DateTimeField
capacity           → PositiveIntegerField
status             → DRAFT | PUBLISHED | CANCELLED
format             → ONSITE | ONLINE | HYBRID
registration_mode  → AUTO | VALIDATION
tags               → ManyToMany → Tag
created_at         → DateTimeField auto
updated_at         → DateTimeField auto

# Localisation présentiel (ONSITE + HYBRID)
address_full         → CharField (adresse complète)
address_city         → CharField
address_country      → CharField
address_visibility   → FULL | PARTIAL
address_reveal_date  → DateTimeField (optionnel)

# Lien distanciel (ONLINE + HYBRID)
online_platform      → CharField (ex: "Zoom", "YouTube")
online_link          → URLField
online_visibility    → FULL | PARTIAL
online_reveal_date   → DateTimeField (optionnel)
```

**Logique visibilité** :
- `FULL` → toujours afficher l'info complète
- `PARTIAL` + pas de reveal_date → toujours afficher ville/pays ou nom plateforme seulement
- `PARTIAL` + reveal_date → afficher partiel jusqu'à la date, puis complet

**spots_remaining** : calculé dynamiquement = `capacity - inscriptions CONFIRMED`

### Registration (`registrations/models.py`)
```
participant  → FK → CustomUser (role=PARTICIPANT)
event        → FK → Event
status       → PENDING | CONFIRMED | REJECTED | CANCELLED
created_at   → DateTimeField auto
updated_at   → DateTimeField auto
unique_together = ['participant', 'event']
```

**Logique registration_mode** :
- `AUTO` → à la création, statut = `CONFIRMED` immédiatement
- `VALIDATION` → à la création, statut = `PENDING`, company doit confirmer/rejeter

### Tag (`tags/models.py`)
```
name  → CharField unique
```
Liste fixe gérée uniquement par l'admin Django. Les users/companies/events peuvent
s'y associer via ManyToMany mais ne peuvent pas créer de tags.

---

## 6. API Contract complet

> Base URL : `http://127.0.0.1:8000`
> Auth : header `Authorization: Bearer <access_token>`

### Authentification & Profil

| Méthode | URL | Accès | Body |
|---------|-----|-------|------|
| POST | `/api/auth/register/participant/` | Public | `email, password, password_confirm, first_name, last_name` |
| POST | `/api/auth/register/company/` | Public | `company_identifier, password, password_confirm, company_name, recovery_email` |
| POST | `/api/auth/login/participant/` | Public | `email, password` |
| POST | `/api/auth/login/company/` | Public | `identifier, password` |
| POST | `/api/auth/token/refresh/` | Public | `refresh` |
| GET | `/api/auth/me/` | Connecté | — |
| PATCH | `/api/auth/me/` | Connecté | champs partiels (ex: `tag_ids: [1,2]`) |
| GET | `/api/auth/admin/stats/` | Admin | — |

**Réponse login** : `{ refresh: "...", access: "..." }`
**Token JWT contient** : `user_id, role, email, first_name, last_name` (participant)
ou `user_id, role, company_name, company_identifier` (company)

**Important sur les tags** :
- Pour **lire** les tags : champ `tags` → retourne `[{id, name}]`
- Pour **écrire** les tags : champ `tag_ids` → envoyer `[1, 2, 3]` (IDs)
- Exemple PATCH : `{"tag_ids": [1]}` (PAS `{"tags": [1]}`)

### Événements

| Méthode | URL | Accès | Notes |
|---------|-----|-------|-------|
| GET | `/api/events/` | Public | Liste events PUBLISHED |
| GET | `/api/events/<id>/` | Public | Détail event PUBLISHED |
| POST | `/api/events/create/` | Company | Crée un event |
| PUT/PATCH | `/api/events/<id>/update/` | Company (owner) | Modifie son event |
| DELETE | `/api/events/<id>/delete/` | Company (owner) | Supprime son event |
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

| Méthode | URL | Accès |
|---------|-----|-------|
| GET | `/api/tags/` | Public |
| POST | `/api/tags/create/` | Admin |

---

## 7. Permissions par rôle

| Action | Non connecté | Participant | Company | Admin |
|--------|-------------|-------------|---------|-------|
| Voir liste events | ✅ | ✅ | ✅ | ✅ |
| Voir détail event | ✅ | ✅ | ✅ | ✅ |
| S'inscrire à un event | ❌ | ✅ | ❌ | ❌ |
| Créer un event | ❌ | ❌ | ✅ | ❌ |
| Modifier/supprimer son event | ❌ | ❌ | ✅ (owner) | ✅ |
| Valider des inscriptions | ❌ | ❌ | ✅ (owner) | ✅ |
| Voir stats globales | ❌ | ❌ | ❌ | ✅ |
| Gérer les tags | ❌ | ❌ | ❌ | ✅ |
| Désactiver un compte | ❌ | ❌ | ❌ | ✅ (admin Django) |

---

## 8. État d'avancement

### ✅ Milestone 1 — Complété (20 mars 2026)
- Tous les modèles créés et migrés
- 14 endpoints testés et fonctionnels
- JWT avec rôle dans le token
- Login séparé participant / company
- Tags M2M fonctionnels (bug update corrigé)
- Stats admin
- Admin Django configuré
- CORS configuré
- README API Contract à jour

### 🔲 Milestone 2 — À faire (avant 10 avril 2026)
**Backend (Thomas) :**
- [ ] Filtres sur les events (`?format=ONSITE&tags=1&date_after=...`)
- [ ] Tester upload logo company (PATCH /api/auth/me/ avec multipart/form-data)
- [ ] Endpoint profil public company (`GET /api/companies/<id>/`)
- [ ] Pagination sur la liste des events
- [ ] Stats par event pour la company (`GET /api/events/<id>/stats/`)

**Frontend (Noureddine) :**
- [ ] Pages Login/Register (participant + company)
- [ ] Page liste des events
- [ ] Page détail event + bouton inscription
- [ ] Dashboard company (mes events, inscrits)
- [ ] Page profil utilisateur

**Node.js (Azouaou) :**
- [ ] API Express simplifiée (subset des endpoints Django)
- [ ] Comparaison Django vs Node (rapport)

**Tous :**
- [ ] Rapport écrit
- [ ] Slides présentation
- [ ] Déploiement

---

## 9. Commandes utiles

```bash
# Lancer le backend
cd backend-django
source .venv/bin/activate
python manage.py runserver

# Créer les migrations après modification d'un modèle
python manage.py makemigrations
python manage.py migrate

# Recréer la base depuis zéro (dev uniquement)
rm db.sqlite3
find . -path "*/migrations/0*.py" -delete
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

# Installer les dépendances
pip install -r requirements.txt
```

---

## 10. Décisions d'architecture importantes

1. **Un seul modèle CustomUser** pour tous les rôles → plus simple, une seule table, JWT simple.

2. **Deux endpoints de login séparés** (`/login/participant/` et `/login/company/`) car
   les companies se connectent avec un identifiant (pas un email).

3. **Tags : liste fixe admin** (pas libre) → cohérence des données, filtres plus fiables.

4. **registration_mode AUTO** → statut CONFIRMED immédiat, pas de workflow.
   **registration_mode VALIDATION** → statut PENDING, la company confirme/rejette.

5. **tag_ids pour écriture, tags pour lecture** → pattern DRF standard pour ManyToMany.
   Ne jamais envoyer `{"tags": [...]}` pour modifier les tags, toujours `{"tag_ids": [...]}`.

6. **Visibilité adresse/lien** : la company choisit FULL ou PARTIAL + date de révélation optionnelle.
   La logique de révélation est calculée côté backend dans le serializer.

---

## 11. Pièges connus

- **Token JWT expiré** : les access tokens durent 2h. Si erreur `token_not_valid`, refaire `/login/`.
- **CORS** : si le front ne reçoit rien, vérifier que l'URL React est dans `CORS_ALLOWED_ORIGINS` dans `settings.py`.
- **ManyToMany** : toujours utiliser `instance.tags.set(tags)` dans `update()`, jamais `setattr()`.
- **company_identifier** : doit être unique, pas d'espaces recommandés (style `braincorp2026`).
- **Migration conflit** : si erreur `InconsistentMigrationHistory`, supprimer `db.sqlite3` et relancer `migrate`.
- **Upload image** : utiliser `multipart/form-data` (pas `application/json`) pour les requêtes avec fichiers.

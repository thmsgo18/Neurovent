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
- **django-filter** — filtres sur la liste des events
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
├── users/           → CustomUser, auth, profil, stats admin, profil public company
├── events/          → Event, CRUD events, filtres, stats par event
├── registrations/   → Registration, inscriptions
├── tags/            → Tag, liste gérée par admin
└── media/           → fichiers uploadés (logos) — non versionné
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

**Upload logo company** : utiliser `multipart/form-data` (pas JSON)
```bash
curl -X PATCH /api/auth/me/ -H "Authorization: Bearer TOKEN" -F "company_logo=@logo.png"
```

### Événements

| Méthode | URL | Accès | Notes |
|---------|-----|-------|-------|
| GET | `/api/events/` | Public | Liste events PUBLISHED — paginée (10/page) |
| GET | `/api/events/<id>/` | Public | Détail event PUBLISHED |
| POST | `/api/events/create/` | Company | Crée un event |
| PUT/PATCH | `/api/events/<id>/update/` | Company (owner) | Modifie son event |
| DELETE | `/api/events/<id>/delete/` | Company (owner) | Supprime son event |
| GET | `/api/events/my-events/` | Company | Tous ses events (tous statuts) |
| GET | `/api/events/<id>/stats/` | Company (owner) / Admin | Stats de l'event |

**Filtres disponibles sur `GET /api/events/` :**
```
?format=ONSITE|ONLINE|HYBRID
?tags=1&tags=2          → events avec au moins un de ces tags
?date_after=2026-04-01  → events démarrant après cette date
?date_before=2026-05-01 → events démarrant avant cette date
?city=Paris
?country=France
?search=neurosciences   → recherche dans titre + description
?ordering=date_start    → tri croissant (défaut)
?ordering=-date_start   → tri décroissant
?page=2                 → page 2 (10 events par page)
```

**Réponse paginée :**
```json
{ "count": 42, "next": "...?page=2", "previous": null, "results": [...] }
```

### Companies

| Méthode | URL | Accès | Notes |
|---------|-----|-------|-------|
| GET | `/api/companies/<id>/` | Public | Profil public + events publiés de la company |

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
| Voir profil public company | ✅ | ✅ | ✅ | ✅ |
| S'inscrire à un event | ❌ | ✅ | ❌ | ❌ |
| Créer un event | ❌ | ❌ | ✅ | ❌ |
| Modifier/supprimer son event | ❌ | ❌ | ✅ (owner) | ✅ |
| Valider des inscriptions | ❌ | ❌ | ✅ (owner) | ✅ |
| Voir stats d'un event | ❌ | ❌ | ✅ (owner) | ✅ |
| Voir stats globales | ❌ | ❌ | ❌ | ✅ |
| Gérer les tags | ❌ | ❌ | ❌ | ✅ |
| Désactiver un compte | ❌ | ❌ | ❌ | ✅ (admin Django) |

---

## 8. État d'avancement

### ✅ Backend Django (Thomas) — 100% TERMINÉ

- [x] Tous les modèles créés et migrés (CustomUser, Event, Registration, Tag)
- [x] 16 endpoints testés et fonctionnels
- [x] JWT avec rôle dans le token
- [x] Login séparé participant (email) / company (identifiant)
- [x] Tags M2M fonctionnels (tag_ids pour écriture, tags pour lecture)
- [x] Stats admin globales
- [x] Filtres events (format, tags, date, ville, pays, search, ordering)
- [x] Pagination (10 events/page)
- [x] Upload logo company (multipart/form-data)
- [x] Profil public company avec events publiés
- [x] Stats par event (company owner + admin)
- [x] Admin Django configuré
- [x] CORS configuré (localhost:3000 et :5173)
- [x] README backend à jour

### 🔲 Frontend (Noureddine) — En cours
- [ ] Pages Login/Register (participant + company)
- [ ] Page liste des events (avec filtres)
- [ ] Page détail event + bouton inscription
- [ ] Dashboard company (mes events, inscrits)
- [ ] Page profil utilisateur

### 🔲 Node.js (Azouaou) — À faire
- [ ] API Express simplifiée (subset des endpoints Django)
- [ ] Comparaison Django vs Node (rapport)

### 🔲 Tous — À faire
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

7. **Pagination** : 10 events par page, navigable avec `?page=2`. Réponse enveloppée dans
   `{count, next, previous, results}`.

8. **URL_FORMAT_OVERRIDE = 'response_format'** : DRF utilise nativement `?format=` pour le
   content negotiation. On l'a renommé pour libérer `?format=` pour nos filtres d'events.

9. **Profil public company** : `GET /api/companies/<id>/` retourne les infos publiques uniquement.
   `recovery_email` et `company_identifier` ne sont jamais exposés publiquement.

---

## 11. Pièges connus

- **Token JWT expiré** : les access tokens durent 2h. Si erreur `token_not_valid`, refaire `/login/`.
- **CORS** : si le front ne reçoit rien, vérifier que l'URL React est dans `CORS_ALLOWED_ORIGINS` dans `settings.py`.
- **ManyToMany** : toujours utiliser `instance.tags.set(tags)` dans `update()`, jamais `setattr()`.
- **company_identifier** : doit être unique, pas d'espaces recommandés (style `braincorp2026`).
- **Migration conflit** : si erreur `InconsistentMigrationHistory`, supprimer `db.sqlite3` et relancer `migrate`.
- **Upload image** : utiliser `multipart/form-data` (pas `application/json`) pour les requêtes avec fichiers. Avec curl : `-F "company_logo=@fichier.png"` sans header `Content-Type`.
- **Filtre format** : `?format=` est réservé par DRF (content negotiation). On a configuré `URL_FORMAT_OVERRIDE = 'response_format'` dans settings.py pour lever ce conflit. Ne pas supprimer ce paramètre.
- **Pagination** : la réponse de `GET /api/events/` est maintenant enveloppée. Person B doit lire `response.results` et pas directement `response`.

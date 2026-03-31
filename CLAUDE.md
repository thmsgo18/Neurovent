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
- **django-filter** — filtres avancés sur la liste des events
- **drf-spectacular** — documentation API automatique (Swagger + ReDoc)
- **Pillow** — upload d'images (logos company + bannières events)
- **python-decouple** — variables d'environnement via fichier `.env`
- Base de données : **SQLite** (développement)
- Dossier : `backend-django/`
- Config Django : `backend-django/config/`
- Lancer : `cd backend-django && source .venv/bin/activate && python manage.py runserver`
- URL locale : `http://127.0.0.1:8000`
- Admin Django : `http://127.0.0.1:8000/admin/` (admin@neurovent.com)
- Swagger : `http://127.0.0.1:8000/api/docs/`
- ReDoc : `http://127.0.0.1:8000/api/redoc/`

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
├── events/          → Event, CRUD events, filtres, stats par event, recommandations
├── registrations/   → Registration, inscriptions, liste d'attente (waitlist), export CSV
├── tags/            → Tag, liste gérée par admin
├── emails.py        → centralisation de tous les emails (notifications + reset mdp)
├── .env             → credentials email (Gmail SMTP) — non versionné
└── media/           → fichiers uploadés — non versionné
    ├── logos/       → logos des companies
    └── banners/     → bannières des events
```

---

## 5. Modèles de données

### CustomUser (`users/models.py`)
Un seul modèle pour tous les types d'utilisateurs, différenciés par le champ `role`.

```
role           → PARTICIPANT | COMPANY | ADMIN
is_active      → bool (modération admin — False = compte suspendu ou supprimé)
is_staff       → bool (accès Django admin)
date_joined    → DateTimeField auto
tags           → ManyToMany → Tag

# Champs PARTICIPANT
email          → EmailField unique (login participant)
first_name     → CharField
last_name      → CharField
employer_name  → CharField (entreprise où il travaille)

# Champs COMPANY
company_identifier → CharField unique (login company — lettres, chiffres, tirets, min 3 car.)
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

# Vérification SIRENE
siret                  → CharField (14 chiffres, obligatoire à l'inscription)
legal_representative   → CharField (nom du représentant légal, obligatoire)
verification_status    → PENDING | VERIFIED | REJECTED | NEEDS_REVIEW (défaut: PENDING)
verification_source    → CharField ('AUTO' ou 'MANUAL', renseigné après vérification)
verification_document  → FileField (upload_to='verification_docs/', Kbis ou RNE)
review_note            → TextField (note admin lors de la révision manuelle)
verified_at            → DateTimeField (date de validation, null si pas encore vérifié)
```

**Important** : `USERNAME_FIELD = 'email'` mais les companies se connectent via
`company_identifier` avec un endpoint de login séparé.

**Validation company_identifier** : regex `^[a-zA-Z0-9-]+$`, min 3 caractères, max 50.
Ne jamais accepter d'espaces ou de caractères spéciaux.

**Suppression de compte (RGPD)** :
- On anonymise les données (email → `deleted_<id>@deleted.neurovent.com`, nom → `[Supprimé]`)
- On annule les inscriptions aux events **futurs** (CONFIRMED/PENDING → CANCELLED)
- On garde l'historique des events **passés** (anonymisé)
- `is_active = False`
- Différent de la **suspension admin** qui ne touche pas aux données (`is_active = False` seulement, réversible)

### Event (`events/models.py`)
```
company               → FK → CustomUser (role=COMPANY)
title                 → CharField
description           → TextField
banner                → ImageField (upload_to='banners/', optionnel)
date_start            → DateTimeField
date_end              → DateTimeField
capacity              → PositiveIntegerField
status                → DRAFT | PUBLISHED | CANCELLED
format                → ONSITE | ONLINE | HYBRID
registration_mode     → AUTO | VALIDATION
registration_deadline → DateTimeField (optionnel — date limite d'inscription)
tags                  → ManyToMany → Tag
created_at            → DateTimeField auto
updated_at            → DateTimeField auto

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

**Propriétés calculées (pas en base, calculées à la volée) :**
- `spots_remaining` = `capacity - inscriptions CONFIRMED`
- `registration_open` = `True` si event pas encore commencé ET deadline pas dépassée
- `is_full` = `True` si `spots_remaining <= 0`

**Logique visibilité** :
- `FULL` → toujours afficher l'info complète
- `PARTIAL` + pas de reveal_date → toujours afficher ville/pays ou nom plateforme seulement
- `PARTIAL` + reveal_date → afficher partiel jusqu'à la date, puis complet

**Logique registration_deadline** :
- Si définie et dépassée → inscription refusée (erreur 400)
- Si non définie → inscriptions ouvertes jusqu'au début de l'event (`date_start`)

### Registration (`registrations/models.py`)
```
participant          → FK → CustomUser (role=PARTICIPANT)
event                → FK → Event
status               → PENDING | CONFIRMED | REJECTED | CANCELLED | WAITLIST
accessibility_needs  → TextField (besoins d'accessibilité du participant, optionnel)
company_comment      → TextField (commentaire organisateur, optionnel)
created_at           → DateTimeField auto
updated_at           → DateTimeField auto
unique_together = ['participant', 'event']
```

**Propriété calculée :**
- `waitlist_position` = position dans la file d'attente (1 = premier). `None` si pas en WAITLIST.

**Logique registration_mode** :
- `AUTO` + places disponibles → statut = `CONFIRMED` immédiatement
- `AUTO` + event complet → statut = `WAITLIST` (pas d'erreur, liste d'attente)
- `VALIDATION` + places disponibles → statut = `PENDING`, company doit confirmer/rejeter
- `VALIDATION` + event complet → erreur 400 "Cet événement est complet"

**Logique liste d'attente (WAITLIST)** :
- Uniquement en mode `AUTO`
- Dès qu'une inscription passe de `CONFIRMED` à `CANCELLED` ou `REJECTED` → le premier `WAITLIST` (par `created_at`) est automatiquement promu à `CONFIRMED`
- Géré par la fonction `_promote_from_waitlist(event)` dans `registrations/views.py`

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
| POST | `/api/auth/register/company/` | Public | `company_identifier, password, password_confirm, company_name, recovery_email, siret, legal_representative` |
| POST | `/api/auth/login/participant/` | Public | `email, password` |
| POST | `/api/auth/login/company/` | Public | `identifier, password` |
| POST | `/api/auth/token/refresh/` | Public | `refresh` |
| POST | `/api/auth/logout/` | Connecté | `refresh` — blackliste le token |
| GET | `/api/auth/me/` | Connecté | — |
| PATCH | `/api/auth/me/` | Connecté | champs partiels (ex: `tag_ids: [1,2]`) |
| DELETE | `/api/auth/me/` | Connecté | — Suppression compte RGPD |
| GET | `/api/auth/admin/stats/` | Admin | — |
| GET | `/api/auth/admin/users/` | Admin | `?role=PARTICIPANT\|COMPANY\|ADMIN` — liste des utilisateurs |
| PATCH | `/api/auth/admin/users/<id>/suspend/` | Admin | — Suspend le compte |
| PATCH | `/api/auth/admin/users/<id>/activate/` | Admin | — Réactive le compte |
| DELETE | `/api/auth/admin/users/<id>/delete/` | Admin | — Suppression RGPD forcée (impossible sur un autre admin) |
| GET | `/api/auth/admin/companies/pending/` | Admin | `?status=PENDING\|NEEDS_REVIEW\|VERIFIED\|REJECTED` |
| PATCH | `/api/auth/admin/companies/<id>/verify/` | Admin | `{"verification_status": "VERIFIED\|REJECTED", "review_note": "..."}` |
| PATCH | `/api/auth/me/verification/document/` | Company | Upload Kbis/RNE — passe en NEEDS_REVIEW si PENDING/REJECTED |
| PATCH | `/api/auth/me/password/` | Connecté | `current_password, new_password, new_password_confirm` |
| POST | `/api/auth/password-reset/` | Public | `email` — envoie un lien signé par email |
| POST | `/api/auth/password-reset/confirm/` | Public | `uid, token, new_password, new_password_confirm` |

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
| GET | `/api/events/recommended/` | Participant | Events recommandés selon ses tags |

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

**Upload bannière event** : utiliser `multipart/form-data`
```bash
curl -X PATCH /api/events/1/update/ -H "Authorization: Bearer TOKEN" -F "banner=@image.png"
```

### Companies

| Méthode | URL | Accès | Notes |
|---------|-----|-------|-------|
| GET | `/api/companies/<id>/` | Public | Profil public + events publiés de la company |

### Inscriptions

| Méthode | URL | Accès | Body / Notes |
|---------|-----|-------|--------------|
| POST | `/api/registrations/` | Participant | `{"event": <id>}` — optionnel : `accessibility_needs` |
| GET | `/api/registrations/my/` | Participant | Ses inscriptions — `?status=CONFIRMED\|PENDING\|WAITLIST\|...` |
| PATCH | `/api/registrations/<id>/cancel/` | Participant | Annule → promeut le 1er WAITLIST |
| GET | `/api/registrations/event/<id>/` | Company | Inscrits d'un event |
| PATCH | `/api/registrations/<id>/status/` | Company / Admin | `{"status": "CONFIRMED\|REJECTED", "company_comment": "..."}` |
| GET | `/api/registrations/event/<id>/export/` | Company (owner) / Admin | Export CSV des inscrits |

### Tags

| Méthode | URL | Accès |
|---------|-----|-------|
| GET | `/api/tags/` | Public |
| POST | `/api/tags/create/` | Admin |
| DELETE | `/api/tags/<id>/delete/` | Admin |

### Documentation API

| URL | Description |
|-----|-------------|
| `/api/docs/` | Swagger UI interactif |
| `/api/redoc/` | ReDoc |
| `/api/schema/` | Schéma OpenAPI brut |

---

## 7. Permissions par rôle

| Action | Non connecté | Participant | Company | Admin |
|--------|-------------|-------------|---------|-------|
| Voir liste events | ✅ | ✅ | ✅ | ✅ |
| Voir détail event | ✅ | ✅ | ✅ | ✅ |
| Voir profil public company | ✅ | ✅ | ✅ | ✅ |
| S'inscrire / rejoindre waitlist | ❌ | ✅ | ❌ | ❌ |
| Voir recommandations | ❌ | ✅ | ❌ | ❌ |
| Supprimer son compte (RGPD) | ❌ | ✅ | ✅ | ❌ |
| Créer un event | ❌ | ❌ | ✅ | ❌ |
| Modifier/supprimer son event | ❌ | ❌ | ✅ (owner) | ✅ |
| Valider des inscriptions | ❌ | ❌ | ✅ (owner) | ✅ |
| Voir stats d'un event | ❌ | ❌ | ✅ (owner) | ✅ |
| Voir stats globales | ❌ | ❌ | ❌ | ✅ |
| Gérer les tags | ❌ | ❌ | ❌ | ✅ |
| Suspendre / réactiver un compte | ❌ | ❌ | ❌ | ✅ |

---

## 8. État d'avancement

### ✅ Backend Django (Thomas) — 100% TERMINÉ

**Core :**
- [x] Tous les modèles créés et migrés (CustomUser, Event, Registration, Tag)
- [x] 26+ endpoints fonctionnels
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

**Améliorations :**
- [x] Swagger / ReDoc (`/api/docs/`, `/api/redoc/`)
- [x] Optimisation N+1 (select_related + prefetch_related)
- [x] Validation company_identifier (regex + longueur)
- [x] Suppression compte RGPD (anonymisation + annulation events futurs)
- [x] Suspension / réactivation compte par admin
- [x] Liste & modération admin (`GET /api/auth/admin/users/` avec filtre `?role=`)
- [x] Suppression admin forcée (`DELETE /api/auth/admin/users/<id>/delete/`)
- [x] Logout avec blacklist JWT (`POST /api/auth/logout/`)
- [x] Recommandations personnalisées (`GET /api/events/recommended/`) — participants uniquement
- [x] Filtre `?status=` sur `GET /api/events/` — admin uniquement
- [x] Date limite d'inscription (`registration_deadline`)
- [x] Bannière event (ImageField → `media/banners/`)
- [x] Liste d'attente automatique (WAITLIST + promotion auto)
- [x] Champs `accessibility_needs` et `company_comment` sur Registration
- [x] Export CSV des inscrits par event (`GET /api/registrations/event/<id>/export/`)
- [x] Suppression tag admin (`DELETE /api/tags/<id>/delete/`)
- [x] Réinitialisation mot de passe par email (`POST /api/auth/password-reset/`)
- [x] Changement mot de passe connecté (`PATCH /api/auth/me/password/`)
- [x] Notifications email automatiques (CONFIRMED, REJECTED, WAITLIST promu, event annulé)
- [x] Filtre sur mes inscriptions (`?status=CONFIRMED|PENDING|...`)
- [x] `emails.py` centralisé — architecture prête pour le HTML
- [x] Gmail SMTP configuré via `python-decouple` + `.env`
- [x] `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` passent par `.env` (prêt pour le déploiement)
- [x] Vérification entreprise SIRENE (SIRET obligatoire + API INSEE auto + fallback Kbis)
- [x] Restriction création d'events aux companies `VERIFIED` uniquement
- [x] Endpoints admin vérification (`GET /admin/companies/pending/`, `PATCH /admin/companies/<id>/verify/`)
- [x] Upload justificatif Kbis/RNE (`PATCH /api/auth/me/verification/document/`)
- [x] Notifications email vérification (VERIFIED / NEEDS_REVIEW / REJECTED)

**Tests :**
- [x] 96 tests Django (users: 28+, events: 28, registrations: 28+1, tags: 10)
- [x] Tous les fichiers `tests.py` des 4 apps remplis

**Bugs corrigés :**
- [x] `RecommendedEventsView` : permission `IsParticipant` (était `IsAuthenticated` → companies pouvaient accéder)
- [x] `RegistrationSerializer` : validation doublon inscription avant DB (évite IntegrityError → 400 propre)
- [x] `UpdateRegistrationStatusView` : permission `IsCompanyOrAdmin` + queryset adaptatif (admin voit tout)
- [x] `EventRegistrationsView` : `get_object_or_404` (évite crash 500 si event_id inexistant)
- [x] `ExportEventRegistrationsView` : retourne 404 (plus 400) pour event introuvable
- [x] Réinscription après annulation : réactive l'inscription existante au lieu de créer un doublon (évite IntegrityError 500)

### 🔲 Frontend (Noureddine) — En cours
- [ ] Pages Login/Register (participant + company)
- [ ] Page liste des events (avec filtres)
- [ ] Page détail event + bouton inscription / liste d'attente
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

4. **registration_mode AUTO** → statut CONFIRMED immédiat ou WAITLIST si complet.
   **registration_mode VALIDATION** → statut PENDING, la company confirme/rejette. Pas de waitlist.

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

10. **WAITLIST uniquement en mode AUTO** : en mode VALIDATION, si l'event est complet, on retourne
    une erreur. La liste d'attente n'a de sens qu'avec une confirmation automatique.

11. **Suppression compte ≠ Suspension admin** :
    - Suppression (par l'user) = anonymisation données + `is_active = False` (irréversible)
    - Suspension (par admin) = `is_active = False` seulement, données intactes (réversible)

12. **Bannières dans `media/banners/`**, logos dans `media/logos/`** : séparation claire des uploads.
    Les deux utilisent Pillow et `multipart/form-data` (jamais JSON pour les fichiers).

13. **`registration_open` calculé côté backend** : Person B ne doit pas recalculer la logique
    date limite / date début. Il lit juste `registration_open: true/false` et affiche en conséquence.

14. **`is_full` dans le serializer liste** : permet à Person B d'afficher le bouton
    "Rejoindre la liste d'attente" au lieu du bouton "S'inscrire" quand l'event est complet.

15. **`emails.py` centralisé** : toutes les fonctions d'envoi d'email sont dans un seul fichier
    à la racine du backend. Les vues importent la fonction dont elles ont besoin, sans logique
    d'email en dur. Architecture `EmailMultiAlternatives` prête pour le HTML.

16. **Reset mot de passe par email** : utilise `default_token_generator` de Django (token signé
    avec le hash du mot de passe actuel). Token invalide après usage et expire en 24h.
    Fonctionne pour participants (email login) et companies (recovery_email).
    Retourne toujours 200 même si l'email n'existe pas (anti-énumération).

17. **Gmail SMTP via python-decouple** : credentials dans `.env` (jamais commité).
    En dev : `neurovent.noreply@gmail.com` avec mot de passe d'application Google.
    Pour passer en prod : changer `EMAIL_HOST` dans `.env`, aucune modification du code.

18. **`SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` via python-decouple** : ces 3 variables ont des
    valeurs fallback en dev. En production, les renseigner dans le dashboard Railway/Render :
    - `SECRET_KEY=<clé générée par get_random_secret_key()>`
    - `DEBUG=False`
    - `ALLOWED_HOSTS=ton-domaine.up.railway.app,localhost`

19. **`IsCompanyOrAdmin`** : permission custom dans `registrations/views.py` qui accepte à la fois
    les companies ET les admins. Utilisée sur `UpdateRegistrationStatusView`. Le `get_queryset()`
    est adaptatif : admin voit toutes les inscriptions, company uniquement celles de ses events.

20. **`get_object_or_404`** : toujours utiliser `get_object_or_404()` plutôt que `.get()` dans les
    vues qui reçoivent un ID en paramètre d'URL. `.get()` lève `DoesNotExist` (non catchée par DRF
    → 500 en prod). `get_object_or_404()` lève `Http404` (catchée → 404 propre).

---

## 11. Pièges connus

- **Token JWT expiré** : les access tokens durent 2h. Si erreur `token_not_valid`, refaire `/login/`.
- **CORS** : si le front ne reçoit rien, vérifier que l'URL React est dans `CORS_ALLOWED_ORIGINS` dans `settings.py`.
- **ManyToMany** : toujours utiliser `instance.tags.set(tags)` dans `update()`, jamais `setattr()`.
- **company_identifier** : regex `^[a-zA-Z0-9-]+$`, min 3 caractères. Un espace ou caractère spécial → erreur 400.
- **Migration conflit** : si erreur `InconsistentMigrationHistory`, supprimer `db.sqlite3` et relancer `migrate`.
- **Upload image** : utiliser `multipart/form-data` (pas `application/json`) pour les requêtes avec fichiers. Avec curl : `-F "banner=@fichier.png"` sans header `Content-Type`.
- **Filtre format** : `?format=` est réservé par DRF (content negotiation). On a configuré `URL_FORMAT_OVERRIDE = 'response_format'` dans settings.py pour lever ce conflit. Ne pas supprimer ce paramètre.
- **Pagination** : la réponse de `GET /api/events/` est enveloppée. Person B doit lire `response.results` et pas directement `response`.
- **WAITLIST seulement en AUTO** : en mode VALIDATION + event complet → erreur 400, pas de waitlist.
- **Promotion waitlist** : la fonction `_promote_from_waitlist(event)` est appelée après chaque `CANCELLED` ou `REJECTED`. Si on ajoute un nouveau cas de libération de place, penser à l'appeler.
- **Suppression RGPD** : l'email est remplacé par `deleted_<id>@deleted.neurovent.com` pour garantir l'unicité (contrainte `unique=True` sur le champ email). Ne pas mettre `null`.
- **`registration_open` vs `is_full`** : ce sont deux choses différentes. Un event peut être ouvert aux inscriptions (`registration_open: true`) ET complet (`is_full: true`) → dans ce cas, le participant rejoint la waitlist.
- **Emails non envoyés silencieusement** : `_send()` dans `emails.py` utilise un `try/except` (équivalent `fail_silently=True`). Si l'email échoue, l'opération principale (inscription, annulation...) réussit quand même.
- **Comptes RGPD exclus des emails** : `_is_valid_recipient()` vérifie que l'email ne contient pas `deleted.neurovent.com` avant tout envoi.
- **App password Google** : le mot de passe SMTP Gmail doit être un mot de passe d'application (16 caractères), **sans espaces** dans le `.env`. La validation en 2 étapes doit être activée sur le compte Gmail.
- **`from_waitlist=True`** : passer ce paramètre à `send_registration_confirmed()` quand la confirmation vient d'une promotion depuis la waitlist — le texte de l'email est différent.
- **`GET /api/events/<id>/` retourne 404 pour un DRAFT** : `EventDetailView` filtre sur `status=PUBLISHED`. Une company qui veut voir le détail de son brouillon doit passer par `GET /api/events/my-events/`. Noureddine ne doit pas s'attendre à avoir le détail d'un DRAFT via l'endpoint public.
- **Doublon inscription** : tenter de s'inscrire deux fois au même event retourne une erreur 400 propre (validation dans `RegistrationSerializer.validate()`). Ne pas confondre avec l'ancienne IntegrityError qui causait un crash.
- **`SECRET_KEY` en dev** : la clé par défaut contient le préfixe `django-insecure-` — Django lui-même prévient que c'est insecure. En prod, toujours générer une vraie clé avec `get_random_secret_key()`.
- **Réinscription après annulation** : ne pas utiliser `serializer.save()` directement — `perform_create` détecte d'abord une inscription CANCELLED/REJECTED existante et la réactive. `serializer.instance` est mis à jour manuellement pour que la réponse 201 soit correcte.
- **SIRENE API en tests** : l'API INSEE est inaccessible en environnement de test (réseau coupé). Le statut résultant est `NEEDS_REVIEW`. Les `create_company()` dans les tests utilisent `verification_status='VERIFIED'` directement en base pour contourner ça.
- **Company non vérifiée → 403 sur création d'event** : `EventCreateView.perform_create()` vérifie `verification_status == VERIFIED`. Une company PENDING ou NEEDS_REVIEW reçoit un 403 avec un message explicite.
- **SIRET format** : 14 chiffres exacts, espaces et tirets acceptés à la saisie (nettoyés par `_clean_siret()`). Un SIRET de 9 chiffres (SIREN seul) est refusé.
- **Emails vérification** : envoyés à `recovery_email` (seul email d'une company). Si `recovery_email` est vide → email silencieusement ignoré.

# CLAUDE.md — Contexte actuel de Neurovent

Ce fichier sert de contexte de travail pour un assistant IA qui intervient sur ce depot.

## 1. Ce qu'est Neurovent

Neurovent est une plateforme web d'evenements scientifiques et tech.

Aujourd'hui, le produit ne se limite plus a "creer / rejoindre un event". Il inclut aussi :
- recherche avancee events + organizations
- profils publics et prives
- dashboards organization
- moderation admin complete
- verification organization
- experience detaillee autour du cycle de vie des registrations

Le ton general du produit est :
- dark UI
- assez premium
- tres centre sur desktop
- avec des versions mobile qu'on commence a verifier

## 2. Architecture generale

```text
Projet/
├── backend-django/
├── frontend-react/
├── backend-node/
├── docs/
├── README.md
└── CLAUDE.md
```

### Backend principal
- dossier : `backend-django/`
- stack : Django + DRF + JWT
- base locale : SQLite

### Frontend
- dossier : `frontend-react/`
- stack : React + React Router + CSS natif
- build : `react-scripts`

## 3. Roles reels dans le produit

Ne jamais reutiliser les anciens noms "researcher" ou "lab" dans l'UI.

Les seuls noms fonctionnels valides sont :
- `Participant`
- `Organization`
- `Admin`

### Participant
- recherche, detail event, inscription
- dashboard personnel
- profil public / edit profile
- badges et metas de profil

### Organization
- `Search`
- `My Events`
- `Dashboard`
- creation / edition / detail owner d'event
- moderation des registrations
- stats globales et exports
- profil public / edit profile

### Admin
- navigation header :
  - `Participants`
  - `Organizations`
  - `Events`
  - `Statistics`
- pas de page profil admin
- pas de `View Profile` dans le menu admin
- moderation globale depuis le frontend et le backend

## 4. Pages importantes du frontend

### Search
- route : `/events`
- grande page de recherche
- pas de scroll global
- suggestions de topics avec `#`
- `Popular picks from the community`

### Search results
- route : `/events/results`
- liste d'events + cartes organizations
- scroll interne seulement
- recherche a valider avec `Enter`
- suppression de topic appliquee immediatement

### Event detail
- route : `/events/:id`
- comportement different selon le role :
  - public / participant
  - owner organization
  - admin
- si owner organization :
  - panel registrations
  - scroll interne uniquement sur la liste
- si admin :
  - retour vers `/admin/events`
  - charge l'event via l'endpoint admin

### Organization area
- `/dashboard`
- `/my-events`
- `/events/create`
- `/events/:id/edit`

### Profile area
- `/profile`
- `/profile/edit`
- pour admin, ces routes doivent rediriger vers l'espace admin

### Admin area
- `/admin/participants`
- `/admin/participants/:id`
- `/admin/companies`
- `/admin/events`
- `/admin/statistics`

## 5. Composants et conventions frontend

### Navigation
- `AppTopLinks.jsx` gere l'onglet actif selon le role et le contexte
- `NavUserMenu.jsx` gere le menu profil / logout

### Routes protegees
- `ProtectedRoute`
- `CompanyRoute`
- `AdminRoute`

### Styles
- une grosse partie de l'app repose sur :
  - `Events.css`
  - `Dashboard.css`
  - `Profile.css`
  - `CreateEvent.css`
  - `EventDetail.css`
  - `Admin.css`

### Attention aux comportements UI deja voulus
- beaucoup de pages sont en viewport fixe avec scroll interne
- ne pas reintroduire de scroll global involontaire
- certains boutons ont des micro-animations demandees explicitement
- les warnings "unsaved changes" existent deja sur :
  - create event
  - edit event
  - profile edit

## 6. Modele metier backend a connaitre

### CustomUser
- role : `PARTICIPANT`, `COMPANY`, `ADMIN`
- `ADMIN` sert a la fois pour Django admin et pour l'espace admin front

#### Participant profile
- `participant_profile_type`
- `school_name`
- `study_level`
- `professional_company_name`
- `job_title`
- `job_started_at`
- `participant_avatar_url`
- `participant_bio`
- `favorite_domain`
- liens perso

#### Organization profile
- `company_identifier`
- `recovery_email`
- `company_logo` / `company_logo_url`
- `company_description`
- liens sociaux
- `siret`
- `legal_representative`
- `verification_status`
- `review_note`

### Event
- `status` : `DRAFT`, `PUBLISHED`, `CANCELLED`
- `format` : `ONSITE`, `ONLINE`, `HYBRID`
- `registration_mode` : `AUTO`, `VALIDATION`
- `registration_deadline`
- `allow_registration_during_event`
- `capacity`
- `unlimited_capacity`
- `view_count`

#### Visibilite d'information
- adresse :
  - `address_visibility`
  - `address_reveal_date`
- lien online :
  - `online_visibility`
  - `online_reveal_date`

#### Champs de suivi email
- `reminder_7d_sent_at`
- `reminder_1d_sent_at`
- `reminder_3h_sent_at`
- `address_reveal_email_sent_at`
- `online_reveal_email_sent_at`
- `almost_full_notified_at`
- `full_notified_at`
- `organizer_digest_sent_at`

Important :
- si un champ de ce type "n'existe pas" en base locale, penser d'abord a `python manage.py migrate`

### Registration
- `PENDING`
- `CONFIRMED`
- `REJECTED`
- `CANCELLED`
- `WAITLIST`

Le backend gere :
- auto-confirm
- manual review
- promotion waitlist
- suppression par owner avec email

## 7. Recherche actuelle

### Cote public
- recherche events par texte
- recherche organizations
- recherche topics avec `#`
- recherche partielle et flexible

### Cote admin
- recherche participants sur plusieurs champs de profil
- recherche organizations sur plusieurs champs de profil
- recherche events par titre / organization

Les listes admin ont ete simplifiees :
- plus de pagination visible
- retour d'un objet `{ count, results }`

## 8. Admin : etat reel

### Participants
- liste clickable
- detail participant
- suspend / reactivate / delete
- recherche avec `match_reasons`

### Organizations
- pending a gauche
- verified a droite
- detail organization admin reutilisant la vue profile organization
- verification / rejection
- delete organization

### Events
- liste admin events
- filtres status / format
- switch future / past
- click vers detail event
- suppression avec confirmation

### Statistics
- statistiques globales plateforme

## 9. Commandes usuelles

### Backend
```bash
cd backend-django
source .venv/bin/activate
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend-react
npm start
```

### Tests backend importants
```bash
cd backend-django
source .venv/bin/activate
python manage.py test users events
```

### Build frontend
```bash
cd frontend-react
npm run build
```

### Seed demo
```bash
cd backend-django
source .venv/bin/activate
python scripts/reset_and_seed_demo.py
```

## 10. Comptes de demo connus

- participant :
  - `amelie.rousseau@participants.neurovent.demo`
  - `Participant2026!`
- organization :
  - `atlas-neuro-labs`
  - `Company2026!`
- admin :
  - `admin@neurovent.demo`
  - `Admin2026!`

## 11. Regles de prudence sur ce depot

- ne pas casser les layouts a scroll interne
- ne pas reintroduire d'anciens labels de role
- verifier les pages admin apres toute modif de role, profile ou event detail
- apres une modif backend touchant `Event` ou `CustomUser`, penser migrations + tests
- apres une modif frontend importante, faire au minimum `npm run build`

## 12. Etat documentaire

Ce fichier doit rester aligne avec :
- `README.md` a la racine
- `backend-django/README.md`

Si une feature importante change, mettre a jour ces trois fichiers ensemble.

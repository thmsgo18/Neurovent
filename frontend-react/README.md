# Frontend React — Neurovent

SPA React pour la plateforme Neurovent.

M1 IAD-VMI — Programmation Web 2025-2026 — Noureddine

## Stack

- React 18 (Create React App)
- React Router DOM v6
- CSS natif
- lucide-react, react-icons
- JWT (localStorage)

## Installation

```bash
cd frontend-react
npm install
npm start
```

App disponible sur http://localhost:3000

Prerequis : Node.js v18+, npm v9+

### Variable d'environnement

Creer un fichier `.env` a la racine de `frontend-react/` :

```env
REACT_APP_API_BASE=http://localhost:8000
```

## Structure du projet

```
frontend-react/src/
├── api/
│   ├── client.js          → apiFetch() central (token + gestion erreurs)
│   ├── auth.js            → login / register / profil / reset password
│   ├── events.js          → CRUD events + recherche + stats + exports
│   ├── registrations.js   → creation / annulation / gestion registrations
│   ├── companies.js       → profils organization publics
│   ├── admin.js           → endpoints admin (users, companies, stats)
│   └── tags.js            → liste des topics
├── components/
│   ├── ProtectedRoute.jsx → protection par token JWT
│   ├── AdminRoute.jsx     → protection par role ADMIN
│   ├── CompanyRoute.jsx   → protection par role COMPANY
│   ├── PageShell.jsx      → layout principal (nav + contenu)
│   ├── AppHeader.jsx      → header avec menu utilisateur
│   ├── AppTopLinks.jsx    → liens de navigation du haut
│   ├── NavUserMenu.jsx    → menu dropdown utilisateur
│   ├── AuthPageShell.jsx  → layout pages auth (login, register)
│   ├── SearchTopicInput.jsx → barre de recherche avec suggestions topics
│   └── DateInput.jsx      → composant input date
├── pages/
│   ├── Home.jsx                   → page d'accueil publique
│   ├── Login.jsx                  → connexion participant ou organization
│   ├── Register.jsx               → inscription participant ou organization
│   ├── ForgotPassword.jsx         → demande de reset mot de passe
│   ├── ResetPasswordConfirm.jsx   → confirmation reset (lien email)
│   ├── Events.jsx                 → recherche publique d'events
│   ├── EventsResults.jsx          → resultats de recherche
│   ├── EventDetail.jsx            → detail d'un event + inscription
│   ├── Dashboard.jsx              → tableau de bord organization
│   ├── MyEvents.jsx               → events de l'organization connectee
│   ├── CreateEvent.jsx            → creation d'event (COMPANY)
│   ├── EditEvent.jsx              → edition d'event (COMPANY)
│   ├── Profile.jsx                → profil de l'utilisateur connecte
│   ├── ProfileOverview.jsx        → vue profil public
│   ├── ParticipantProfile.jsx     → profil public d'un participant
│   ├── CompanyProfile.jsx         → profil public d'une organization
│   ├── AdminParticipants.jsx      → gestion participants (ADMIN)
│   ├── AdminParticipantProfile.jsx→ detail participant (ADMIN)
│   ├── AdminCompanies.jsx         → gestion organizations (ADMIN)
│   ├── AdminEvents.jsx            → gestion events (ADMIN)
│   └── AdminStatistics.jsx        → statistiques globales (ADMIN)
├── store/
│   └── authStore.js       → token JWT + role (localStorage)
├── context/
│   └── PreferencesContext.jsx → preferences utilisateur (langue, etc.)
├── i18n/
│   └── translations.js    → traductions FR/EN
├── utils/
│   └── topicSearch.js     → utilitaire recherche de topics
├── App.js                 → definition des routes
└── index.js               → point d'entree
```

## Authentification

Le token JWT est stocke dans le `localStorage` apres connexion.

| Cle localStorage | Valeur |
|-----------------|--------|
| `access_token` | Token JWT (envoye a chaque requete API) |
| `refresh_token` | Token long (renouvellement automatique) |
| `role` | `PARTICIPANT`, `COMPANY` ou `ADMIN` |

### Fonctions — `src/store/authStore.js`

| Fonction | Description |
|----------|-------------|
| `getToken()` | Recupere le access token |
| `setToken(token)` | Sauvegarde le access token |
| `getRefreshToken()` | Recupere le refresh token |
| `setRefreshToken(token)` | Sauvegarde le refresh token |
| `getRole()` | Recupere le role |
| `setRole(role)` | Sauvegarde le role |
| `isAuthed()` | `true` si connecte |
| `isAdmin()` | `true` si role `ADMIN` |
| `logout()` | Efface tout (token + role) |

## Routing

| URL | Acces | Page |
|-----|-------|------|
| `/` | Public | Home |
| `/login` | Public | Login |
| `/register` | Public | Register |
| `/forgot-password` | Public | ForgotPassword |
| `/reset-password/:uid/:token` | Public | ResetPasswordConfirm |
| `/events` | Public | Events (recherche) |
| `/events/results` | Public | EventsResults |
| `/events/:id` | Public | EventDetail |
| `/companies/:id` | Public | CompanyProfile |
| `/participants/:id` | Connecte | ParticipantProfile |
| `/dashboard` | COMPANY | Dashboard |
| `/my-events` | COMPANY | MyEvents |
| `/events/create` | COMPANY | CreateEvent |
| `/events/:id/edit` | COMPANY | EditEvent |
| `/profile` | Connecte | Profile |
| `/admin/participants` | ADMIN | AdminParticipants |
| `/admin/participants/:id` | ADMIN | AdminParticipantProfile |
| `/admin/companies` | ADMIN | AdminCompanies |
| `/admin/events` | ADMIN | AdminEvents |
| `/admin/statistics` | ADMIN | AdminStatistics |

## Client HTTP — `src/api/client.js`

Toutes les requetes passent par `apiFetch(path, options)`.

- Ajoute automatiquement `Authorization: Bearer <token>` si connecte
- Gere les formats d'erreur DRF : `{ detail }`, `{ field: ["msg"] }`, tableaux
- Base URL configurable via `REACT_APP_API_BASE` (defaut : `http://localhost:8000`)

```javascript
import { apiFetch } from "../api/client";

// Requete authentifiee (defaut)
const data = await apiFetch("/api/events/");

// Requete publique (sans token)
const data = await apiFetch("/api/events/", { auth: false });

// Requete POST
const data = await apiFetch("/api/registrations/create/", {
  method: "POST",
  body: { event: 42 },
});
```

## Ce que le frontend attend du backend (Thomas)

### Format de reponse login

```json
POST /api/auth/login/participant/
→ { "access": "eyJ...", "refresh": "eyJ...", "role": "PARTICIPANT" }

POST /api/auth/login/company/
→ { "access": "eyJ...", "refresh": "eyJ...", "role": "COMPANY" }
```

Le payload JWT doit contenir `role` pour que le frontend puisse gerer les routes protegees.

### Format des erreurs

```json
{ "detail": "message" }
```

ou pour les erreurs de validation :

```json
{ "field_name": ["message d'erreur"] }
```

### CORS

Le backend doit accepter les requetes depuis `http://localhost:3000`.

### Endpoints utilises

Tous les endpoints consommes sont documentes dans le README du backend Django. Les fichiers `src/api/*.js` contiennent l'implementation cote frontend.

## Mode Mock

Un mode mock est disponible dans chaque fichier `src/api/*.js` pour travailler sans backend.

```javascript
const USE_MOCK = true;  // activer le mock
const USE_MOCK = false; // utiliser le vrai backend (defaut actuel)
```

Credentials mock :

| Identifiant | Mot de passe | Role |
|------------|--------------|------|
| `participant@test.com` | `participant123` | PARTICIPANT |
| `company-test` | `company123` | COMPANY |

## Problemes frequents

| Erreur | Solution |
|--------|----------|
| `Module not found: lucide-react` | `npm install lucide-react` |
| `Module not found: react-icons` | `npm install react-icons` |
| Erreur CORS | Verifier que Django tourne sur le port 8000 |
| Page blanche | Ouvrir la console F12 pour voir l'erreur JS |
| Port 3000 occupe | `PORT=3001 npm start` |

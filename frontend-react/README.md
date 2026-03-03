# 🧠 Neurovent-Web — Frontend React

> Plateforme de gestion d'événements scientifiques (conférences, workshops)
> M1 IAD-VMI — Web Programming 2026 — Student B : Noureddine

---

## 📋 Table des matières
1. [Stack technique](#stack-technique)
2. [Lancer le projet](#lancer-le-projet)
3. [Structure du projet](#structure-du-projet)
4. [Authentification & Rôles](#authentification--rôles)
5. [Routing & Protection des routes](#routing--protection-des-routes)
6. [Mode Mock](#mode-mock-développement-sans-backend)
7. [Intégration Backend Django](#intégration-backend-django)

---

## Stack technique
- **React** (Create React App)
- **React Router DOM v6** — navigation SPA
- **JWT** — authentification par token
- **lucide-react** — icônes
- **Django REST API** — backend principal (Student A — Thomas)

---

## 🚀 Lancer le projet

### Prérequis
- **Node.js** v18+ → [télécharger](https://nodejs.org)
- **npm** v9+

Vérification rapide :
```bash
node --version
npm --version
```

### Installation
```bash
# 1. Aller dans le dossier frontend
cd frontend-react

# 2. Installer toutes les dépendances
npm install

# 3. Vérifier que react-router-dom est bien installé
npm install react-router-dom

# 4. Installer les librairies d'icônes
npm install lucide-react
npm install react-icons

# 5. Créer le fichier d'environnement
echo "REACT_APP_API_BASE=http://localhost:8000" > .env

# 6. Lancer en développement
npm start
```

> App disponible sur **http://localhost:3000**

### En cas de problème

| Erreur                              | Solution                              |
|-------------------------------------|---------------------------------------|
| `npm not found`                     | Installer Node.js depuis nodejs.org   |
| `Module not found: lucide-react`    | `npm install lucide-react`            |
| `Module not found: react-icons`     | `npm install react-icons`             |
| `Module not found: react-router-dom`| `npm install react-router-dom`        |
| Port 3000 occupé                    | `PORT=3001 npm start`                 |
| Page blanche                        | Vérifier la console F12 pour l'erreur |
| Erreur CORS                         | Vérifier que Django tourne sur 8000   |

### Dépendances installées

| Package            | Version | Usage                                              |
|--------------------|---------|--------------------------------------------------- |
| `react`            | 18+     | Framework UI                                       |
| `react-router-dom` | v6      | Navigation SPA — routing + protection des routes   |
| `lucide-react`     | latest  | Icônes (sidebar, boutons, pages...)                |
| `react-icons`      | latest  | Icônes supplémentaires                             |

---

## Structure du projet
```
frontend-react/
├── public/
└── src/
    ├── api/
    │   ├── client.js          → fonction apiFetch() centrale (token + erreurs)
    │   ├── auth.js            → login / register / forgot-password (mock + real)
    │   ├── events.js          → CRUD événements (mock + real)
    │   └── participants.js    → CRUD participants + inscriptions (mock + real)
    ├── components/
    │   ├── Layout.jsx         → sidebar + header + Outlet
    │   ├── ProtectedRoute.jsx → protection par token JWT
    │   └── AdminRoute.jsx     → protection par rôle admin
    ├── pages/
    │   ├── Login.jsx          → page de connexion
    │   ├── Register.jsx       → création de compte viewer (mock → Thomas)
    │   ├── ForgotPassword.jsx → mot de passe oublié (mock → Thomas)
    │   ├── Dashboard.jsx      → tableau de bord (stats, graphiques, activité récente)
    │   ├── Events.jsx         → liste + filtres + CRUD événements
    │   ├── EventDetail.jsx    → détail événement + gestion participants inscrits
    │   └── Participants.jsx   → liste + CRUD participants
    ├── store/
    │   └── authStore.js       → gestion token JWT + rôles (localStorage)
    ├── styles/
    │   ├── Login.css          → styles page login / register / forgot-password
    │   ├── Layout.css         → styles sidebar + header
    │   ├── Dashboard.css      → styles dashboard
    │   ├── Events.css         → styles page events
    │   ├── EventDetail.css    → styles page event detail
    │   └── Participants.css   → styles page participants
    ├── App.js                 → définition des routes
    └── index.js               → point d'entrée
```

---

## Authentification & Rôles

Le token JWT est stocké dans le `localStorage` après connexion.

| Clé localStorage  | Valeur                                          |
|-------------------|-------------------------------------------------|
| `access_token`    | Token JWT court (envoyé à chaque requête API)   |
| `refresh_token`   | Token JWT long (renouvellement automatique)     |
| `role`            | `admin` ou `viewer`                             |

### Fonctions disponibles — `src/store/authStore.js`

| Fonction               | Description                      |
|------------------------|----------------------------------|
| `getToken()`           | Récupère le access token         |
| `setToken(token)`      | Sauvegarde le access token       |
| `getRefreshToken()`    | Récupère le refresh token        |
| `setRefreshToken(token)` | Sauvegarde le refresh token    |
| `getRole()`            | Récupère le rôle                 |
| `setRole(role)`        | Sauvegarde le rôle               |
| `isAuthed()`           | `true` si connecté               |
| `isAdmin()`            | `true` si rôle admin             |
| `logout()`             | Efface tout (token + rôle)       |

### Différences admin vs viewer

| Fonctionnalité              | Admin | Viewer |
|-----------------------------|-------|--------|
| Voir les événements         | ✅    | ✅     |
| Voir le dashboard           | ✅    | ✅     |
| Voir les participants       | ✅    | ✅     |
| Créer un événement          | ✅    | ❌     |
| Modifier un événement       | ✅    | ❌     |
| Supprimer un événement      | ✅    | ❌     |
| Créer un participant        | ✅    | ❌     |
| Modifier un participant     | ✅    | ❌     |
| Supprimer un participant    | ✅    | ❌     |
| Inscrire un participant     | ✅    | ❌     |
| Désinscrire un participant  | ✅    | ❌     |

---

## Routing & Protection des routes

### Routes disponibles

| URL               | Accès     | Composant        | Description                        |
|-------------------|-----------|------------------|------------------------------------|
| `/login`          | Public    | Login.jsx        | Page de connexion                  |
| `/register`       | Public    | Register.jsx     | Créer un compte viewer             |
| `/forgot-password`| Public    | ForgotPassword.jsx | Réinitialisation mot de passe    |
| `/dashboard`      | Connecté  | Dashboard.jsx    | Vue résumée                        |
| `/events`         | Connecté  | Events.jsx       | Liste + filtres + CRUD             |
| `/events/:id`     | Connecté  | EventDetail.jsx  | Détail + participants inscrits     |
| `/participants`   | Connecté  | Participants.jsx | Gestion participants               |

### Comment ça marche ?

- **ProtectedRoute** : vérifie si un token existe dans le localStorage
  - Token présent → page affichée
  - Token absent → redirection automatique vers `/login`
- **AdminRoute** : vérifie token ET rôle admin
  - Rôle `viewer` → redirigé vers `/dashboard`
- **Layout** : composant parent qui contient la sidebar + header
  - Toutes les pages protégées s'affichent dans son `<Outlet />`

### Tester manuellement (console F12)
```javascript
// Simuler une connexion admin
localStorage.setItem("access_token", "test123")
localStorage.setItem("role", "admin")

// Simuler une déconnexion
localStorage.clear()
```

---

## Mode Mock (développement sans backend)

Le frontend fonctionne **sans backend** grâce aux données mock.

### Activer / Désactiver le mock

Dans chaque fichier `src/api/` :
```javascript
export const USE_MOCK = true;  // true = mock | false = vrai backend Django
```

### Credentials de test

| Username  | Password    | Rôle   | Accès         |
|-----------|-------------|--------|---------------|
| `admin`   | `admin123`  | admin  | CRUD complet  |
| `viewer`  | `viewer123` | viewer | Lecture seule |

### Données mock disponibles
- **3 événements** : Workshop ML, Conférence Federated Learning, Séminaire Multi-Agent Systems
- **3 participants** : Alice Martin, Bob Dupont, Clara Bernard
- **2 inscriptions** pré-existantes (Alice → ML, Bob → ML)

### Passer au vrai backend (quand Thomas est prêt)
```bash
# Dans src/api/auth.js
export const USE_MOCK = false;

# Dans src/api/events.js
export const USE_MOCK = false;

# Dans src/api/participants.js
export const USE_MOCK = false;
```

---

## Intégration Backend Django

### Variables d'environnement

Créer un fichier `.env` à la racine de `frontend-react/` :
```
REACT_APP_API_BASE=http://localhost:8000
```

### Configuration requise côté Django (Thomas)

#### 1. Port
```bash
python manage.py runserver 8000
```

#### 2. CORS
Vérifier dans `settings.py` :
```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # doit être EN PREMIER
    ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
```

#### 3. Format de réponse du login
```json
POST /api/token/
→ {
    "access": "eyJ...",
    "refresh": "eyJ...",
    "role": "admin"
  }
```

> ⚠️ Le champ `role` doit être ajouté manuellement au serializer JWT de Thomas.

### Endpoints attendus par le Frontend

#### Authentification

| Méthode | URL                          | Description                    |
|---------|------------------------------|--------------------------------|
| POST    | `/api/token/`                | Login → access + refresh + role|
| POST    | `/api/token/refresh/`        | Renouveler le access token     |
| POST    | `/api/auth/register/`        | Créer un compte viewer         |
| POST    | `/api/auth/forgot-password/` | Envoyer email reset password   |

#### Événements

| Méthode | URL                  | Description             |
|---------|----------------------|-------------------------|
| GET     | `/api/events/`       | Liste (supporte `?status=` et `?date=`) |
| POST    | `/api/events/`       | Créer (admin)           |
| GET     | `/api/events/:id/`   | Détail                  |
| PUT     | `/api/events/:id/`   | Modifier (admin)        |
| DELETE  | `/api/events/:id/`   | Supprimer (admin)       |

#### Participants

| Méthode | URL                        | Description        |
|---------|----------------------------|--------------------|
| GET     | `/api/participants/`       | Liste              |
| POST    | `/api/participants/`       | Créer (admin)      |
| PUT     | `/api/participants/:id/`   | Modifier (admin)   |
| DELETE  | `/api/participants/:id/`   | Supprimer (admin)  |

#### Inscriptions

| Méthode | URL                              | Description                   |
|---------|----------------------------------|-------------------------------|
| GET     | `/api/registrations/?event=:id`  | Participants d'un événement   |
| POST    | `/api/registrations/`            | Inscrire un participant        |
| DELETE  | `/api/registrations/:id/`        | Désinscrire                   |

### Headers envoyés automatiquement par le Frontend
```
Content-Type:  application/json
Authorization: Bearer <access_token>
```

### Format des erreurs attendu
```json
{ "detail": "message d'erreur" }
```
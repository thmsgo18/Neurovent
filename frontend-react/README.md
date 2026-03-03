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
- **Django REST API** — backend principal

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

# 2. Installer toutes les dépendances (react-router-dom inclus dans package.json)
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

| Erreur                               | Solution                                    |
|--------------------------------------|---------------------------------------------|
| `npm not found`                      | Installer Node.js depuis nodejs.org         |
| `Module not found: lucide-react`     | `npm install lucide-react`                  |
| `Module not found: react-icons`      | `npm install react-icons`                   |
| `Module not found: react-router-dom` | `npm install react-router-dom`              |
| Port 3000 occupé                     | `PORT=3001 npm start`                       |
| Page blanche                         | Vérifier la console F12 pour l'erreur       |
| Erreur CORS                          | Vérifier que Django tourne sur le port 8000 |

### Dépendances installées

| Package            | Version | Usage                                            |
|--------------------|---------|--------------------------------------------------|
| `react`            | 18+     | Framework UI                                     |
| `react-router-dom` | v6      | Navigation SPA — routing + protection des routes |
| `lucide-react`     | latest  | Icônes (sidebar, boutons...)                     |
| `react-icons`      | latest  | Icônes supplémentaires                           |
---

## Structure du projet
```
frontend-react/
├── public/
└── src/
    ├── api/              → couche communication avec le backend
    │   ├── client.js     → fonction apiFetch() centrale
    │   ├── auth.js       → login / logout
    │   ├── events.js     → CRUD événements
    │   └── participants.js → CRUD participants + inscriptions
    ├── components/       → composants réutilisables
    │   ├── ProtectedRoute.jsx  → protection par token
    │   └── AdminRoute.jsx      → protection par rôle admin
    ├── pages/            → écrans principaux
    │   ├── Login.jsx
    │   ├── Dashboard.jsx
    │   ├── Events.jsx
    │   ├── EventDetail.jsx
    │   └── Participants.jsx
    ├── store/
    │   └── authStore.js  → gestion token JWT + rôles
    ├── styles/           → CSS
    ├── App.js            → définition des routes
    └── index.js          → point d'entrée
```

---

## Authentification & Rôles

Le token JWT est stocké dans le `localStorage` après connexion.

| Clé localStorage | Valeur |
|-----------------|--------|
| `access_token` | Token JWT court (envoyé à chaque requête) |
| `refresh_token` | Token JWT long (renouvellement automatique) |
| `role` | `admin` ou `viewer` |

### Fonctions disponibles — `src/store/authStore.js`

| Fonction | Description |
|----------|-------------|
| `getToken()` | Récupère le access token |
| `setToken(token)` | Sauvegarde le access token |
| `getRefreshToken()` | Récupère le refresh token |
| `setRefreshToken(token)` | Sauvegarde le refresh token |
| `getRole()` | Récupère le rôle |
| `setRole(role)` | Sauvegarde le rôle |
| `isAuthed()` | `true` si connecté |
| `isAdmin()` | `true` si rôle admin |
| `logout()` | Efface tout (token + rôle) |

---

## Routing & Protection des routes

### Routes disponibles

| URL | Accès | Composant |
|-----|-------|-----------|
| `/login` | Public | Login.jsx |
| `/dashboard` | Connecté | Dashboard.jsx |
| `/events` | Connecté | Events.jsx |
| `/events/:id` | Connecté | EventDetail.jsx |
| `/participants` | Connecté | Participants.jsx |

### Comment ça marche ?

- **ProtectedRoute** : vérifie si un token existe
  - Token présent → page affichée
  - Token absent → redirection vers `/login`
- **AdminRoute** : vérifie token ET rôle admin
  - Rôle `viewer` → redirigé vers `/dashboard`

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

| Username | Password | Rôle |
|----------|----------|------|
| `admin` | `admin123` | admin (accès complet) |
| `viewer` | `viewer123` | viewer (lecture seule) |

### Données mock disponibles
- **3 événements** : Workshop ML, Conférence Federated Learning, Séminaire Multi-Agent
- **3 participants** : Alice Martin, Bob Dupont, Clara Bernard
- **2 inscriptions** pré-existantes

### Passer au vrai backend (quand Thomas est prêt)
1. Mettre `USE_MOCK = false` dans `src/api/auth.js`, `events.js`, `participants.js`
2. Vérifier que `.env` pointe vers `http://localhost:8000`
3. Tester chaque endpoint via l'app

---

## Intégration Backend Django

### Variables d'environnement

Créer un fichier `.env` à la racine de `frontend-react/` :
```
REACT_APP_API_BASE=http://localhost:8000
```

### Configuration requise côté Django

#### 1. Port
```bash
python manage.py runserver 8000
```

#### 2. CORS — déjà installé par Thomas
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
| Méthode | URL | Description |
|---------|-----|-------------|
| POST | `/api/token/` | Login → access + refresh + role |
| POST | `/api/token/refresh/` | Renouveler le access token |

#### Événements
| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/api/events/` | Liste (supporte `?status=` et `?date=`) |
| POST | `/api/events/` | Créer (admin) |
| GET | `/api/events/:id/` | Détail |
| PUT | `/api/events/:id/` | Modifier (admin) |
| DELETE | `/api/events/:id/` | Supprimer (admin) |

#### Participants
| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/api/participants/` | Liste |
| POST | `/api/participants/` | Créer (admin) |
| PUT | `/api/participants/:id/` | Modifier (admin) |
| DELETE | `/api/participants/:id/` | Supprimer (admin) |

#### Inscriptions
| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/api/registrations/?event=:id` | Participants d'un événement |
| POST | `/api/registrations/` | Inscrire un participant |
| DELETE | `/api/registrations/:id/` | Désinscrire |

### Headers envoyés automatiquement par le Frontend
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

### Format des erreurs attendu
```json
{ "detail": "message d'erreur" }
```
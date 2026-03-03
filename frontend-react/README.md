# EventHub — Frontend React

## Stack
- React (Create React App)
- React Router DOM v6
- JWT Authentication
- Django REST API

## Lancer le projet
```bash
cd frontend-react
npm install
npm start
```
App disponible sur http://localhost:3000

## Structure
```
src/
  api/         → couche communication avec le backend
  components/  → composants réutilisables (Navbar, ProtectedRoute...)
  pages/       → écrans principaux (Login, Events, Participants...)
  store/       → logique d'authentification (token)
  styles/      → CSS
```

## Variables d'environnement
Créer un fichier `.env` à la racine :
```
REACT_APP_API_BASE=http://localhost:8000
```

## Authentification
Le token JWT est stocké dans le `localStorage` sous la clé `token`.
Le rôle utilisateur (`admin` ou `viewer`) est stocké sous la clé `role`.

Fonctions disponibles depuis `src/store/authStore.js` :
- `getToken()` → récupère le token
- `setToken(token)` → sauvegarde le token après login
- `clearToken()` → supprime le token au logout
- `isAuthed()` → retourne true si connecté
- `isAdmin()` → retourne true si rôle admin


## 🛡️ Système de Routing & Protection des Routes

### Routes disponibles
| URL | Accès | Page |
|-----|-------|------|
| `/login` | Public | Page de connexion |
| `/dashboard` | Connecté | Tableau de bord |
| `/events` | Connecté | Liste des événements |
| `/events/:id` | Connecté | Détail d'un événement |
| `/participants` | Connecté | Liste des participants |

### Comment ça marche ?
- **ProtectedRoute** : vérifie si un token existe dans le localStorage
  - Token présent → accès autorisé
  - Token absent → redirection automatique vers `/login`
- **AdminRoute** : en plus de vérifier le token, vérifie si le rôle est `admin`
  - Rôle `viewer` → redirigé vers `/dashboard`

### Tester la protection des routes
Sans être connecté, aller sur `/events` redirige automatiquement vers `/login`.
Pour simuler une connexion en dev :
```javascript
// Dans la console du navigateur (F12)
localStorage.setItem("token", "test123")
localStorage.setItem("role", "admin")
```





## 🔗 Integration Backend → Frontend

### Configuration requise pour le Backend Django

Pour que le frontend puisse communiquer avec le backend, les points suivants 
sont obligatoires :

### 1. Port
Le backend Django doit tourner sur le port **8000** :
```bash
python manage.py runserver 8000
```

### 2. CORS
Installer et configurer `django-cors-headers` :
```bash
pip install django-cors-headers
```

Dans `settings.py` :
```python
INSTALLED_APPS = [
    ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # doit être en premier
    ...
]

# Autoriser le frontend React
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
```

### 3. Authentication JWT
Le backend doit retourner un token JWT à la connexion :
```json
POST /api/auth/login/
→ { "token": "eyJ...", "role": "admin" }
```

### 4. Endpoints attendus par le Frontend
| Méthode | URL | Description |
|---------|-----|-------------|
| POST | `/api/auth/login/` | Connexion |
| POST | `/api/auth/register/` | Inscription |
| GET | `/api/events/` | Liste des événements |
| POST | `/api/events/` | Créer un événement |
| GET | `/api/events/:id/` | Détail événement |
| PUT | `/api/events/:id/` | Modifier événement |
| DELETE | `/api/events/:id/` | Supprimer événement |
| GET | `/api/participants/` | Liste des participants |
| POST | `/api/participants/` | Créer un participant |
| PUT | `/api/participants/:id/` | Modifier participant |
| DELETE | `/api/participants/:id/` | Supprimer participant |
| GET | `/api/registrations/` | Liste des inscriptions |
| POST | `/api/registrations/` | Inscrire un participant |
| DELETE | `/api/registrations/:id/` | Supprimer inscription |

### 5. Format des réponses attendu
Toutes les réponses doivent être en **JSON**.
En cas d'erreur, le backend doit retourner :
```json
{ "detail": "message d'erreur ici" }
```
ou
```json
{ "error": "message d'erreur ici" }
```

### 6. Headers envoyés par le Frontend
Chaque requête authentifiée envoie automatiquement :
```
Content-Type: application/json
Authorization: Bearer <token>
```



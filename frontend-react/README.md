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

## API Backend attendue
*(sera complété au fur et à mesure)*

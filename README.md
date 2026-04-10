# Neurovent

![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?style=flat&logo=django&logoColor=white)
![DRF](https://img.shields.io/badge/Django_REST_Framework-ff1709?style=flat&logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=flat&logo=react-router&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=flat&logo=sqlite&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=flat&logo=render&logoColor=white)

> Web Programming course — Master 1 IAD-VMI, Universite Paris Cite, 2025-2026

---

Neurovent is a full-stack web platform for managing scientific and tech events — conferences, workshops, seminars. It covers the complete lifecycle of an event, from creation and publication to registration management, waitlist handling, and participant communication, with tailored experiences for participants, organizations, and administrators.

---

## Live

| Version | URL |
|---------|-----|
| Django backend | https://neurovent-web.vercel.app |
| Node.js backend | https://neuro-vent-mu.vercel.app |

---

## Project Structure

```
Projet/
├── backend-django/      # Main REST API — Django + DRF + JWT
├── frontend-react/      # Single Page Application — React
├── backend-node/        # Alternative backend — Express (comparison exercise)
├── docs/                # Reports and deliverables
└── README.md
```

---

## Tech Stack

### Backend — Django

| Technology | Role |
|------------|------|
| Django 6 | Web framework |
| Django REST Framework | REST API layer |
| SimpleJWT + token blacklist | Authentication and session management |
| django-filter | Query filtering |
| drf-spectacular | Auto-generated Swagger / ReDoc documentation |
| django-cors-headers | CORS handling |
| Pillow | Image processing (avatars, logos, banners) |
| python-decouple | Environment variable management |
| SQLite | Database (development) |

### Frontend — React

| Technology | Role |
|------------|------|
| React 18 | UI framework |
| React Router DOM v6 | Client-side routing and route protection |
| CSS (native) | Styling |
| lucide-react | Icon library |
| react-icons | Additional icons |
| JWT (localStorage) | Authentication token storage |

---

## Prerequisites

**Backend:** Python 3.11+, pip

**Frontend:** Node.js v18+, npm v9+

```bash
python3 --version
node --version
npm --version
```

---

## Getting Started

The project has two independent parts that run simultaneously. Open two terminal windows.

### 1. Backend — Django

```bash
# Navigate to the backend directory
cd backend-django

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate        # macOS / Linux
.venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# Start the development server
python manage.py runserver
```

The API is now running at **http://127.0.0.1:8000**

| URL | Description |
|-----|-------------|
| http://127.0.0.1:8000/api/ | REST API root |
| http://127.0.0.1:8000/admin/ | Django admin panel |
| http://127.0.0.1:8000/api/docs/ | Swagger UI — interactive API docs |
| http://127.0.0.1:8000/api/redoc/ | ReDoc — full API reference |

**Environment variables (optional)**

Create a `.env` file inside `backend-django/` based on `.env.example`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_FAIL_SILENTLY=False
FRONTEND_URL=http://localhost:3000
```

Without this file, Django prints outgoing emails to the terminal instead of sending them — which works fine for development.

### 2. Frontend — React

Open a second terminal:

```bash
# Navigate to the frontend directory
cd frontend-react

# Install dependencies
npm install

# Create the environment file
echo "REACT_APP_API_BASE=http://localhost:8000" > .env

# Start the development server
npm start
```

The app is now running at **http://localhost:3000**

Make sure the Django backend is already running before starting the frontend, otherwise API calls will fail.

---

## Demo Database

A seed script populates the database with a complete and realistic dataset — participants, organizations, events, and registrations in various states.

```bash
cd backend-django
source .venv/bin/activate
python scripts/reset_and_seed_demo.py
```

This wipes the current database and recreates it with:

- 20 participant accounts with enriched profiles
- 20 organization accounts in various verification states
- 1 admin account
- Multiple events across different formats, statuses, and registration modes
- Registrations in all statuses (confirmed, pending, waitlist, cancelled)

**Demo accounts:**

| Role | Login | Password |
|------|-------|----------|
| Participant | `amelie.rousseau@participants.neurovent.demo` | `Participant2026!` |
| Organization | `atlas-neuro-labs` | `Company2026!` |
| Admin | `admin@neurovent.demo` | `Admin2026!` |

---

## User Roles

### Participant
Browse and search for public events and organization profiles, register for events, track registration history, and maintain an enriched public profile with bio, links, a favorite domain, and progression badges.

### Organization
Create and manage events with automatic or manual registration review. Access a dashboard with global statistics, per-event attendance data, waitlist promotion, and CSV exports. Maintain a public profile with logo, description, domains, and social links.

### Admin
Dedicated front-end moderation panel to manage participant and organization accounts (suspend, activate, delete), verify or reject organizations based on uploaded documents, remove events, and monitor platform-wide statistics.

---

## Running Tests

```bash
cd backend-django
source .venv/bin/activate

# Full test suite
python manage.py test users events registrations tags

# Quick check after a significant change
python manage.py test users events
```

---

## Key API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/participant/` | Register as a participant |
| POST | `/api/auth/register/company/` | Register as an organization |
| POST | `/api/auth/login/participant/` | Login with email + password |
| POST | `/api/auth/login/company/` | Login with identifier + password |
| POST | `/api/auth/logout/` | Invalidate the refresh token |
| GET / PATCH | `/api/auth/me/` | Get or update the current user profile |
| DELETE | `/api/auth/me/` | Delete account |
| PATCH | `/api/auth/me/password/` | Change password |
| POST | `/api/auth/password-reset/` | Request a password reset email |
| POST | `/api/auth/password-reset/confirm/` | Confirm reset with uid and token |
| POST | `/api/auth/token/refresh/` | Refresh the access token |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events/` | List public events (supports filters) |
| GET | `/api/events/<id>/` | Event detail |
| POST | `/api/events/create/` | Create an event (organization) |
| PATCH | `/api/events/<id>/update/` | Update an event (organization) |
| DELETE | `/api/events/<id>/delete/` | Delete an event (organization) |
| GET | `/api/events/my-events/` | Events of the connected organization |
| GET | `/api/events/dashboard-stats/` | Organization dashboard statistics |
| GET | `/api/events/dashboard-stats/export-summary/` | Export summary CSV |
| GET | `/api/events/dashboard-stats/export-performance/` | Export performance CSV |

### Registrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/registrations/create/` | Register for an event |
| GET | `/api/registrations/my/` | Current user's registrations |
| PATCH | `/api/registrations/<id>/cancel/` | Cancel a registration |
| GET | `/api/registrations/event/<id>/` | All registrations for an event (organization) |
| PATCH | `/api/registrations/<id>/status/` | Approve, reject, or waitlist a registration |
| GET | `/api/registrations/event/<id>/export/` | Export registrations as CSV |

### Organizations (public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies/` | Public list of organizations |
| GET | `/api/companies/<id>/` | Public organization profile |

---

## Notes

- Always run `python manage.py migrate` after pulling changes that include new migrations.
- The Django admin panel (`/admin/`) and the front-end admin panel share the same `ADMIN` role.
- Public endpoints (`/api/events/`, `/api/companies/`) do not require authentication.

---

## Authors

| Name | GitHub | Role |
|------|--------|------|
| Thomas Gourmelen | [thmsgo18](https://github.com/thmsgo18) | Backend Django |
| Noureddine Mohammedi | [Mr-Noredine](https://github.com/Mr-Noredine) | Frontend React |
| Azouaou Zouaoui | [Azouaou1](https://github.com/Azouaou1) | Backend Node / Express |

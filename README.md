<div align="center">

[🇬🇧 English](./README.md) · [🇫🇷 Français](./README.fr.md)

# Neurovent

**The event management platform for scientific and tech communities.**

[![Django](https://img.shields.io/badge/Django-6.0-0C4B33?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.16-A30000?style=for-the-badge&logo=django&logoColor=white)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Sequelize](https://img.shields.io/badge/Sequelize-6-52B0E7?style=for-the-badge&logo=sequelize&logoColor=white)](https://sequelize.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-45ba4b?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Render](https://img.shields.io/badge/Render-Backend-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://render.com/)

---

🌐 **[Live Demo](https://neurovent-web.vercel.app)** · 📖 **[API Docs](https://neurovent-api.onrender.com/api/docs/)** · 📄 **[Project Report](./Project_Report_EventHub_Neurovent_Prog_web.pdf)**

</div>

---

## What is Neurovent?

Organizing scientific events — conferences, workshops, seminars — is far more complex than it looks. Researchers and institutions need to announce events, manage registrations with capacity limits, handle waitlists, validate participants, and communicate clearly at every step. Most general-purpose event tools are either too simple or too heavyweight for the specific needs of academic and scientific communities.

**Neurovent** is a purpose-built platform that covers the full event lifecycle:

- **Organizations** create and manage events, control registration modes, review participants, and export data.
- **Participants** browse events, register with a single click, track their registration status, and join waitlists automatically when capacity is reached.
- **Administrators** oversee the entire platform: verify organizations, moderate content, manage users, and monitor statistics.

The project was built as a Web Programming course assignment for the M1 IAD-VMI program at Université Paris Cité (2025–2026). It intentionally implements the same REST API **twice** — once in Django/DRF and once in Express.js/Sequelize — to compare the two ecosystems side by side.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                         │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│              React 19 SPA  (Vercel)                     │
│  • Role-based routing  • JWT auth  • i18n (FR/EN)       │
└────────────────────────┬────────────────────────────────┘
                         │ REST API calls
          ┌──────────────┴──────────────┐
          │                             │
┌─────────▼──────────┐       ┌──────────▼───────────────┐
│  Django + DRF      │       │  Express.js + Sequelize  │
│  (Primary API)     │       │  (Parallel implementation│
│  Render — Python   │       │   for comparison)        │
└─────────┬──────────┘       └──────────────────────────┘
          │
┌─────────▼──────────┐
│  PostgreSQL        │
│  (Render — EU)     │
└────────────────────┘
```

The frontend is a single-page application that targets the Django backend in production. The Node.js backend exposes an identical API and is provided as a comparison reference.

---

## Tech Stack

### Frontend
| Technology | Role |
|---|---|
| React 19 | UI framework |
| React Router v6 | Client-side routing & route guards |
| Lucide React / React Icons | Icon libraries |
| CSS (native) | Styling — no framework |
| Playwright | End-to-end tests |

### Backend — Django (Primary)
| Technology | Role |
|---|---|
| Django 6 | Web framework |
| Django REST Framework | REST API |
| SimpleJWT + token blacklist | JWT auth & secure logout |
| django-filter | Query filtering |
| drf-spectacular | Auto-generated Swagger/ReDoc docs |
| django-cors-headers | CORS handling |
| Pillow | Image processing |
| WhiteNoise | Static file serving |
| Gunicorn | WSGI server |
| PostgreSQL / SQLite | Database (prod / dev) |

### Backend — Node.js (Alternative)
| Technology | Role |
|---|---|
| Express.js 4 | HTTP framework |
| Sequelize 6 | ORM |
| jsonwebtoken | JWT |
| bcryptjs | Password hashing |
| Nodemailer | Email sending |
| Multer | File uploads |
| SQLite | Database (dev) |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm 9+

---

### 1. Clone the repository

```bash
git clone https://github.com/thmsgo18/Neurovent.git
cd Neurovent
```

---

### 2. Django Backend (Primary)

```bash
cd backend-django

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# (Optional) Seed the database with demo data
python scripts/reset_and_seed_demo.py

# Start the development server
python manage.py runserver
```

The API is now available at:

| URL | Description |
|---|---|
| `http://127.0.0.1:8000/api/` | REST API root |
| `http://127.0.0.1:8000/api/docs/` | Swagger UI |
| `http://127.0.0.1:8000/api/redoc/` | ReDoc |
| `http://127.0.0.1:8000/admin/` | Django Admin |

---

### 3. React Frontend

```bash
cd frontend-react

# Install dependencies
npm install

# Create a local environment file
echo "REACT_APP_API_BASE=http://localhost:8000" > .env

# Start the development server
npm start
```

The app opens at `http://localhost:3000`.

---

### 4. Node.js Backend (Optional)

```bash
cd backend-node

npm install

# Configure environment variables
cp .env.example .env   # then edit .env with your settings

npm run dev            # starts on port 8001
```

---

### 5. End-to-End Tests

```bash
# From the root of the repository
npm run qa:install     # Install Playwright + Chromium (first time only)
npm run qa:test        # Run all E2E tests
npm run qa:ui          # Open the Playwright test UI
npm run qa:record      # Record new interactions
npm run qa:inspect     # Inspect recorded tests
```

---

## API Reference

The full API is self-documented. With the Django backend running, open:

- **Swagger UI:** `http://localhost:8000/api/docs/`
- **ReDoc:** `http://localhost:8000/api/redoc/`

### Key endpoint groups

| Endpoint | Description |
|---|---|
| `POST /api/auth/register/participant/` | Register as a participant |
| `POST /api/auth/register/company/` | Register as an organization |
| `POST /api/auth/login/participant/` | Log in (participant) |
| `POST /api/auth/login/company/` | Log in (organization) |
| `GET /api/events/` | Browse events (filterable, paginated) |
| `POST /api/events/create/` | Create an event *(COMPANY)* |
| `POST /api/registrations/create/` | Register for an event *(PARTICIPANT)* |
| `GET /api/events/dashboard-stats/` | Organization dashboard *(COMPANY)* |
| `GET /api/admin/users/` | User management *(ADMIN)* |

---

## Deployment Pipeline

The project uses a **zero-config continuous deployment** model: every push to `main` automatically triggers a new deployment on both platforms.

```
git push origin main
       │
       ├──► Vercel detects change in frontend-react/
       │     Build:  npm run build
       │     Serve:  static CDN (global edge network)
       │     URL:    https://neurovent-web.vercel.app
       │
       └──► Render detects change in backend-django/
             Build:  pip install -r requirements.txt
                     python manage.py collectstatic --noinput
                     python manage.py migrate
             Start:  gunicorn config.wsgi:application
             URL:    https://neurovent-api.onrender.com
```

### Environment Variables

#### Frontend (Vercel)
| Variable | Value |
|---|---|
| `REACT_APP_API_BASE` | `https://neurovent-api.onrender.com` |

#### Backend (Render)
| Variable | Description |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `False` in production |
| `DATABASE_URL` | PostgreSQL connection string |
| `FRONTEND_URL` | Frontend URL (for email links) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins |
| `ALLOWED_HOSTS` | Comma-separated allowed hostnames |
| `EMAIL_HOST` | SMTP host *(optional)* |
| `EMAIL_HOST_USER` | SMTP user *(optional)* |
| `EMAIL_HOST_PASSWORD` | SMTP password *(optional)* |

> If `EMAIL_HOST` is not set, email content is printed to the terminal instead of being sent — useful for local development.

---

## Features & Roles

> For a comprehensive description of all features and design decisions, see the 📄 [Project Report](./Project_Report_EventHub_Neurovent_Prog_web.pdf).

---

### Participant

Participants are individuals (researchers, students, professionals) who discover and attend events.

**Account & profile**
- Register with email and password
- Upload a profile picture, fill in a bio and contact details
- Change password or reset it by email
- Delete account (GDPR-compliant)

**Event discovery**
- Browse all published events with pagination
- Filter by format (conference, workshop, seminar…), topic tags, date range, city, or country
- Full-text search across event titles and descriptions
- View detailed event page: description, organizer, location, capacity, remaining spots

**Registrations**
- Register for an event in one click
- Track registration status in real time: `Pending` · `Confirmed` · `Rejected` · `Cancelled` · `Waitlisted`
- Cancel a registration at any time
- Join the waitlist automatically when an event is full — get promoted and notified by email when a spot opens

---

### Organization

Organizations are institutions (labs, companies, associations) that create and manage events.

**Account & verification**
- Register with a unique identifier and SIRET number
- Account activation is subject to admin verification
- Upload a logo, add a description and contact information

**Event management**
- Create events with: title, description, format, topic tags, date & time, location, capacity, banner image
- Choose a registration mode:
  - **Direct** — registrations are confirmed immediately
  - **Validation** — each registration must be manually approved or rejected
- Edit or cancel an event at any time (all registered participants are notified by email)
- Unpublish an event to hide it from the public listing

**Participant management**
- View all registrations for each event
- Approve or reject pending registrations (in Validation mode)
- Manually remove a participant from an event
- Export the full participant list as a **CSV file**

**Dashboard & statistics**
- Global dashboard: total events, total registrations, fill rates
- Per-event stats: confirmed / pending / rejected / waitlist counts
- Export a performance summary CSV across all events

---

### Administrator

Admins have full oversight of the platform.

**User management**
- View all registered users (participants and organizations)
- Activate or deactivate any account
- Delete accounts if necessary

**Organization verification**
- Review organization registration requests
- Approve or reject based on provided SIRET and supporting documents
- Rejected organizations receive an explanatory email

**Platform oversight**
- Monitor global platform statistics
- Access the Django Admin panel for low-level data management

---

### Cross-cutting features

**Email notifications**
Every key event in the lifecycle triggers an automatic email:
registration confirmed / rejected, event cancelled, waitlist promotion, password reset, organization verification result.

**Registration lifecycle**

```
        ┌─────────────────────────┐
        │     Event full?         │
        │   YES → WAITLISTED      │
        │    NO ↓                 │
        │  Direct mode?           │
        │   YES → CONFIRMED       │
        │    NO → PENDING         │
        │         │               │
        │    Organization         │
        │    reviews              │
        │    ├─ Approve → CONFIRMED│
        │    └─ Reject  → REJECTED│
        └─────────────────────────┘
Cancellation at any step → CANCELLED
Waitlisted → CONFIRMED if a spot opens
```

**Bilingual interface**
The frontend ships with full **French / English** support via a built-in i18n system. Users switch language at any time without page reload.

---

## Project Structure

```
Neurovent/
├── backend-django/          # Primary REST API (Python / Django)
│   ├── config/              # Settings, URLs, WSGI
│   ├── users/               # Auth, profiles, admin tools
│   ├── events/              # Event CRUD, stats, CSV export
│   ├── registrations/       # Registration lifecycle & waitlist
│   ├── tags/                # Topic taxonomy
│   ├── scripts/             # Demo data seeder
│   └── templates/emails/    # Transactional email templates
│
├── backend-node/            # Alternative REST API (Node.js / Express)
│   ├── src/
│   │   ├── models/          # Sequelize models
│   │   ├── controllers/     # Business logic
│   │   ├── routes/          # Express routers
│   │   ├── middleware/       # Auth, permissions, file upload
│   │   └── services/        # Email, SIRENE, token blacklist
│   └── server.js
│
├── frontend-react/          # React 19 SPA
│   ├── src/
│   │   ├── api/             # API clients
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route pages
│   │   ├── store/           # Auth state (JWT + role)
│   │   ├── i18n/            # FR / EN translations
│   │   └── App.js           # Route definitions
│   └── public/
│
├── playwright-tests/        # E2E test suite
├── playwright.config.cjs    # Playwright configuration
└── scripts/                 # Test runner helpers
```

---

## Authors

| | Name | GitHub |
|---|---|---|
| | Thomas Gourmelen | [@thmsgo18](https://github.com/thmsgo18) |
| | Noureddine Mohammedi | [@Mr-Noredine](https://github.com/Mr-Noredine) |
| | Azouaou Zouaoui | [@Azouaou1](https://github.com/Azouaou1) |

M1 IAD · Université Paris Cité · Web Programming 2025–2026

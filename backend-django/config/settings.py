from pathlib import Path
from datetime import timedelta
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-wi)u4idasouy08dmw=+u7i*3%bg^o3ihyncq4s@b^6tkj(zzra')

DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda v: [h.strip() for h in v.split(',')])


# ─────────────────────────────────────────
#  Applications
# ─────────────────────────────────────────

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Packages tiers
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',

    # Apps du projet
    'tags',
    'users',
    'events',
    'registrations',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# ─────────────────────────────────────────
#  Django REST Framework
# ─────────────────────────────────────────

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
    ),
    # Pagination : 10 events par page, navigable avec ?page=2
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
    # Renomme le paramètre de format DRF pour éviter le conflit avec ?format= de nos filtres
    "URL_FORMAT_OVERRIDE": "response_format",
    # Swagger — schéma OpenAPI auto-généré
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}


# ─────────────────────────────────────────
#  Swagger / OpenAPI (drf-spectacular)
# ─────────────────────────────────────────

SPECTACULAR_SETTINGS = {
    'TITLE': 'Neurovent API',
    'DESCRIPTION': (
        'API REST de la plateforme Neurovent — gestion d\'événements scientifiques '
        '(conférences, workshops, séminaires en Neurosciences, IA, ML...).\n\n'
        '## Authentification\n'
        'Utiliser le token JWT obtenu via `/api/auth/login/participant/` '
        'ou `/api/auth/login/company/`.\n'
        'Cliquer sur **Authorize** et entrer : `Bearer <votre_token>`'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'TAGS': [
        {'name': 'Auth', 'description': 'Inscription, connexion, profil'},
        {'name': 'Events', 'description': 'Gestion des événements'},
        {'name': 'Registrations', 'description': 'Inscriptions aux événements'},
        {'name': 'Tags', 'description': 'Tags / thématiques'},
        {'name': 'Companies', 'description': 'Profils publics des organisateurs'},
    ],
}


# ─────────────────────────────────────────
#  JWT
# ─────────────────────────────────────────

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=2),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}


# ─────────────────────────────────────────
#  CORS — autorise le front React (Vite)
# ─────────────────────────────────────────

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]


# ─────────────────────────────────────────
#  URLs & WSGI
# ─────────────────────────────────────────

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'


# ─────────────────────────────────────────
#  Templates
# ─────────────────────────────────────────

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


# ─────────────────────────────────────────
#  Base de données
# ─────────────────────────────────────────

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# ─────────────────────────────────────────
#  Authentification
# ─────────────────────────────────────────

AUTH_USER_MODEL = 'users.CustomUser'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ─────────────────────────────────────────
#  Fichiers statiques & médias (logos, etc.)
# ─────────────────────────────────────────

STATIC_URL = 'static/'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# ─────────────────────────────────────────
#  Email
# ─────────────────────────────────────────

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST')
EMAIL_PORT = config('EMAIL_PORT', cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = f"Neurovent <{config('EMAIL_HOST_USER')}>"

# URL du frontend — utilisée dans les liens de reset envoyés par email
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# ─────────────────────────────────────────
#  Internationalisation
# ─────────────────────────────────────────

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Europe/Paris'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

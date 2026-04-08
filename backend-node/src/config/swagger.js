'use strict';

/**
 * swagger.js — Documentation OpenAPI 3.0 de l'API Neurovent Node.js
 *
 * Équivalent des endpoints Django :
 *   /api/schema/  → openapi.json
 *   /api/docs/    → Swagger UI
 *   /api/redoc/   → ReDoc
 *
 * Servi par swagger-ui-express dans app.js.
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Neurovent API',
      version: '1.0.0',
      description: `
API REST de la plateforme Neurovent — événements scientifiques et tech.

**Rôles :** \`PARTICIPANT\` · \`COMPANY\` · \`ADMIN\`

**Authentification :** JWT Bearer token
- Participants : \`/api/auth/login/participant/\`
- Organizations : \`/api/auth/login/company/\`
- Inclure le token dans le header : \`Authorization: Bearer <access_token>\`
      `.trim(),
      contact: {
        name: 'Neurovent',
        email: 'contact@neurovent.io',
      },
    },
    servers: [
      { url: 'http://localhost:8001', description: 'Développement local' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // ─── User ──────────────────────────────────────────────────────
        UserPublic: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            role: { type: 'string', enum: ['PARTICIPANT', 'COMPANY', 'ADMIN'] },
            email: { type: 'string', format: 'email', nullable: true },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            employer_name: { type: 'string' },
            participant_profile_type: { type: 'string', enum: ['STUDENT', 'PROFESSIONAL'] },
            participant_bio: { type: 'string' },
            favorite_domain: { type: 'string' },
            company_identifier: { type: 'string', nullable: true },
            company_name: { type: 'string' },
            company_description: { type: 'string' },
            verification_status: { type: 'string', enum: ['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW'] },
            date_joined: { type: 'string', format: 'date-time' },
          },
        },

        // ─── Event ─────────────────────────────────────────────────────
        Event: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string' },
            date_start: { type: 'string', format: 'date-time' },
            date_end: { type: 'string', format: 'date-time' },
            capacity: { type: 'integer', nullable: true },
            unlimited_capacity: { type: 'boolean' },
            status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CANCELLED'] },
            format: { type: 'string', enum: ['ONSITE', 'ONLINE', 'HYBRID'] },
            registration_mode: { type: 'string', enum: ['AUTO', 'VALIDATION'] },
            registration_deadline: { type: 'string', format: 'date-time', nullable: true },
            allow_registration_during_event: { type: 'boolean' },
            address_full: { type: 'string' },
            address_city: { type: 'string' },
            address_country: { type: 'string' },
            view_count: { type: 'integer' },
            tags: { type: 'array', items: { $ref: '#/components/schemas/Tag' } },
            company: { $ref: '#/components/schemas/UserPublic' },
          },
        },

        EventCreate: {
          type: 'object',
          required: ['title', 'description', 'date_start', 'date_end', 'format', 'registration_mode'],
          properties: {
            title: { type: 'string', maxLength: 200 },
            description: { type: 'string' },
            date_start: { type: 'string', format: 'date-time' },
            date_end: { type: 'string', format: 'date-time' },
            capacity: { type: 'integer', minimum: 2 },
            unlimited_capacity: { type: 'boolean', default: false },
            status: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] },
            format: { type: 'string', enum: ['ONSITE', 'ONLINE', 'HYBRID'] },
            registration_mode: { type: 'string', enum: ['AUTO', 'VALIDATION'] },
            registration_deadline: { type: 'string', format: 'date-time' },
            allow_registration_during_event: { type: 'boolean', default: false },
            address_full: { type: 'string' },
            address_city: { type: 'string' },
            address_country: { type: 'string' },
            online_platform: { type: 'string' },
            online_link: { type: 'string', format: 'uri' },
            tags: { type: 'array', items: { type: 'integer' } },
          },
        },

        // ─── Registration ───────────────────────────────────────────────
        Registration: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'WAITLIST'] },
            accessibility_needs: { type: 'string' },
            company_comment: { type: 'string' },
            event: { $ref: '#/components/schemas/Event' },
            participant: { $ref: '#/components/schemas/UserPublic' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ─── Tag ───────────────────────────────────────────────────────
        Tag: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
          },
        },

        // ─── Tokens ────────────────────────────────────────────────────
        TokenPair: {
          type: 'object',
          properties: {
            access: { type: 'string', description: 'JWT access token (durée : 2h)' },
            refresh: { type: 'string', description: 'JWT refresh token (durée : 7j)' },
            user: { $ref: '#/components/schemas/UserPublic' },
          },
        },

        // ─── Erreur ────────────────────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },

        // ─── Pagination ────────────────────────────────────────────────
        PaginatedEvents: {
          type: 'object',
          properties: {
            count: { type: 'integer' },
            next: { type: 'string', nullable: true },
            previous: { type: 'string', nullable: true },
            results: { type: 'array', items: { $ref: '#/components/schemas/Event' } },
          },
        },

        PaginatedRegistrations: {
          type: 'object',
          properties: {
            count: { type: 'integer' },
            next: { type: 'string', nullable: true },
            previous: { type: 'string', nullable: true },
            results: { type: 'array', items: { $ref: '#/components/schemas/Registration' } },
          },
        },
      },
    },

    paths: {
      // ─── HEALTH ──────────────────────────────────────────────────────
      '/api/health/': {
        get: {
          tags: ['Système'],
          summary: 'Santé de l\'API',
          responses: {
            200: { description: 'API opérationnelle' },
          },
        },
      },

      // ─── AUTH ─────────────────────────────────────────────────────────
      '/api/auth/register/participant/': {
        post: {
          tags: ['Authentification'],
          summary: 'Inscription participant',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'password_confirm', 'first_name', 'last_name'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    password_confirm: { type: 'string' },
                    first_name: { type: 'string' },
                    last_name: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Compte créé' },
            400: { description: 'Données invalides', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      '/api/auth/register/company/': {
        post: {
          tags: ['Authentification'],
          summary: 'Inscription organization',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['company_identifier', 'password', 'password_confirm', 'company_name', 'recovery_email'],
                  properties: {
                    company_identifier: { type: 'string', minLength: 3, maxLength: 50, pattern: '^[a-zA-Z0-9\\-]+$' },
                    password: { type: 'string', minLength: 8 },
                    password_confirm: { type: 'string' },
                    company_name: { type: 'string' },
                    recovery_email: { type: 'string', format: 'email' },
                    siret: { type: 'string', minLength: 14, maxLength: 14 },
                    legal_representative: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Compte créé, vérification SIRENE lancée' },
            400: { description: 'Données invalides' },
          },
        },
      },

      '/api/auth/login/participant/': {
        post: {
          tags: ['Authentification'],
          summary: 'Connexion participant',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Tokens JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenPair' } } } },
            401: { description: 'Identifiants incorrects' },
          },
        },
      },

      '/api/auth/login/company/': {
        post: {
          tags: ['Authentification'],
          summary: 'Connexion organization',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['identifier', 'password'],
                  properties: {
                    identifier: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Tokens JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenPair' } } } },
            400: { description: 'Identifiants incorrects' },
          },
        },
      },

      '/api/auth/token/refresh/': {
        post: {
          tags: ['Authentification'],
          summary: 'Rafraîchir le token d\'accès',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { refresh: { type: 'string' } } } } },
          },
          responses: {
            200: { description: 'Nouveau access token' },
            401: { description: 'Refresh token invalide ou expiré' },
          },
        },
      },

      '/api/auth/logout/': {
        post: {
          tags: ['Authentification'],
          summary: 'Déconnexion (blacklist du refresh token)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { refresh: { type: 'string' } } } } },
          },
          responses: {
            200: { description: 'Déconnecté' },
            401: { description: 'Non authentifié' },
          },
        },
      },

      '/api/auth/me/': {
        get: {
          tags: ['Profil'],
          summary: 'Récupérer son profil',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Profil utilisateur', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserPublic' } } } },
            401: { description: 'Non authentifié' },
          },
        },
        patch: {
          tags: ['Profil'],
          summary: 'Modifier son profil (partiel)',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Profil mis à jour' },
            400: { description: 'Données invalides' },
          },
        },
        delete: {
          tags: ['Profil'],
          summary: 'Supprimer son compte (RGPD)',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Compte anonymisé' },
            401: { description: 'Non authentifié' },
          },
        },
      },

      '/api/auth/me/password/': {
        patch: {
          tags: ['Profil'],
          summary: 'Changer son mot de passe',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['current_password', 'new_password', 'new_password_confirm'],
                  properties: {
                    current_password: { type: 'string' },
                    new_password: { type: 'string', minLength: 8 },
                    new_password_confirm: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Mot de passe modifié' },
            400: { description: 'Données invalides' },
          },
        },
      },

      '/api/auth/password-reset/': {
        post: {
          tags: ['Authentification'],
          summary: 'Demande de réinitialisation de mot de passe',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', format: 'email' } } } } },
          },
          responses: {
            200: { description: 'Email envoyé si le compte existe' },
          },
        },
      },

      '/api/auth/password-reset/confirm/': {
        post: {
          tags: ['Authentification'],
          summary: 'Confirmer la réinitialisation de mot de passe',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'new_password', 'new_password_confirm'],
                  properties: {
                    token: { type: 'string' },
                    new_password: { type: 'string', minLength: 8 },
                    new_password_confirm: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Mot de passe réinitialisé' },
            400: { description: 'Token invalide ou expiré' },
          },
        },
      },

      // ─── EVENTS ──────────────────────────────────────────────────────
      '/api/events/': {
        get: {
          tags: ['Événements'],
          summary: 'Liste publique des événements (paginée)',
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Recherche dans titre, description, nom organisation' },
            { name: 'format', in: 'query', schema: { type: 'string', enum: ['ONSITE', 'ONLINE', 'HYBRID'] } },
            { name: 'tags', in: 'query', schema: { type: 'array', items: { type: 'integer' } }, style: 'form', explode: true },
            { name: 'city', in: 'query', schema: { type: 'string' } },
            { name: 'country', in: 'query', schema: { type: 'string' } },
            { name: 'date_after', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'date_before', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'organization', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CANCELLED'] }, description: 'Admin uniquement' },
            { name: 'ordering', in: 'query', schema: { type: 'string' }, description: 'Ex: date_start, -date_start' },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
          ],
          responses: {
            200: { description: 'Liste paginée', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedEvents' } } } },
          },
        },
      },

      '/api/events/create/': {
        post: {
          tags: ['Événements'],
          summary: 'Créer un événement (COMPANY vérifié uniquement)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/EventCreate' } } },
          },
          responses: {
            201: { description: 'Événement créé (DRAFT)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } } },
            400: { description: 'Données invalides' },
            401: { description: 'Non authentifié' },
            403: { description: 'Réservé aux companies vérifiées' },
          },
        },
      },

      '/api/events/{id}/': {
        get: {
          tags: ['Événements'],
          summary: 'Détail d\'un événement (incrémente view_count)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Détail event', content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } } },
            404: { description: 'Introuvable' },
          },
        },
      },

      '/api/events/{id}/update/': {
        patch: {
          tags: ['Événements'],
          summary: 'Modifier un événement (owner uniquement)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/EventCreate' } } },
          },
          responses: {
            200: { description: 'Événement mis à jour' },
            403: { description: 'Non propriétaire' },
            404: { description: 'Introuvable' },
          },
        },
      },

      '/api/events/{id}/delete/': {
        delete: {
          tags: ['Événements'],
          summary: 'Supprimer un événement (owner uniquement)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            204: { description: 'Supprimé' },
            403: { description: 'Non propriétaire' },
          },
        },
      },

      '/api/events/my-events/': {
        get: {
          tags: ['Événements'],
          summary: 'Mes événements (COMPANY — tous statuts)',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Liste paginée', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedEvents' } } } },
            403: { description: 'Réservé aux companies' },
          },
        },
      },

      '/api/events/recommended/': {
        get: {
          tags: ['Événements'],
          summary: 'Événements recommandés selon les tags du participant',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Liste paginée' },
            403: { description: 'Réservé aux participants' },
          },
        },
      },

      '/api/events/{id}/stats/': {
        get: {
          tags: ['Événements'],
          summary: 'Stats d\'un événement (owner ou admin)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Statistiques de l\'événement' },
            403: { description: 'Accès refusé' },
          },
        },
      },

      '/api/events/dashboard-stats/': {
        get: {
          tags: ['Dashboard'],
          summary: 'Statistiques globales de la company',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Stats dashboard' },
            403: { description: 'Réservé aux companies' },
          },
        },
      },

      '/api/events/dashboard-stats/export-summary/': {
        get: {
          tags: ['Dashboard'],
          summary: 'Export CSV — résumé dashboard',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Fichier CSV', content: { 'text/csv': {} } },
          },
        },
      },

      '/api/events/dashboard-stats/export-performance/': {
        get: {
          tags: ['Dashboard'],
          summary: 'Export CSV — performance par événement',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Fichier CSV', content: { 'text/csv': {} } },
          },
        },
      },

      '/api/events/admin/{id}/delete/': {
        delete: {
          tags: ['Admin — Événements'],
          summary: 'Supprimer n\'importe quel événement (ADMIN)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            204: { description: 'Supprimé' },
            403: { description: 'Réservé aux admins' },
          },
        },
      },

      // ─── REGISTRATIONS ────────────────────────────────────────────────
      '/api/registrations/': {
        post: {
          tags: ['Inscriptions'],
          summary: 'S\'inscrire à un événement',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['event'],
                  properties: {
                    event: { type: 'integer', description: 'ID de l\'événement' },
                    accessibility_needs: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Inscrit (CONFIRMED, PENDING ou WAITLIST)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Registration' } } } },
            400: { description: 'Inscription impossible (deadline, complet en VALIDATION, etc.)' },
            403: { description: 'Réservé aux participants' },
          },
        },
      },

      '/api/registrations/my/': {
        get: {
          tags: ['Inscriptions'],
          summary: 'Mes inscriptions',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'WAITLIST'] } },
          ],
          responses: {
            200: { description: 'Liste paginée', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedRegistrations' } } } },
            403: { description: 'Réservé aux participants' },
          },
        },
      },

      '/api/registrations/{id}/cancel/': {
        patch: {
          tags: ['Inscriptions'],
          summary: 'Annuler son inscription (promeut le premier WAITLIST)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Inscription annulée' },
            403: { description: 'Pas la bonne inscription' },
          },
        },
      },

      '/api/registrations/event/{event_id}/': {
        get: {
          tags: ['Inscriptions'],
          summary: 'Liste des inscrits à un événement (owner ou admin)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'event_id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Liste paginée des inscriptions' },
            403: { description: 'Accès refusé' },
          },
        },
      },

      '/api/registrations/{id}/status/': {
        patch: {
          tags: ['Inscriptions'],
          summary: 'Changer le statut d\'une inscription (COMPANY ou ADMIN)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: { type: 'string', enum: ['CONFIRMED', 'REJECTED'] },
                    company_comment: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Statut mis à jour' },
            400: { description: 'Statut invalide' },
            403: { description: 'Accès refusé' },
          },
        },
      },

      '/api/registrations/{id}/remove/': {
        patch: {
          tags: ['Inscriptions'],
          summary: 'Supprimer un inscrit de l\'événement (COMPANY ou ADMIN)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            204: { description: 'Inscription supprimée, email envoyé au participant' },
            403: { description: 'Accès refusé' },
          },
        },
      },

      '/api/registrations/event/{event_id}/export/': {
        get: {
          tags: ['Inscriptions'],
          summary: 'Export CSV des inscrits d\'un événement',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'event_id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Fichier CSV', content: { 'text/csv': {} } },
            403: { description: 'Accès refusé' },
          },
        },
      },

      // ─── TAGS ────────────────────────────────────────────────────────
      '/api/tags/': {
        get: {
          tags: ['Tags'],
          summary: 'Liste de tous les tags (publique, triée alphabétiquement)',
          responses: {
            200: { description: 'Liste des tags', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Tag' } } } } },
          },
        },
      },

      '/api/tags/create/': {
        post: {
          tags: ['Tags'],
          summary: 'Créer un tag (ADMIN uniquement)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } },
          },
          responses: {
            201: { description: 'Tag créé' },
            400: { description: 'Nom dupliqué' },
            403: { description: 'Réservé aux admins' },
          },
        },
      },

      '/api/tags/{id}/delete/': {
        delete: {
          tags: ['Tags'],
          summary: 'Supprimer un tag (ADMIN uniquement)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            204: { description: 'Supprimé' },
            403: { description: 'Réservé aux admins' },
          },
        },
      },

      // ─── COMPANIES ────────────────────────────────────────────────────
      '/api/companies/': {
        get: {
          tags: ['Organizations'],
          summary: 'Rechercher des organizations',
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'Liste paginée des organizations' },
          },
        },
      },

      '/api/companies/{id}/': {
        get: {
          tags: ['Organizations'],
          summary: 'Profil public d\'une organization',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Profil public' },
            404: { description: 'Introuvable' },
          },
        },
      },

      // ─── ADMIN ───────────────────────────────────────────────────────
      '/api/auth/admin/stats/': {
        get: {
          tags: ['Admin'],
          summary: 'Statistiques globales plateforme',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Stats plateforme' },
            403: { description: 'Réservé aux admins' },
          },
        },
      },

      '/api/auth/admin/users/': {
        get: {
          tags: ['Admin'],
          summary: 'Liste de tous les utilisateurs',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'role', in: 'query', schema: { type: 'string', enum: ['PARTICIPANT', 'COMPANY', 'ADMIN'] } },
            { name: 'is_active', in: 'query', schema: { type: 'boolean' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'Liste paginée' },
            403: { description: 'Réservé aux admins' },
          },
        },
      },

      '/api/auth/admin/users/{id}/': {
        get: {
          tags: ['Admin'],
          summary: 'Détail d\'un utilisateur',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Détail utilisateur' },
            403: { description: 'Réservé aux admins' },
          },
        },
      },

      '/api/auth/admin/users/{id}/suspend/': {
        patch: {
          tags: ['Admin'],
          summary: 'Suspendre un compte',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Compte suspendu' } },
        },
      },

      '/api/auth/admin/users/{id}/activate/': {
        patch: {
          tags: ['Admin'],
          summary: 'Réactiver un compte suspendu',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Compte réactivé' } },
        },
      },

      '/api/auth/admin/users/{id}/delete/': {
        delete: {
          tags: ['Admin'],
          summary: 'Supprimer un compte (RGPD)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Compte anonymisé' },
            403: { description: 'Impossible de supprimer un admin' },
          },
        },
      },

      '/api/auth/admin/companies/': {
        get: {
          tags: ['Admin'],
          summary: 'Liste de toutes les organizations',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'verification_status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW'] } },
          ],
          responses: { 200: { description: 'Liste paginée' } },
        },
      },

      '/api/auth/admin/companies/{id}/verify/': {
        patch: {
          tags: ['Admin'],
          summary: 'Vérifier / rejeter une organization',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['verification_status'],
                  properties: {
                    verification_status: { type: 'string', enum: ['VERIFIED', 'REJECTED', 'NEEDS_REVIEW'] },
                    review_note: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Statut mis à jour' } },
        },
      },
    },
  },
  apis: [], // Pas de JSDoc inline — spec définie directement ci-dessus
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

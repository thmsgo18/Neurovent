from django.utils import timezone
from django.db.models import Count, Avg, Q, Sum
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import CustomUser, UserRole, VerificationStatus
from .serializers import (
    RegisterParticipantSerializer,
    RegisterCompanySerializer,
    ParticipantProfileSerializer,
    CompanyProfileSerializer,
    CompanyPublicSerializer,
    CompanySearchSerializer,
    UserProfileSerializer,
    UserListSerializer,
    AdminCompanyVerificationSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from emails import send_account_created, send_password_reset, send_company_verification_result


class CanViewParticipantProfile(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.role in [UserRole.COMPANY, UserRole.ADMIN, UserRole.PARTICIPANT]
        )


# ─────────────────────────────────────────
#  INSCRIPTION
# ─────────────────────────────────────────

class RegisterParticipantView(generics.CreateAPIView):
    """Inscription d'un participant"""
    queryset = CustomUser.objects.all()
    serializer_class = RegisterParticipantSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        send_account_created(user)


class RegisterCompanyView(generics.CreateAPIView):
    """
    Inscription d'une entreprise organisatrice.
    Déclenche automatiquement la vérification SIRENE après création du compte.
    """
    queryset = CustomUser.objects.all()
    serializer_class = RegisterCompanySerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        from .sirene import verify_siret

        company = serializer.save()

        # Vérification automatique via l'API SIRENE
        if company.siret:
            ver_status, _ = verify_siret(company.siret, company.company_name)
        else:
            ver_status = VerificationStatus.NEEDS_REVIEW

        company.verification_status = ver_status
        if ver_status == VerificationStatus.VERIFIED:
            company.verified_at = timezone.now()
            company.verification_source = 'AUTO'
        company.save(update_fields=['verification_status', 'verified_at', 'verification_source'])

        # Notifier la company du résultat
        send_company_verification_result(company)


# ─────────────────────────────────────────
#  LOGIN
# ─────────────────────────────────────────

class CompanyLoginView(APIView):
    """
    Login spécifique aux companies.
    Les companies se connectent avec company_identifier + password (pas l'email).
    Retourne access + refresh JWT.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        identifier = request.data.get('identifier')
        password = request.data.get('password')

        if not identifier or not password:
            return Response(
                {'error': 'Identifiant et mot de passe requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = CustomUser.objects.get(
                company_identifier=identifier,
                role=UserRole.COMPANY
            )
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'Identifiant ou mot de passe incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(password):
            return Response(
                {'error': 'Identifiant ou mot de passe incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.is_active:
            return Response(
                {'error': 'Ce compte est désactivé'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Génération du token JWT avec infos company incluses
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['company_name'] = user.company_name
        refresh['company_identifier'] = user.company_identifier

        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


# ─────────────────────────────────────────
#  PROFIL
# ─────────────────────────────────────────

class ProfileView(APIView):
    """
    GET  → voir son profil
    PUT/PATCH → modifier son profil
    Dispatche automatiquement le bon serializer selon le rôle.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.user.role == UserRole.PARTICIPANT:
            return ParticipantProfileSerializer
        if self.request.user.role in [UserRole.COMPANY, UserRole.ADMIN]:
            return CompanyProfileSerializer
        return UserProfileSerializer

    def get(self, request):
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        return self.patch(request)

    def delete(self, request):
        """
        Suppression de compte RGPD — DELETE /api/auth/me/
        - Annule les inscriptions aux events futurs (PENDING/CONFIRMED → CANCELLED)
        - Anonymise les données personnelles
        - Désactive le compte (is_active = False)
        - Garde l'historique des events passés (anonymisé)
        """
        from registrations.models import Registration

        user = request.user
        now = timezone.now()

        # 1. Annuler les inscriptions aux events futurs
        Registration.objects.filter(
            participant=user,
            event__date_start__gt=now,
            status__in=['PENDING', 'CONFIRMED']
        ).update(status='CANCELLED')

        # 2. Anonymiser les données personnelles selon le rôle
        if user.role == UserRole.PARTICIPANT:
            user.email = f"deleted_{user.id}@deleted.neurovent.com"
            user.first_name = "[Supprimé]"
            user.last_name = "[Supprimé]"
            user.employer_name = ""
            user.school_name = ""
            user.study_level = ""
            user.professional_company_name = ""
            user.job_title = ""
            user.job_started_at = None
            user.participant_avatar_url = ""
            user.participant_bio = ""
            user.favorite_domain = ""
            user.personal_website_url = ""
            user.github_url = ""
            user.participant_linkedin_url = ""
        elif user.role == UserRole.COMPANY:
            user.company_name = "[Entreprise supprimée]"
            user.company_description = ""
            user.recovery_email = ""
            user.company_logo_url = ""
            user.website_url = ""
            user.youtube_url = ""
            user.linkedin_url = ""
            user.twitter_url = ""
            user.instagram_url = ""
            user.facebook_url = ""

        # 3. Désactiver le compte
        user.is_active = False
        user.save()

        return Response(
            {'message': 'Compte supprimé avec succès.'},
            status=status.HTTP_200_OK
        )


class ParticipantPublicProfileView(APIView):
    permission_classes = [CanViewParticipantProfile]

    def get(self, request, pk):
        try:
            participant = CustomUser.objects.prefetch_related('tags').get(pk=pk, role=UserRole.PARTICIPANT)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Participant introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == UserRole.PARTICIPANT and request.user.pk != participant.pk:
            return Response({'error': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)

        return Response(ParticipantProfileSerializer(participant).data)


# ─────────────────────────────────────────
#  LOGOUT
# ─────────────────────────────────────────

class LogoutView(APIView):
    """
    Déconnexion — POST /api/auth/logout/
    Blackliste le refresh token pour l'invalider côté serveur.
    Body : { "refresh": "<refresh_token>" }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': 'Le refresh token est requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Déconnexion réussie.'})
        except TokenError:
            return Response(
                {'error': 'Token invalide ou déjà blacklisté.'},
                status=status.HTTP_400_BAD_REQUEST
            )


# ─────────────────────────────────────────
#  MOT DE PASSE
# ─────────────────────────────────────────

class ChangePasswordView(APIView):
    """
    Changement de mot de passe — PATCH /api/auth/me/password/
    L'utilisateur doit être connecté et fournir son mot de passe actuel.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            return Response({'message': 'Mot de passe modifié avec succès.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """
    Demande de réinitialisation — POST /api/auth/password-reset/
    Envoie un email avec un lien contenant un token signé.
    Fonctionne pour les participants (email login) et les companies (recovery_email).
    Retourne toujours 200 pour ne pas révéler si l'email existe.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        user = None

        # Cherche un participant par son email de connexion
        try:
            user = CustomUser.objects.get(email=email, role=UserRole.PARTICIPANT, is_active=True)
        except CustomUser.DoesNotExist:
            # Cherche une company par son recovery_email
            try:
                user = CustomUser.objects.get(recovery_email=email, role=UserRole.COMPANY, is_active=True)
            except CustomUser.DoesNotExist:
                pass  # Email inconnu → on ne révèle rien

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
            send_password_reset(email, reset_link)

        return Response({
            'message': "Si cet email est associé à un compte, un lien de réinitialisation a été envoyé."
        })


class PasswordResetConfirmView(APIView):
    """
    Confirmation du reset — POST /api/auth/password-reset/confirm/
    Valide le token reçu par email et applique le nouveau mot de passe.
    Body : { uid, token, new_password, new_password_confirm }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Décoder l'uid pour retrouver l'utilisateur
        try:
            uid = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
            user = CustomUser.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
            return Response({'error': 'Lien invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        # Vérifier le token (signé avec le hash du mot de passe actuel → invalide après usage)
        if not default_token_generator.check_token(user, serializer.validated_data['token']):
            return Response({'error': 'Lien invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({'message': 'Mot de passe réinitialisé avec succès.'})


# ─────────────────────────────────────────
#  PROFIL PUBLIC COMPANY
# ─────────────────────────────────────────

class CompanyPublicView(generics.RetrieveAPIView):
    """
    Profil public d'une company — GET /api/companies/<id>/
    Accessible sans authentification.
    Retourne les infos publiques + les events publiés.
    """
    serializer_class = CompanyPublicSerializer
    permission_classes = [permissions.AllowAny]
    queryset = CustomUser.objects.filter(role=UserRole.COMPANY, is_active=True)


class CompanyPublicListView(generics.ListAPIView):
    """
    Recherche publique des companies — GET /api/companies/?search=...
    Accessible sans authentification.
    """
    serializer_class = CompanySearchSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = (
            CustomUser.objects
            .filter(role=UserRole.COMPANY, is_active=True)
            .prefetch_related('tags', 'events')
            .order_by('company_name')
        )

        organization = (self.request.query_params.get('organization') or '').strip()
        if organization:
            queryset = queryset.filter(company_name__iexact=organization)

        search = (self.request.query_params.get('search') or '').strip()
        if search:
            terms = [term for term in search.split() if term.strip()]
            if terms:
                query = Q()
                for term in terms:
                    query &= (
                        Q(company_name__icontains=term) |
                        Q(company_description__icontains=term) |
                        Q(tags__name__icontains=term)
                    )
                queryset = queryset.filter(query).distinct()

        return queryset


# ─────────────────────────────────────────
#  LISTE UTILISATEURS ADMIN
# ─────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    """
    Liste tous les utilisateurs — GET /api/auth/admin/users/
    Réservé aux admins. Paginée (10 par page).

    Filtres :
        ?role=PARTICIPANT   → uniquement les participants
        ?role=COMPANY       → uniquement les companies
        ?is_active=true     → comptes actifs uniquement
        ?is_active=false    → comptes suspendus/supprimés
    """
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data,
        })

    def get_queryset(self):
        queryset = CustomUser.objects.exclude(role=UserRole.ADMIN).order_by('date_joined')

        role = self.request.query_params.get('role')
        if role in [UserRole.PARTICIPANT, UserRole.COMPANY]:
            queryset = queryset.filter(role=role)

        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        search = (self.request.query_params.get('search') or '').strip()
        if search:
            terms = [term.strip() for term in search.split() if term.strip()]
            query = Q()
            for term in terms:
                query &= (
                    Q(email__icontains=term) |
                    Q(first_name__icontains=term) |
                    Q(last_name__icontains=term) |
                    Q(employer_name__icontains=term) |
                    Q(school_name__icontains=term) |
                    Q(study_level__icontains=term) |
                    Q(professional_company_name__icontains=term) |
                    Q(job_title__icontains=term) |
                    Q(participant_bio__icontains=term) |
                    Q(favorite_domain__icontains=term) |
                    Q(tags__name__icontains=term)
                )
            queryset = queryset.filter(query).distinct()

        return queryset


class AdminUserDetailView(APIView):
    """
    Détail complet d'un utilisateur — GET /api/auth/admin/users/<id>/
    Réservé aux admins.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, pk):
        try:
            user = CustomUser.objects.prefetch_related('tags').get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if user.role == UserRole.ADMIN:
            return Response({'error': 'Profil admin indisponible.'}, status=status.HTTP_403_FORBIDDEN)

        serializer_class = ParticipantProfileSerializer if user.role == UserRole.PARTICIPANT else CompanyProfileSerializer
        return Response(serializer_class(user).data)


# ─────────────────────────────────────────
#  MODÉRATION ADMIN
# ─────────────────────────────────────────

class AdminDeleteUserView(APIView):
    """
    Suppression d'un compte par l'admin — DELETE /api/auth/admin/users/<id>/
    Effectue une anonymisation RGPD (comme la suppression par l'user lui-même).
    Irréversible.
    """
    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if user.role == UserRole.ADMIN:
            return Response({'error': 'Impossible de supprimer un admin.'}, status=status.HTTP_403_FORBIDDEN)

        from registrations.models import Registration
        now = timezone.now()

        # Annuler les inscriptions futures
        Registration.objects.filter(
            participant=user,
            event__date_start__gt=now,
            status__in=['PENDING', 'CONFIRMED']
        ).update(status='CANCELLED')

        # Anonymiser les données
        if user.role == UserRole.PARTICIPANT:
            user.email = f"deleted_{user.id}@deleted.neurovent.com"
            user.first_name = "[Supprimé]"
            user.last_name = "[Supprimé]"
            user.employer_name = ""
        elif user.role == UserRole.COMPANY:
            user.company_name = "[Entreprise supprimée]"
            user.company_description = ""
            user.recovery_email = ""
            user.website_url = ""
            user.youtube_url = ""
            user.linkedin_url = ""
            user.twitter_url = ""
            user.instagram_url = ""
            user.facebook_url = ""

        user.is_active = False
        user.save()

        return Response({'message': f'Compte {pk} supprimé avec succès.'})


class AdminSuspendUserView(APIView):
    """
    Suspension d'un compte — PATCH /api/admin/users/<id>/suspend/
    Réservé à l'admin. Désactive le compte sans toucher aux données.
    Réversible via AdminActivateUserView.
    """
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if user.role == UserRole.ADMIN:
            return Response({'error': 'Impossible de suspendre un admin.'}, status=status.HTTP_403_FORBIDDEN)

        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response({'message': f'Compte {user} suspendu avec succès.'})


class AdminActivateUserView(APIView):
    """
    Réactivation d'un compte — PATCH /api/admin/users/<id>/activate/
    Réservé à l'admin. Réactive un compte suspendu.
    """
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response({'message': f'Compte {user} réactivé avec succès.'})


# ─────────────────────────────────────────
#  VÉRIFICATION ENTREPRISES (admin)
# ─────────────────────────────────────────

class AdminPendingCompaniesView(generics.ListAPIView):
    """
    Liste les companies en attente de vérification — GET /api/auth/admin/companies/pending/
    Filtre optionnel : ?status=NEEDS_REVIEW | PENDING | VERIFIED | REJECTED
    """
    serializer_class = AdminCompanyVerificationSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data,
        })

    def get_queryset(self):
        status_filter = self.request.query_params.get('status', VerificationStatus.PENDING)
        return (
            CustomUser.objects
            .filter(role=UserRole.COMPANY, verification_status=status_filter)
            .order_by('date_joined')
        )


class AdminCompanyListView(generics.ListAPIView):
    """
    Liste complète des entreprises — GET /api/auth/admin/companies/
    Filtres optionnels :
        ?verification_status=VERIFIED|PENDING|NEEDS_REVIEW|REJECTED
        ?is_active=true|false
        ?search=atlas
    """
    serializer_class = CompanyProfileSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data,
        })

    def get_queryset(self):
        queryset = CustomUser.objects.filter(role=UserRole.COMPANY).prefetch_related('tags').order_by('date_joined')

        verification_status = self.request.query_params.get('verification_status')
        if verification_status in [
            VerificationStatus.PENDING,
            VerificationStatus.VERIFIED,
            VerificationStatus.REJECTED,
            VerificationStatus.NEEDS_REVIEW,
        ]:
            queryset = queryset.filter(verification_status=verification_status)

        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        search = (self.request.query_params.get('search') or '').strip()
        if search:
            terms = [term.strip() for term in search.split() if term.strip()]
            query = Q()
            for term in terms:
                query &= (
                    Q(company_name__icontains=term) |
                    Q(recovery_email__icontains=term) |
                    Q(company_identifier__icontains=term) |
                    Q(company_description__icontains=term) |
                    Q(siret__icontains=term) |
                    Q(legal_representative__icontains=term) |
                    Q(review_note__icontains=term) |
                    Q(website_url__icontains=term) |
                    Q(youtube_url__icontains=term) |
                    Q(linkedin_url__icontains=term) |
                    Q(twitter_url__icontains=term) |
                    Q(instagram_url__icontains=term) |
                    Q(facebook_url__icontains=term) |
                    Q(tags__name__icontains=term)
                )
            queryset = queryset.filter(query).distinct()

        return queryset


class AdminCompanyVerifyView(APIView):
    """
    Valide ou refuse manuellement une company — PATCH /api/auth/admin/companies/<id>/verify/
    Body : { "verification_status": "VERIFIED"|"REJECTED"|"NEEDS_REVIEW", "review_note": "..." }
    """
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, pk):
        try:
            company = CustomUser.objects.get(pk=pk, role=UserRole.COMPANY)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Entreprise introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminCompanyVerificationSerializer(company, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_status = serializer.validated_data.get('verification_status')
        company = serializer.save()

        # Mettre à jour la source et la date si vérification manuelle
        if new_status == VerificationStatus.VERIFIED:
            company.verified_at = timezone.now()
            company.verification_source = 'MANUAL'
            company.save(update_fields=['verified_at', 'verification_source'])
        elif new_status in [VerificationStatus.REJECTED, VerificationStatus.NEEDS_REVIEW]:
            company.verified_at = None
            company.save(update_fields=['verified_at'])

        # Notifier la company
        send_company_verification_result(company)

        return Response(AdminCompanyVerificationSerializer(company).data)


class CompanyUploadDocumentView(APIView):
    """
    Upload d'un justificatif (Kbis / RNE) — PATCH /api/auth/me/verification/document/
    Réservé aux companies. Passe le statut en NEEDS_REVIEW pour déclencher une révision manuelle.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        user = request.user
        if user.role != UserRole.COMPANY:
            return Response(
                {'error': 'Réservé aux comptes entreprise.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if 'verification_document' not in request.FILES:
            return Response(
                {'error': 'Aucun fichier fourni. Champ attendu : "verification_document".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.verification_document = request.FILES['verification_document']
        # Si le compte était REJECTED ou PENDING, le repasser en NEEDS_REVIEW
        if user.verification_status in [VerificationStatus.REJECTED, VerificationStatus.PENDING]:
            user.verification_status = VerificationStatus.NEEDS_REVIEW
        user.save(update_fields=['verification_document', 'verification_status'])

        return Response({
            'message': 'Document reçu. Votre dossier est en cours de révision.',
            'verification_status': user.verification_status,
        })


# ─────────────────────────────────────────
#  STATISTIQUES ADMIN
# ─────────────────────────────────────────

class AdminStatsView(APIView):
    """
    Statistiques globales pour l'admin.
    Accessible uniquement aux admins (is_staff=True).
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from events.models import Event
        from registrations.models import Registration

        now = timezone.now()
        first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # --- Utilisateurs ---
        total_participants = CustomUser.objects.filter(role=UserRole.PARTICIPANT).count()
        total_companies = CustomUser.objects.filter(role=UserRole.COMPANY).count()
        total_admins = CustomUser.objects.filter(role=UserRole.ADMIN).count()
        new_users_this_month = CustomUser.objects.filter(date_joined__gte=first_day_of_month).count()
        active_users = CustomUser.objects.filter(is_active=True).count()
        companies_pending = CustomUser.objects.filter(role=UserRole.COMPANY, verification_status=VerificationStatus.PENDING).count()
        companies_needing_review = CustomUser.objects.filter(role=UserRole.COMPANY, verification_status=VerificationStatus.NEEDS_REVIEW).count()
        companies_verified = CustomUser.objects.filter(role=UserRole.COMPANY, verification_status=VerificationStatus.VERIFIED).count()
        companies_rejected = CustomUser.objects.filter(role=UserRole.COMPANY, verification_status=VerificationStatus.REJECTED).count()

        # --- Événements ---
        total_events = Event.objects.count()
        total_views = Event.objects.aggregate(total=Sum('view_count'))['total'] or 0
        events_by_status = {
            'published': Event.objects.filter(status='PUBLISHED').count(),
            'draft': Event.objects.filter(status='DRAFT').count(),
            'cancelled': Event.objects.filter(status='CANCELLED').count(),
        }
        events_by_format = {
            'onsite': Event.objects.filter(format='ONSITE').count(),
            'online': Event.objects.filter(format='ONLINE').count(),
            'hybrid': Event.objects.filter(format='HYBRID').count(),
        }
        new_events_this_month = Event.objects.filter(created_at__gte=first_day_of_month).count()

        # --- Inscriptions ---
        total_registrations = Registration.objects.count()
        registrations_by_status = {
            'confirmed': Registration.objects.filter(status='CONFIRMED').count(),
            'pending': Registration.objects.filter(status='PENDING').count(),
            'rejected': Registration.objects.filter(status='REJECTED').count(),
            'cancelled': Registration.objects.filter(status='CANCELLED').count(),
            'waitlist': Registration.objects.filter(status='WAITLIST').count(),
        }

        # Top 5 events les plus populaires (par inscriptions confirmées)
        top_events = (
            Event.objects.annotate(confirmed_count=Count('registrations', filter=Q(registrations__status='CONFIRMED')))
            .order_by('-confirmed_count')[:5]
            .values('id', 'title', 'confirmed_count', 'capacity', 'status', 'format')
        )

        return Response({
            'users': {
                'total_participants': total_participants,
                'total_companies': total_companies,
                'total_admins': total_admins,
                'total': total_participants + total_companies + total_admins,
                'active_total': active_users,
                'new_this_month': new_users_this_month,
                'company_verification': {
                    'pending': companies_pending,
                    'needs_review': companies_needing_review,
                    'verified': companies_verified,
                    'rejected': companies_rejected,
                },
            },
            'events': {
                'total': total_events,
                'total_views': total_views,
                'new_this_month': new_events_this_month,
                'by_status': events_by_status,
                'by_format': events_by_format,
                'top_5_popular': list(top_events),
            },
            'registrations': {
                'total': total_registrations,
                'by_status': registrations_by_status,
            },
        })

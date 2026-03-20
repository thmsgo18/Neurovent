from django.utils import timezone
from django.db.models import Count, Avg
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser, UserRole
from .serializers import (
    RegisterParticipantSerializer,
    RegisterCompanySerializer,
    ParticipantProfileSerializer,
    CompanyProfileSerializer,
    UserProfileSerializer,
)


# ─────────────────────────────────────────
#  INSCRIPTION
# ─────────────────────────────────────────

class RegisterParticipantView(generics.CreateAPIView):
    """Inscription d'un participant"""
    queryset = CustomUser.objects.all()
    serializer_class = RegisterParticipantSerializer
    permission_classes = [permissions.AllowAny]


class RegisterCompanyView(generics.CreateAPIView):
    """Inscription d'une entreprise organisatrice"""
    queryset = CustomUser.objects.all()
    serializer_class = RegisterCompanySerializer
    permission_classes = [permissions.AllowAny]


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
        if self.request.user.role == UserRole.COMPANY:
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
        new_users_this_month = CustomUser.objects.filter(date_joined__gte=first_day_of_month).count()

        # --- Événements ---
        total_events = Event.objects.count()
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
        }

        # Top 5 events les plus populaires (par inscriptions confirmées)
        top_events = (
            Event.objects.annotate(confirmed_count=Count('registrations'))
            .order_by('-confirmed_count')[:5]
            .values('id', 'title', 'confirmed_count', 'capacity')
        )

        return Response({
            'users': {
                'total_participants': total_participants,
                'total_companies': total_companies,
                'total': total_participants + total_companies,
                'new_this_month': new_users_this_month,
            },
            'events': {
                'total': total_events,
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

from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from django.utils import timezone
from .models import Event
from .serializers import EventListSerializer, EventDetailSerializer, EventCreateUpdateSerializer
from .filters import EventFilter
from users.models import UserRole
from emails import send_event_cancelled


# --- Permissions personnalisées ---

class IsParticipant(permissions.BasePermission):
    """Seuls les participants peuvent accéder"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserRole.PARTICIPANT


class IsCompany(permissions.BasePermission):
    """Seules les entreprises peuvent accéder"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserRole.COMPANY


class IsCompanyOwner(permissions.BasePermission):
    """L'entreprise doit être propriétaire de l'event"""
    def has_object_permission(self, request, view, obj):
        return obj.company == request.user


# --- Vues publiques (sans authentification) ---

class EventListView(generics.ListAPIView):
    """
    Liste des events publiés — accessible à tous.

    Filtres disponibles :
        ?format=ONSITE|ONLINE|HYBRID
        ?tags=1&tags=2          → events avec au moins un de ces tags
        ?date_after=2026-04-01  → events démarrant après cette date
        ?date_before=2026-05-01 → events démarrant avant cette date
        ?city=Paris
        ?country=France
        ?search=neurosciences   → recherche dans titre + description
        ?ordering=date_start    → tri croissant par date
        ?ordering=-date_start   → tri décroissant par date
        ?ordering=capacity      → tri par capacité
    """
    serializer_class = EventListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = EventFilter
    ordering_fields = ['date_start', 'date_end', 'capacity', 'created_at']
    ordering = ['date_start']  # tri par défaut : les plus prochains en premier

    def get_queryset(self):
        # Les admins voient tous les statuts (filtrables via ?status=)
        # Les autres (public, participants, companies) voient uniquement les PUBLISHED
        if self.request.user.is_authenticated and self.request.user.is_staff:
            return (
                Event.objects
                .select_related('company')
                .prefetch_related('tags', 'registrations')
            )
        return (
            Event.objects
            .filter(status='PUBLISHED')
            .select_related('company')
            .prefetch_related('tags', 'registrations')
        )


class EventDetailView(generics.RetrieveAPIView):
    """Détail d'un event — accessible à tous"""
    serializer_class = EventDetailSerializer
    permission_classes = [permissions.AllowAny]
    queryset = (
        Event.objects
        .filter(status='PUBLISHED')
        .select_related('company')
        .prefetch_related('tags', 'registrations')
    )


# --- Vues Company ---

class EventCreateView(generics.CreateAPIView):
    """Créer un event — Company uniquement"""
    serializer_class = EventCreateUpdateSerializer
    permission_classes = [IsCompany]


class EventUpdateView(generics.UpdateAPIView):
    """Modifier un event — Company propriétaire uniquement"""
    serializer_class = EventCreateUpdateSerializer
    permission_classes = [IsCompany, IsCompanyOwner]

    def get_queryset(self):
        return (
            Event.objects
            .filter(company=self.request.user)
            .prefetch_related('tags')
        )

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        instance = serializer.save()
        # Si le statut vient de passer à CANCELLED → notifier les inscrits
        if old_status != 'CANCELLED' and instance.status == 'CANCELLED':
            send_event_cancelled(instance)


class EventDeleteView(generics.DestroyAPIView):
    """Supprimer un event — Company propriétaire uniquement"""
    permission_classes = [IsCompany, IsCompanyOwner]

    def get_queryset(self):
        return Event.objects.filter(company=self.request.user)


class MyEventsView(generics.ListAPIView):
    """Events créés par la company connectée (tous statuts)"""
    serializer_class = EventDetailSerializer
    permission_classes = [IsCompany]

    def get_queryset(self):
        return (
            Event.objects
            .filter(company=self.request.user)
            .select_related('company')
            .prefetch_related('tags', 'registrations')
        )


class RecommendedEventsView(generics.ListAPIView):
    """
    Events recommandés — GET /api/events/recommended/
    Accessible aux participants connectés uniquement.
    Retourne les events publiés dont les tags correspondent aux intérêts du participant.
    Exclut les events auxquels le participant est déjà inscrit.
    Si le participant n'a aucun tag → retourne une liste vide.
    """
    serializer_class = EventListSerializer
    permission_classes = [IsParticipant]

    def get_queryset(self):
        user = self.request.user
        participant_tags = user.tags.all()

        if not participant_tags.exists():
            return Event.objects.none()

        already_registered = user.registrations.values_list('event_id', flat=True)

        return (
            Event.objects
            .filter(
                status='PUBLISHED',
                date_start__gt=timezone.now(),
                tags__in=participant_tags,
            )
            .exclude(id__in=already_registered)
            .select_related('company')
            .prefetch_related('tags', 'registrations')
            .distinct()
            .order_by('date_start')
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        if not request.user.tags.exists():
            return Response({
                'message': 'Ajoutez des tags à votre profil pour recevoir des recommandations.',
                'results': []
            })
        serializer = self.get_serializer(queryset, many=True)
        return Response({'results': serializer.data})


class EventStatsView(APIView):
    """
    Statistiques détaillées d'un event — GET /api/events/<id>/stats/
    Accessible uniquement par la company propriétaire ou un admin.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        # Récupérer l'event
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return Response({'error': 'Événement introuvable'}, status=status.HTTP_404_NOT_FOUND)

        # Vérifier que c'est la company propriétaire ou un admin
        is_owner = request.user.role == UserRole.COMPANY and event.company == request.user
        is_admin = request.user.is_staff
        if not is_owner and not is_admin:
            return Response({'error': 'Accès refusé'}, status=status.HTTP_403_FORBIDDEN)

        # Calcul des stats — 1 seule requête SQL avec agrégation
        from registrations.models import Registration
        stats = Registration.objects.filter(event=event).aggregate(
            total=Count('id'),
            confirmed=Count('id', filter=Q(status='CONFIRMED')),
            pending=Count('id', filter=Q(status='PENDING')),
            rejected=Count('id', filter=Q(status='REJECTED')),
            cancelled=Count('id', filter=Q(status='CANCELLED')),
        )

        confirmed = stats['confirmed']
        occupation_rate = round((confirmed / event.capacity) * 100, 1) if event.capacity > 0 else 0

        return Response({
            'event': {
                'id': event.id,
                'title': event.title,
                'status': event.status,
                'format': event.format,
                'date_start': event.date_start,
                'date_end': event.date_end,
                'capacity': event.capacity,
                'registration_mode': event.registration_mode,
            },
            'registrations': {
                'total': stats['total'],
                'confirmed': stats['confirmed'],
                'pending': stats['pending'],
                'rejected': stats['rejected'],
                'cancelled': stats['cancelled'],
            },
            'spots_remaining': event.spots_remaining,
            'occupation_rate': occupation_rate,  # en %
        })

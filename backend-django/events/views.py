from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Event
from .serializers import EventListSerializer, EventDetailSerializer, EventCreateUpdateSerializer
from .filters import EventFilter
from users.models import UserRole


# --- Permissions personnalisées ---

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
        return Event.objects.filter(status='PUBLISHED')


class EventDetailView(generics.RetrieveAPIView):
    """Détail d'un event — accessible à tous"""
    serializer_class = EventDetailSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Event.objects.filter(status='PUBLISHED')


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
        return Event.objects.filter(company=self.request.user)


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
        return Event.objects.filter(company=self.request.user)

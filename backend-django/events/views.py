from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from .models import Event
from .serializers import EventListSerializer, EventDetailSerializer, EventCreateUpdateSerializer
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
    """Liste des events publiés — accessible à tous"""
    serializer_class = EventListSerializer
    permission_classes = [permissions.AllowAny]

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

from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import Registration
from .serializers import RegistrationSerializer, RegistrationStatusUpdateSerializer
from events.models import Event
from users.models import UserRole


# --- Permissions personnalisées ---

class IsParticipant(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserRole.PARTICIPANT


class IsCompany(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserRole.COMPANY


# --- Vues Participant ---

class RegisterToEventView(generics.CreateAPIView):
    """Un participant s'inscrit à un event"""
    serializer_class = RegistrationSerializer
    permission_classes = [IsParticipant]

    def perform_create(self, serializer):
        event = serializer.validated_data['event']

        # L'event doit être publié
        if event.status != 'PUBLISHED':
            raise PermissionDenied("Cet événement n'est pas ouvert aux inscriptions")

        # Vérifier la capacité
        confirmed_count = event.registrations.filter(status='CONFIRMED').count()
        if confirmed_count >= event.capacity:
            raise ValidationError("Cet événement est complet")

        # Mode AUTO → confirmé immédiatement / VALIDATION → en attente
        initial_status = 'CONFIRMED' if event.registration_mode == 'AUTO' else 'PENDING'
        serializer.save(participant=self.request.user, status=initial_status)


class MyRegistrationsView(generics.ListAPIView):
    """Un participant voit toutes ses inscriptions"""
    serializer_class = RegistrationSerializer
    permission_classes = [IsParticipant]

    def get_queryset(self):
        return Registration.objects.filter(participant=self.request.user)


class CancelRegistrationView(generics.UpdateAPIView):
    """Un participant annule son inscription"""
    serializer_class = RegistrationStatusUpdateSerializer
    permission_classes = [IsParticipant]

    def get_queryset(self):
        return Registration.objects.filter(participant=self.request.user)

    def perform_update(self, serializer):
        serializer.save(status='CANCELLED')


# --- Vues Company ---

class EventRegistrationsView(generics.ListAPIView):
    """La company voit la liste des inscriptions pour un de ses events"""
    serializer_class = RegistrationSerializer
    permission_classes = [IsCompany]

    def get_queryset(self):
        event_id = self.kwargs['event_id']
        event = Event.objects.get(id=event_id)
        if event.company != self.request.user:
            raise PermissionDenied("Vous n'êtes pas l'organisateur de cet événement")
        return Registration.objects.filter(event=event)


class UpdateRegistrationStatusView(generics.UpdateAPIView):
    """La company confirme ou rejette une inscription (mode VALIDATION uniquement)"""
    serializer_class = RegistrationStatusUpdateSerializer
    permission_classes = [IsCompany]

    def get_queryset(self):
        # La company ne peut modifier que les inscriptions de ses propres events
        return Registration.objects.filter(event__company=self.request.user)

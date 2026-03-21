from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import Registration, RegistrationStatus
from .serializers import RegistrationSerializer, RegistrationStatusUpdateSerializer
from events.models import Event
from users.models import UserRole


def _promote_from_waitlist(event):
    """
    Promeut automatiquement le premier participant en liste d'attente
    si une place vient de se libérer. Appelé après chaque annulation/rejet.
    """
    confirmed_count = event.registrations.filter(status=RegistrationStatus.CONFIRMED).count()
    if confirmed_count < event.capacity:
        next_in_line = (
            event.registrations
            .filter(status=RegistrationStatus.WAITLIST)
            .order_by('created_at')
            .first()
        )
        if next_in_line:
            next_in_line.status = RegistrationStatus.CONFIRMED
            next_in_line.save()
            return next_in_line
    return None


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

        # Vérifier la date limite d'inscription
        now = timezone.now()
        if event.registration_deadline and now > event.registration_deadline:
            raise ValidationError("Les inscriptions pour cet événement sont closes.")

        # Vérifier que l'event n'a pas encore commencé
        if now >= event.date_start:
            raise ValidationError("Cet événement a déjà commencé.")

        # Vérifier la capacité
        confirmed_count = event.registrations.filter(status=RegistrationStatus.CONFIRMED).count()
        is_full = confirmed_count >= event.capacity

        if is_full:
            if event.registration_mode == 'AUTO':
                # Event complet en mode AUTO → liste d'attente
                serializer.save(participant=self.request.user, status=RegistrationStatus.WAITLIST)
            else:
                # Event complet en mode VALIDATION → refus
                raise ValidationError("Cet événement est complet.")
        else:
            # Places disponibles → AUTO=CONFIRMED, VALIDATION=PENDING
            initial_status = RegistrationStatus.CONFIRMED if event.registration_mode == 'AUTO' else RegistrationStatus.PENDING
            serializer.save(participant=self.request.user, status=initial_status)


class MyRegistrationsView(generics.ListAPIView):
    """Un participant voit toutes ses inscriptions"""
    serializer_class = RegistrationSerializer
    permission_classes = [IsParticipant]

    def get_queryset(self):
        return (
            Registration.objects
            .filter(participant=self.request.user)
            .select_related('event', 'participant')
        )


class CancelRegistrationView(generics.UpdateAPIView):
    """Un participant annule son inscription"""
    serializer_class = RegistrationStatusUpdateSerializer
    permission_classes = [IsParticipant]

    def get_queryset(self):
        return (
            Registration.objects
            .filter(participant=self.request.user)
            .select_related('event')
        )

    def perform_update(self, serializer):
        instance = serializer.save(status=RegistrationStatus.CANCELLED)
        # Une place vient de se libérer → promouvoir le premier en liste d'attente
        _promote_from_waitlist(instance.event)


# --- Vues Company ---

class EventRegistrationsView(generics.ListAPIView):
    """La company voit la liste des inscriptions pour un de ses events"""
    serializer_class = RegistrationSerializer
    permission_classes = [IsCompany]

    def get_queryset(self):
        event_id = self.kwargs['event_id']
        event = Event.objects.select_related('company').get(id=event_id)
        if event.company != self.request.user:
            raise PermissionDenied("Vous n'êtes pas l'organisateur de cet événement")
        return (
            Registration.objects
            .filter(event=event)
            .select_related('participant', 'event')
        )


class UpdateRegistrationStatusView(generics.UpdateAPIView):
    """La company confirme ou rejette une inscription (mode VALIDATION uniquement)"""
    serializer_class = RegistrationStatusUpdateSerializer
    permission_classes = [IsCompany]

    def get_queryset(self):
        # La company ne peut modifier que les inscriptions de ses propres events
        return (
            Registration.objects
            .filter(event__company=self.request.user)
            .select_related('event', 'participant')
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        # Si la company rejette → promouvoir le premier en liste d'attente
        if instance.status == RegistrationStatus.REJECTED:
            _promote_from_waitlist(instance.event)

import csv
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.views import APIView
from .models import Registration, RegistrationStatus
from .serializers import RegistrationSerializer, RegistrationStatusUpdateSerializer
from events.models import Event
from users.models import UserRole
from emails import send_registration_confirmed, send_registration_rejected


def _promote_from_waitlist(event):
    """
    Promeut automatiquement le premier participant en liste d'attente
    si une place vient de se libérer. Appelé après chaque annulation/rejet.
    Envoie un email de confirmation au participant promu.
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
            send_registration_confirmed(next_in_line, from_waitlist=True)
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
            registration = serializer.save(participant=self.request.user, status=initial_status)
            # Notifier le participant si confirmation immédiate (mode AUTO)
            if initial_status == RegistrationStatus.CONFIRMED:
                send_registration_confirmed(registration)


class MyRegistrationsView(generics.ListAPIView):
    """
    Un participant voit toutes ses inscriptions.
    Filtre optionnel : ?status=CONFIRMED|PENDING|REJECTED|CANCELLED|WAITLIST
    """
    serializer_class = RegistrationSerializer
    permission_classes = [IsParticipant]

    def get_queryset(self):
        qs = (
            Registration.objects
            .filter(participant=self.request.user)
            .select_related('event', 'participant')
        )
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        return qs


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
        # Notifier le participant du changement de statut
        if instance.status == RegistrationStatus.CONFIRMED:
            send_registration_confirmed(instance)
        elif instance.status == RegistrationStatus.REJECTED:
            send_registration_rejected(instance)
            _promote_from_waitlist(instance.event)


class ExportEventRegistrationsView(APIView):
    """Exporte la liste des inscrits d'un event en CSV (Company owner ou Admin)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, event_id):
        try:
            event = Event.objects.select_related('company').get(id=event_id)
        except Event.DoesNotExist:
            raise ValidationError("Événement introuvable.")

        # Seuls la company owner et l'admin peuvent exporter
        is_owner = (request.user.role == UserRole.COMPANY and event.company == request.user)
        is_admin = request.user.is_staff
        if not (is_owner or is_admin):
            raise PermissionDenied("Vous n'êtes pas autorisé à exporter ces données.")

        registrations = (
            Registration.objects
            .filter(event=event)
            .select_related('participant')
            .order_by('status', 'created_at')
        )

        # Préparer la réponse HTTP CSV
        filename = f"inscrits_{event.id}_{event.title[:30].replace(' ', '_')}.csv"
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        # BOM UTF-8 pour compatibilité Excel
        response.write('\ufeff')

        writer = csv.writer(response, delimiter=';')

        # En-tête
        writer.writerow([
            'Prénom', 'Nom', 'Email',
            'Statut', 'Position liste d\'attente',
            'Date d\'inscription',
        ])

        # Lignes
        for reg in registrations:
            p = reg.participant
            writer.writerow([
                p.first_name,
                p.last_name,
                p.email,
                reg.get_status_display(),
                reg.waitlist_position if reg.status == RegistrationStatus.WAITLIST else '',
                reg.created_at.strftime('%d/%m/%Y %H:%M'),
            ])

        return response

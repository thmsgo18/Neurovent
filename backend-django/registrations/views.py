import csv
from django.utils import timezone
from django.http import HttpResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.views import APIView
from .models import Registration, RegistrationStatus
from .serializers import RegistrationSerializer, RegistrationStatusUpdateSerializer
from events.models import Event
from users.models import UserRole
from emails import (
    send_registration_confirmed,
    send_registration_rejected,
    send_registration_removed_by_organizer,
)


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


class IsCompanyOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role == UserRole.COMPANY or request.user.is_staff
        )


# --- Vues Participant ---

class RegisterToEventView(generics.CreateAPIView):
    """Un participant s'inscrit à un event"""
    serializer_class = RegistrationSerializer
    permission_classes = [IsParticipant]

    def perform_create(self, serializer):
        event = serializer.validated_data['event']
        user = self.request.user

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

        # Déterminer le statut cible
        if is_full:
            if event.registration_mode == 'AUTO':
                new_status = RegistrationStatus.WAITLIST
            else:
                raise ValidationError("Cet événement est complet.")
        else:
            new_status = RegistrationStatus.CONFIRMED if event.registration_mode == 'AUTO' else RegistrationStatus.PENDING

        # Réactiver une inscription CANCELLED ou REJECTED si elle existe déjà
        # (évite le crash IntegrityError sur la contrainte unique_together)
        existing = Registration.objects.filter(
            participant=user,
            event=event,
            status__in=[RegistrationStatus.CANCELLED, RegistrationStatus.REJECTED],
        ).first()

        if existing:
            existing.status = new_status
            existing.accessibility_needs = serializer.validated_data.get(
                'accessibility_needs', existing.accessibility_needs
            )
            existing.company_comment = ''
            existing.save()
            registration = existing
            # Indiquer au serializer quelle instance retourner dans la réponse
            serializer.instance = existing
        else:
            registration = serializer.save(participant=user, status=new_status)

        # Notifier le participant si confirmation immédiate (mode AUTO)
        if new_status == RegistrationStatus.CONFIRMED:
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
        event = get_object_or_404(Event.objects.select_related('company'), id=event_id)
        if event.company != self.request.user:
            raise PermissionDenied("Vous n'êtes pas l'organisateur de cet événement")
        return (
            Registration.objects
            .filter(event=event)
            .exclude(status=RegistrationStatus.CANCELLED)
            .select_related('participant', 'event')
        )


class UpdateRegistrationStatusView(generics.UpdateAPIView):
    """La company confirme ou rejette une inscription — Admin peut aussi intervenir"""
    serializer_class = RegistrationStatusUpdateSerializer
    permission_classes = [IsCompanyOrAdmin]

    def get_queryset(self):
        # L'admin voit toutes les inscriptions, la company uniquement celles de ses events
        if self.request.user.is_staff:
            return Registration.objects.select_related('event', 'participant')
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


class RemoveRegistrationView(APIView):
    """La company retire manuellement une inscription active à son event."""
    permission_classes = [IsCompanyOrAdmin]

    def patch(self, request, pk):
        if request.user.is_staff:
            registration = get_object_or_404(
                Registration.objects.select_related('event', 'participant', 'event__company'),
                pk=pk,
            )
        else:
            registration = get_object_or_404(
                Registration.objects.select_related('event', 'participant', 'event__company'),
                pk=pk,
                event__company=request.user,
            )

        if registration.status == RegistrationStatus.CANCELLED:
            raise ValidationError("Cette inscription a déjà été retirée.")

        registration.status = RegistrationStatus.CANCELLED
        registration.company_comment = (
            request.data.get('company_comment')
            or "Registration removed by the organizer."
        )
        registration.save(update_fields=['status', 'company_comment', 'updated_at'])

        send_registration_removed_by_organizer(registration)
        _promote_from_waitlist(registration.event)

        return HttpResponse(status=204)


class ExportEventRegistrationsView(APIView):
    """Exporte la liste des inscrits d'un event en CSV (Company owner ou Admin)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, event_id):
        event = get_object_or_404(Event.objects.select_related('company'), id=event_id)

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
            'Besoins accessibilité', 'Commentaire organisateur',
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
                reg.accessibility_needs,
                reg.company_comment,
                reg.created_at.strftime('%d/%m/%Y %H:%M'),
            ])

        return response

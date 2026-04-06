from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from emails import (
    send_event_access_revealed,
    send_event_organizer_digest,
    send_event_reminder,
)
from events.models import Event, EventStatus
from registrations.models import RegistrationStatus


class Command(BaseCommand):
    help = (
        "Envoie les notifications planifiées liées aux événements "
        "(rappels participants, révélations d'accès et récapitulatifs organisateur)."
    )

    def handle(self, *args, **options):
        now = timezone.now()
        upcoming_events = (
            Event.objects
            .filter(status=EventStatus.PUBLISHED, date_end__gt=now)
            .select_related('company')
            .prefetch_related('registrations__participant')
        )

        reminder_count = 0
        reveal_count = 0
        digest_count = 0

        for event in upcoming_events:
            confirmed_registrations = [
                reg for reg in event.registrations.all()
                if reg.status == RegistrationStatus.CONFIRMED
            ]
            delta = event.date_start - now
            update_fields = []

            reminder_key = None
            reminder_field = None
            if timedelta(0) < delta <= timedelta(hours=3) and event.reminder_3h_sent_at is None:
                reminder_key = '3h'
                reminder_field = 'reminder_3h_sent_at'
            elif timedelta(hours=3) < delta <= timedelta(days=1) and event.reminder_1d_sent_at is None:
                reminder_key = '1d'
                reminder_field = 'reminder_1d_sent_at'
            elif timedelta(days=1) < delta <= timedelta(days=7) and event.reminder_7d_sent_at is None:
                reminder_key = '7d'
                reminder_field = 'reminder_7d_sent_at'

            if reminder_key and confirmed_registrations:
                for registration in confirmed_registrations:
                    send_event_reminder(registration, reminder_key)
                    reminder_count += 1
                setattr(event, reminder_field, now)
                update_fields.append(reminder_field)

            reveal_targets = []
            if (
                event.format in ['ONSITE', 'HYBRID']
                and event.address_visibility == 'PARTIAL'
                and event.address_reveal_date
                and now >= event.address_reveal_date
                and event.address_reveal_email_sent_at is None
                and event.address_full
            ):
                reveal_targets.append('address')
            if (
                event.format in ['ONLINE', 'HYBRID']
                and event.online_visibility == 'PARTIAL'
                and event.online_reveal_date
                and now >= event.online_reveal_date
                and event.online_reveal_email_sent_at is None
                and event.online_link
            ):
                reveal_targets.append('online')

            if reveal_targets and confirmed_registrations:
                for registration in confirmed_registrations:
                    send_event_access_revealed(registration, reveal_targets)
                    reveal_count += 1
                if 'address' in reveal_targets:
                    event.address_reveal_email_sent_at = now
                    update_fields.append('address_reveal_email_sent_at')
                if 'online' in reveal_targets:
                    event.online_reveal_email_sent_at = now
                    update_fields.append('online_reveal_email_sent_at')

            if (
                timedelta(0) < delta <= timedelta(days=1)
                and event.organizer_digest_sent_at is None
            ):
                send_event_organizer_digest(event)
                digest_count += 1
                event.organizer_digest_sent_at = now
                update_fields.append('organizer_digest_sent_at')

            if update_fields:
                event.save(update_fields=sorted(set(update_fields)))

        self.stdout.write(
            self.style.SUCCESS(
                "Notifications envoyées "
                f"(rappels={reminder_count}, revelations={reveal_count}, recaps={digest_count})"
            )
        )

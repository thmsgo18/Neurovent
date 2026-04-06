from django.utils import timezone

from emails import send_event_capacity_alert
from .models import EventStatus


NOTIFICATION_SNAPSHOT_FIELDS = [
    'date_start',
    'date_end',
    'address_full',
    'address_city',
    'address_country',
    'address_visibility',
    'address_reveal_date',
    'online_platform',
    'online_link',
    'online_visibility',
    'online_reveal_date',
]


def capture_event_notification_snapshot(event):
    return {field: getattr(event, field) for field in NOTIFICATION_SNAPSHOT_FIELDS}


def get_event_update_messages(previous, event):
    changes = []

    if previous['date_start'] != event.date_start or previous['date_end'] != event.date_end:
        changes.append(
            "La date ou l'horaire a été mis à jour "
            f"(nouveau créneau : {event.date_start.strftime('%d/%m/%Y à %H:%M')} "
            f"→ {event.date_end.strftime('%d/%m/%Y à %H:%M')})."
        )

    address_fields = ['address_full', 'address_city', 'address_country']
    if any(previous[field] != getattr(event, field) for field in address_fields):
        changes.append("Le lieu de l'événement a été mis à jour.")

    online_fields = ['online_platform', 'online_link']
    if any(previous[field] != getattr(event, field) for field in online_fields):
        changes.append("Les informations de connexion en ligne ont été mises à jour.")

    return changes


def reset_scheduled_notification_flags(event, previous):
    update_fields = []

    if previous['date_start'] != event.date_start:
        for field in [
            'reminder_7d_sent_at',
            'reminder_1d_sent_at',
            'reminder_3h_sent_at',
            'organizer_digest_sent_at',
        ]:
            if getattr(event, field) is not None:
                setattr(event, field, None)
                update_fields.append(field)

    address_related_fields = [
        'address_full',
        'address_city',
        'address_country',
        'address_visibility',
        'address_reveal_date',
    ]
    if any(previous[field] != getattr(event, field) for field in address_related_fields):
        if event.address_reveal_email_sent_at is not None:
            event.address_reveal_email_sent_at = None
            update_fields.append('address_reveal_email_sent_at')

    online_related_fields = [
        'online_platform',
        'online_link',
        'online_visibility',
        'online_reveal_date',
    ]
    if any(previous[field] != getattr(event, field) for field in online_related_fields):
        if event.online_reveal_email_sent_at is not None:
            event.online_reveal_email_sent_at = None
            update_fields.append('online_reveal_email_sent_at')

    return update_fields


def notify_event_capacity_milestones(event):
    if event.status != EventStatus.PUBLISHED or event.unlimited_capacity or not event.capacity:
        update_fields = []
        for field in ['almost_full_notified_at', 'full_notified_at']:
            if getattr(event, field) is not None:
                setattr(event, field, None)
                update_fields.append(field)
        if update_fields:
            event.save(update_fields=update_fields)
        return

    from registrations.models import RegistrationStatus

    confirmed_count = event.registrations.filter(status=RegistrationStatus.CONFIRMED).count()
    fill_ratio = confirmed_count / event.capacity
    now = timezone.now()
    update_fields = []

    if confirmed_count < event.capacity and event.full_notified_at is not None:
        event.full_notified_at = None
        update_fields.append('full_notified_at')
    if fill_ratio < 0.8 and event.almost_full_notified_at is not None:
        event.almost_full_notified_at = None
        update_fields.append('almost_full_notified_at')

    if confirmed_count >= event.capacity:
        if event.full_notified_at is None:
            send_event_capacity_alert(event, 'FULL')
            event.full_notified_at = now
            update_fields.append('full_notified_at')
    elif fill_ratio >= 0.8 and event.almost_full_notified_at is None:
        send_event_capacity_alert(event, 'ALMOST_FULL')
        event.almost_full_notified_at = now
        update_fields.append('almost_full_notified_at')

    if update_fields:
        event.save(update_fields=update_fields)

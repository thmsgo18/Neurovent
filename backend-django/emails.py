"""
emails.py — Centralisation de tous les emails de la plateforme Neurovent.

Toutes les fonctions d'envoi d'email sont ici.
Les vues importent depuis ce fichier et n'ont aucune logique d'email en dur.

Architecture prête pour le HTML :
  Chaque fonction accepte un paramètre optionnel `html_message`.
  Pour ajouter des templates HTML plus tard, il suffit de générer le HTML
  et de le passer à _send() — aucune autre modification nécessaire.

Fonctions disponibles :
  - send_account_created(user)
  - send_registration_confirmed(registration, from_waitlist=False)
  - send_registration_pending(registration)
  - send_registration_waitlist(registration)
  - send_registration_rejected(registration)
  - send_registration_removed_by_organizer(registration)
  - send_event_cancelled(event)
  - send_event_reminder(registration, reminder_key)
  - send_event_updated(registration, changes)
  - send_event_access_revealed(registration, reveal_targets)
  - send_event_capacity_alert(event, alert_type)
  - send_event_organizer_digest(event)
  - send_password_reset(email, reset_link)
  - send_company_verification_result(company)
"""

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────
#  Helpers internes
# ─────────────────────────────────────────

def _is_valid_recipient(email):
    """
    Vérifie que l'adresse email est valide pour l'envoi.
    Exclut les comptes anonymisés (suppression RGPD).
    """
    return bool(email) and 'deleted.neurovent.com' not in email


def _send(subject, text_message, recipient_email, html_message=None):
    """
    Envoie un email via EmailMultiAlternatives.
    Supporte le texte brut uniquement (html_message=None) ou texte + HTML.
    Ajouter le HTML plus tard : passer html_message=<contenu_html>.
    """
    if not _is_valid_recipient(recipient_email):
        return
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        if html_message:
            msg.attach_alternative(html_message, "text/html")
        msg.send()
    except Exception:
        logger.exception(
            "Email delivery failed",
            extra={
                "recipient_email": recipient_email,
                "email_subject": subject,
                "email_backend": settings.EMAIL_BACKEND,
            },
        )
        if not getattr(settings, 'EMAIL_FAIL_SILENTLY', False):
            raise


def _event_detail_items(event, force_full_details=False):
    format_labels = {
        'ONSITE': 'On-site',
        'ONLINE': 'Online',
        'HYBRID': 'Hybrid',
    }
    items = [
        ('Title', event.title),
        ('Starts', event.date_start.strftime('%d/%m/%Y at %H:%M')),
        ('Ends', event.date_end.strftime('%d/%m/%Y at %H:%M')),
        ('Format', format_labels.get(event.format, event.get_format_display())),
    ]

    if event.format in ['ONSITE', 'HYBRID']:
        visible_address = (
            {
                'city': event.address_city,
                'country': event.address_country,
                'full': event.address_full,
            }
            if force_full_details else (event.visible_address or {})
        )
        if visible_address.get('full'):
            items.append(('Address', visible_address['full']))
        elif visible_address.get('city'):
            location = visible_address['city']
            if visible_address.get('country'):
                location = f"{location}, {visible_address['country']}"
            items.append(('City', location))
            if event.address_visibility == 'PARTIAL':
                items.append(('Full address', 'Shared later'))

    if event.format in ['ONLINE', 'HYBRID']:
        visible_online = (
            {
                'platform': event.online_platform,
                'link': event.online_link,
            }
            if force_full_details else (event.visible_online or {})
        )
        if visible_online.get('platform'):
            items.append(('Platform', visible_online['platform']))
        if visible_online.get('link'):
            items.append(('Link', visible_online['link']))
        elif event.online_visibility == 'PARTIAL' and visible_online.get('platform'):
            items.append(('Full link', 'Shared later'))

    return items


def _render_email_html(
    *,
    preheader,
    eyebrow,
    title,
    greeting_name=None,
    intro_lines=None,
    detail_title=None,
    detail_items=None,
    bullet_title=None,
    bullet_items=None,
    stats_title=None,
    stats_items=None,
    cta_label=None,
    cta_url=None,
    note_lines=None,
    tone='primary',
):
    palette_map = {
        'primary': {
            'accent': '#69ead7',
            'accent_soft': 'rgba(105, 234, 215, 0.16)',
            'secondary': '#ffd56b',
            'bg': '#0d1522',
            'bg_alt': '#152033',
            'surface': '#182438',
            'surface_high': '#1f2d44',
            'surface_raised': '#2b3d5a',
            'border': 'rgba(255, 255, 255, 0.16)',
            'border_strong': 'rgba(255, 255, 255, 0.28)',
            'text': '#fbfcff',
            'text_muted': '#c6d0e3',
            'text_dim': '#a0aec8',
            'button': '#69ead7',
            'button_text': '#08111b',
        },
        'success': {
            'accent': '#10B981',
            'accent_soft': 'rgba(16, 185, 129, 0.16)',
            'secondary': '#69ead7',
            'bg': '#0d1522',
            'bg_alt': '#152033',
            'surface': '#182438',
            'surface_high': '#1f2d44',
            'surface_raised': '#1d3a36',
            'border': 'rgba(255, 255, 255, 0.16)',
            'border_strong': 'rgba(255, 255, 255, 0.28)',
            'text': '#fbfcff',
            'text_muted': '#c6d0e3',
            'text_dim': '#a0aec8',
            'button': '#10B981',
            'button_text': '#f3fffb',
        },
        'warning': {
            'accent': '#ffd56b',
            'accent_soft': 'rgba(255, 213, 107, 0.16)',
            'secondary': '#69ead7',
            'bg': '#0d1522',
            'bg_alt': '#152033',
            'surface': '#182438',
            'surface_high': '#1f2d44',
            'surface_raised': '#3f3520',
            'border': 'rgba(255, 255, 255, 0.16)',
            'border_strong': 'rgba(255, 255, 255, 0.28)',
            'text': '#fbfcff',
            'text_muted': '#d7d2c2',
            'text_dim': '#b8b2a0',
            'button': '#ffd56b',
            'button_text': '#1d1606',
        },
        'danger': {
            'accent': '#EF4444',
            'accent_soft': 'rgba(239, 68, 68, 0.16)',
            'secondary': '#ffd56b',
            'bg': '#0d1522',
            'bg_alt': '#152033',
            'surface': '#182438',
            'surface_high': '#1f2d44',
            'surface_raised': '#3a2428',
            'border': 'rgba(255, 255, 255, 0.16)',
            'border_strong': 'rgba(255, 255, 255, 0.28)',
            'text': '#fbfcff',
            'text_muted': '#dbc9d1',
            'text_dim': '#c6a8b1',
            'button': '#EF4444',
            'button_text': '#fff6f6',
        },
    }
    palette = palette_map.get(tone, palette_map['primary'])

    return render_to_string(
        'emails/base.html',
        {
            'brand_name': 'Neurovent',
            'preheader': preheader,
            'eyebrow': eyebrow,
            'title': title,
            'greeting_name': greeting_name,
            'intro_lines': intro_lines or [],
            'detail_title': detail_title,
            'detail_items': detail_items or [],
            'bullet_title': bullet_title,
            'bullet_items': bullet_items or [],
            'stats_title': stats_title,
            'stats_items': stats_items or [],
            'cta_label': cta_label,
            'cta_url': cta_url,
            'note_lines': note_lines or [],
            'palette': palette,
            'reply_to_email': settings.DEFAULT_FROM_EMAIL,
        },
    )


def _send_branded_email(
    subject,
    text_message,
    recipient_email,
    *,
    preheader,
    eyebrow,
    title,
    greeting_name=None,
    intro_lines=None,
    detail_title=None,
    detail_items=None,
    bullet_title=None,
    bullet_items=None,
    stats_title=None,
    stats_items=None,
    cta_label=None,
    cta_url=None,
    note_lines=None,
    tone='primary',
):
    html_message = _render_email_html(
        preheader=preheader,
        eyebrow=eyebrow,
        title=title,
        greeting_name=greeting_name,
        intro_lines=intro_lines,
        detail_title=detail_title,
        detail_items=detail_items,
        bullet_title=bullet_title,
        bullet_items=bullet_items,
        stats_title=stats_title,
        stats_items=stats_items,
        cta_label=cta_label,
        cta_url=cta_url,
        note_lines=note_lines,
        tone=tone,
    )
    _send(
        subject=subject,
        text_message=text_message,
        recipient_email=recipient_email,
        html_message=html_message,
    )


def _format_event_details(event, force_full_details=False):
    """
    Construit le bloc de détails d'un événement pour les emails.
    Inclut les infos de lieu/lien selon le format (ONSITE / ONLINE / HYBRID).
    """
    lines = [
        f"  Title   : {event.title}",
        f"  Starts  : {event.date_start.strftime('%d/%m/%Y at %H:%M')}",
        f"  Ends    : {event.date_end.strftime('%d/%m/%Y at %H:%M')}",
        f"  Format  : {dict(ONSITE='On-site', ONLINE='Online', HYBRID='Hybrid').get(event.format, event.get_format_display())}",
    ]

    # Infos lieu (ONSITE + HYBRID)
    if event.format in ['ONSITE', 'HYBRID']:
        visible_address = (
            {
                'city': event.address_city,
                'country': event.address_country,
                'full': event.address_full,
                'is_full_revealed': True,
            }
            if force_full_details else (event.visible_address or {})
        )
        if visible_address.get('full'):
            lines.append(f"  Address : {visible_address['full']}")
        elif visible_address.get('city'):
            lines.append(
                f"  City    : {visible_address['city']}"
                f"{f', {visible_address.get('country')}' if visible_address.get('country') else ''}"
            )
            if event.address_visibility == 'PARTIAL':
                lines.append("  Full address : shared later")

    # Infos lien distanciel (ONLINE + HYBRID)
    if event.format in ['ONLINE', 'HYBRID']:
        visible_online = (
            {
                'platform': event.online_platform,
                'link': event.online_link,
                'is_link_revealed': True,
            }
            if force_full_details else (event.visible_online or {})
        )
        if visible_online.get('platform'):
            lines.append(f"  Platform : {visible_online['platform']}")
        if visible_online.get('link'):
            lines.append(f"  Link    : {visible_online['link']}")
        elif event.online_visibility == 'PARTIAL' and visible_online.get('platform'):
            lines.append("  Full link : shared later")

    return "\n".join(lines)


def _event_link(event):
    return f"{settings.FRONTEND_URL}/events/{event.id}/"


def _format_practical_instructions(event):
    if event.format == 'ONSITE':
        return (
            "Practical note: please arrive 10 minutes early and keep this message handy on the day."
        )
    if event.format == 'ONLINE':
        return (
            "Practical note: check your internet connection and join the platform a few minutes before the start."
        )
    return (
        "Practical note: check both your location details and your connection link, then plan to join a few minutes early."
    )


# ─────────────────────────────────────────
#  Comptes
# ─────────────────────────────────────────

def send_account_created(user):
    """
    Email envoyé après la création d'un compte participant.
    Les comptes company ont déjà un email dédié de vérification.
    """
    login_url = f"{settings.FRONTEND_URL}/login"
    first_name = user.first_name or "there"

    _send_branded_email(
        subject="Your Neurovent account has been created",
        text_message=(
            f"Hello {first_name},\n\n"
            f"Your Neurovent account has been created successfully.\n\n"
            f"You can now sign in, complete your profile and register for events on the platform.\n\n"
            f"Sign in: {login_url}\n\n"
            f"Welcome to Neurovent.\n\n"
            f"- The Neurovent team"
        ),
        recipient_email=user.email,
        preheader="Your Neurovent account is ready.",
        eyebrow="Account created",
        title="Welcome to Neurovent",
        greeting_name=first_name,
        intro_lines=[
            "Your account has been created successfully.",
            "You can now sign in, complete your profile and start exploring events.",
        ],
        cta_label="Sign in",
        cta_url=login_url,
        note_lines=["We are happy to have you on board."],
        tone='success',
    )


# ─────────────────────────────────────────
#  Inscriptions
# ─────────────────────────────────────────

def send_registration_confirmed(registration, from_waitlist=False):
    """
    Email envoyé au participant quand son inscription est confirmée.

    Paramètres :
      from_waitlist=True  → le participant était en liste d'attente et vient d'être promu
      from_waitlist=False → confirmation directe (mode AUTO ou validation manuelle)
    """
    participant = registration.participant
    event = registration.event
    event_link = _event_link(event)

    if from_waitlist:
        intro = (
            f"Great news! You were on the waiting list for \"{event.title}\", "
            f"and a spot just opened up. Your registration is now confirmed.\n"
        )
    else:
        intro = f"Your registration for \"{event.title}\" is confirmed.\n"

    details = _format_event_details(event)

    _send_branded_email(
        subject=f"Registration confirmed — {event.title}",
        text_message=(
            f"Hello {participant.first_name},\n\n"
            f"{intro}\n"
            f"--- Event details ---\n"
            f"{details}\n\n"
            f"View event: {event_link}\n\n"
            f"See you soon on Neurovent.\n\n"
            f"- The Neurovent team"
        ),
        recipient_email=participant.email,
        preheader=f"Your spot for {event.title} is confirmed.",
        eyebrow="Registration confirmed",
        title="Your registration is confirmed",
        greeting_name=participant.first_name,
        intro_lines=[
            intro.strip(),
            "You will find all the key information you need below.",
        ],
        detail_title="Event details",
        detail_items=_event_detail_items(event),
        cta_label="View event",
        cta_url=event_link,
        note_lines=["We look forward to welcoming you on Neurovent."],
        tone='success',
    )


def send_registration_pending(registration):
    """
    Email envoyé au participant quand son inscription est reçue
    mais qu'elle doit encore être validée par l'organisateur.
    """
    participant = registration.participant
    event = registration.event

    _send_branded_email(
        subject=f"Registration received — pending review — {event.title}",
        text_message=(
            f"Hello {participant.first_name},\n\n"
            f"Your registration request for \"{event.title}\" has been received.\n\n"
            f"It is currently pending organizer review. "
            f"You will receive another email as soon as a decision is made.\n\n"
            f"--- Event details ---\n"
            f"{_format_event_details(event)}\n\n"
            f"View event: {_event_link(event)}\n\n"
            f"- The Neurovent team"
        ),
        recipient_email=participant.email,
        preheader=f"Your registration request for {event.title} is pending review.",
        eyebrow="Manual review",
        title="Your request has been received",
        greeting_name=participant.first_name,
        intro_lines=[
            f"Your registration request for \"{event.title}\" has been received.",
            "It is currently pending organizer review.",
        ],
        detail_title="Event details",
        detail_items=_event_detail_items(event),
        cta_label="View event",
        cta_url=_event_link(event),
        note_lines=["You will automatically receive another email as soon as a decision is made."],
        tone='warning',
    )


def send_registration_waitlist(registration):
    """
    Email envoyé au participant quand il est placé en liste d'attente.
    """
    participant = registration.participant
    event = registration.event
    position = registration.waitlist_position or "?"

    _send_branded_email(
        subject=f"You are on the waiting list — {event.title}",
        text_message=(
            f"Hello {participant.first_name},\n\n"
            f"The event \"{event.title}\" is currently full. "
            f"Your registration has been placed on the waiting list.\n\n"
            f"Your current position: {position}\n\n"
            f"If a spot becomes available, you will automatically receive another email.\n\n"
            f"--- Event details ---\n"
            f"{_format_event_details(event)}\n\n"
            f"View event: {_event_link(event)}\n\n"
            f"- The Neurovent team"
        ),
        recipient_email=participant.email,
        preheader=f"You are currently on the waiting list for {event.title}.",
        eyebrow="Waiting list",
        title="You are on the waiting list",
        greeting_name=participant.first_name,
        intro_lines=[
            f"The event \"{event.title}\" is currently full.",
            f"Your current position on the waiting list: {position}.",
        ],
        detail_title="Event details",
        detail_items=_event_detail_items(event),
        cta_label="Track event",
        cta_url=_event_link(event),
        note_lines=["If a spot opens up, we will automatically send you a confirmation email."],
        tone='warning',
    )


def send_registration_rejected(registration):
    """
    Email envoyé au participant quand son inscription est rejetée par la company
    (mode VALIDATION uniquement).
    """
    participant = registration.participant
    event = registration.event
    browse_link = f"{settings.FRONTEND_URL}/events/"

    _send_branded_email(
        subject=f"Registration not selected — {event.title}",
        text_message=(
            f"Hello {participant.first_name},\n\n"
            f"We are sorry to let you know that your registration "
            f"for \"{event.title}\" (on {event.date_start.strftime('%d/%m/%Y')}) "
            f"was not selected by the organizer.\n\n"
            f"You can browse other events available on Neurovent:\n"
            f"{browse_link}\n\n"
            f"- The Neurovent team"
        ),
        recipient_email=participant.email,
        preheader=f"Your registration request for {event.title} was not selected.",
        eyebrow="Registration update",
        title="Your request was not selected",
        greeting_name=participant.first_name,
        intro_lines=[
            f"We are sorry to let you know that your registration for \"{event.title}\" was not selected.",
            "You can still explore other events that match your interests.",
        ],
        detail_title="Event summary",
        detail_items=_event_detail_items(event),
        cta_label="Explore events",
        cta_url=browse_link,
        tone='danger',
    )


def send_registration_removed_by_organizer(registration):
    """
    Email envoyé au participant quand l'organisateur retire manuellement
    son inscription à un événement.
    """
    participant = registration.participant
    event = registration.event
    browse_link = f"{settings.FRONTEND_URL}/events/"

    _send_branded_email(
        subject=f"Registration removed by organizer — {event.title}",
        text_message=(
            f"Hello {participant.first_name},\n\n"
            f"The organizer has removed your registration for \"{event.title}\", "
            f"scheduled for {event.date_start.strftime('%d/%m/%Y at %H:%M')}.\n\n"
            f"If you believe this is a mistake, please contact the event organizer directly.\n\n"
            f"You can discover other events on Neurovent:\n"
            f"{browse_link}\n\n"
            f"- The Neurovent team"
        ),
        recipient_email=participant.email,
        preheader=f"The organizer removed your registration for {event.title}.",
        eyebrow="Registration removed",
        title="Your registration has been removed",
        greeting_name=participant.first_name,
        intro_lines=[
            f"The organizer has removed your registration for \"{event.title}\".",
            "If you believe this is a mistake, please contact the organizer directly.",
        ],
        detail_title="Event summary",
        detail_items=_event_detail_items(event),
        cta_label="View other events",
        cta_url=browse_link,
        tone='danger',
    )


# ─────────────────────────────────────────
#  Événements
# ─────────────────────────────────────────

def send_event_cancelled(event):
    """
    Notifie par email tous les inscrits actifs (CONFIRMED, PENDING, WAITLIST)
    que l'événement a été annulé par l'organisateur.
    Appelé quand le statut de l'event passe à CANCELLED.
    """
    from registrations.models import Registration, RegistrationStatus

    registrations = (
        Registration.objects
        .filter(
            event=event,
            status__in=[
                RegistrationStatus.CONFIRMED,
                RegistrationStatus.PENDING,
                RegistrationStatus.WAITLIST,
            ]
        )
        .select_related('participant')
    )

    browse_link = f"{settings.FRONTEND_URL}/events/"

    for reg in registrations:
        _send_branded_email(
            subject=f"Event cancelled — {event.title}",
            text_message=(
                f"Hello {reg.participant.first_name},\n\n"
                f"We regret to inform you that the event "
                f"\"{event.title}\" scheduled for {event.date_start.strftime('%d/%m/%Y at %H:%M')} "
                f"has been cancelled by the organizer.\n\n"
                f"Your registration has been automatically cancelled.\n\n"
                f"Other events are available on Neurovent:\n"
                f"{browse_link}\n\n"
                f"- The Neurovent team"
            ),
            recipient_email=reg.participant.email,
            preheader=f"The event {event.title} has been cancelled.",
            eyebrow="Event cancelled",
            title="The event has been cancelled",
            greeting_name=reg.participant.first_name,
            intro_lines=[
                f"We regret to inform you that the event \"{event.title}\" has been cancelled by the organizer.",
                "Your registration has been automatically cancelled.",
            ],
            detail_title="Event summary",
            detail_items=_event_detail_items(event),
            cta_label="Discover other events",
            cta_url=browse_link,
            tone='danger',
        )


def send_event_reminder(registration, reminder_key):
    """
    Rappel envoyé avant l'événement aux participants confirmés.
    reminder_key ∈ {'7d', '1d', '3h'}
    """
    participant = registration.participant
    event = registration.event
    labels = {
        '7d': ("in one week", "D-7"),
        '1d': ("tomorrow", "D-1"),
        '3h': ("in a few hours", "H-3"),
    }
    timing_text, badge = labels[reminder_key]

    _send_branded_email(
        subject=f"Reminder {badge} — {event.title}",
        text_message=(
            f"Hello {participant.first_name},\n\n"
            f"Just a reminder: the event \"{event.title}\" starts {timing_text}.\n\n"
            f"--- Event details ---\n"
            f"{_format_event_details(event)}\n\n"
            f"{_format_practical_instructions(event)}\n\n"
            f"View event: {_event_link(event)}\n\n"
            f"- The Neurovent team"
        ),
        recipient_email=participant.email,
        preheader=f"Reminder {badge} for your participation in {event.title}.",
        eyebrow=f"Reminder {badge}",
        title="Your event is coming up",
        greeting_name=participant.first_name,
        intro_lines=[
            f"Just a reminder: the event \"{event.title}\" starts {timing_text}.",
            _format_practical_instructions(event),
        ],
        detail_title="Practical information",
        detail_items=_event_detail_items(event),
        cta_label="View event",
        cta_url=_event_link(event),
        tone='primary',
    )


def send_event_updated(registration, changes):
    """
    Informe un participant confirmé que les informations pratiques
    de l'événement ont été modifiées.
    """
    participant = registration.participant
    event = registration.event
    change_lines = "\n".join(f"  - {change}" for change in changes)

    _send_branded_email(
        subject=f"Important update — {event.title}",
        text_message=(
            f"Hello {participant.first_name},\n\n"
            f"The information for \"{event.title}\" has been updated.\n\n"
            f"Main changes:\n"
            f"{change_lines}\n\n"
            f"--- Updated details ---\n"
            f"{_format_event_details(event)}\n\n"
            f"View event: {_event_link(event)}\n\n"
            f"- The Neurovent team"
        ),
        recipient_email=participant.email,
        preheader=f"Important information has changed for {event.title}.",
        eyebrow="Event update",
        title="Some information has changed",
        greeting_name=participant.first_name,
        intro_lines=[
            f"The information for \"{event.title}\" has been updated.",
        ],
        bullet_title="Main changes",
        bullet_items=changes,
        detail_title="Updated details",
        detail_items=_event_detail_items(event),
        cta_label="View event",
        cta_url=_event_link(event),
        tone='warning',
    )


def send_event_access_revealed(registration, reveal_targets):
    """
    Envoie les informations complètes devenues visibles
    (adresse complète et/ou lien visio) aux participants confirmés.
    """
    participant = registration.participant
    event = registration.event

    readable_targets = []
    if 'address' in reveal_targets:
        readable_targets.append("the full address")
    if 'online' in reveal_targets:
        readable_targets.append("the access link")

    targets_text = " and ".join(readable_targets)

    _send_branded_email(
        subject=f"Practical information available — {event.title}",
        text_message=(
            f"Hello {participant.first_name},\n\n"
            f"Good news: {targets_text} for \"{event.title}\" "
            f"is now available.\n\n"
            f"--- Full event details ---\n"
            f"{_format_event_details(event, force_full_details=True)}\n\n"
            f"View event: {_event_link(event)}\n\n"
            f"- The Neurovent team"
        ),
        recipient_email=participant.email,
        preheader=f"Practical information for {event.title} is now available.",
        eyebrow="Information released",
        title="Your practical information is ready",
        greeting_name=participant.first_name,
        intro_lines=[
            f"Good news: {targets_text} for \"{event.title}\" is now available.",
        ],
        detail_title="Full event details",
        detail_items=_event_detail_items(event, force_full_details=True),
        cta_label="View event",
        cta_url=_event_link(event),
        tone='success',
    )


def send_event_capacity_alert(event, alert_type):
    """
    Alerte l'organisateur quand l'événement est bientôt complet ou complet.
    """
    from registrations.models import RegistrationStatus

    confirmed_count = event.registrations.filter(status=RegistrationStatus.CONFIRMED).count()
    waitlist_count = event.registrations.filter(status=RegistrationStatus.WAITLIST).count()
    remaining = max(event.capacity - confirmed_count, 0)

    if alert_type == 'FULL':
        subject = f"Event full — {event.title}"
        intro = (
            f"Your event \"{event.title}\" is now full.\n\n"
            f"Confirmed attendees: {confirmed_count}/{event.capacity}\n"
            f"Waiting list: {waitlist_count}"
        )
    else:
        subject = f"Event almost full — {event.title}"
        intro = (
            f"Your event \"{event.title}\" is approaching maximum capacity.\n\n"
            f"Confirmed attendees: {confirmed_count}/{event.capacity}\n"
            f"Remaining spots: {remaining}"
        )

    _send_branded_email(
        subject=subject,
        text_message=(
            f"Hello,\n\n"
            f"{intro}\n\n"
            f"Open event: {_event_link(event)}\n\n"
            f"- The Neurovent team"
        ),
        recipient_email=event.company.recovery_email,
        preheader=subject,
        eyebrow="Capacity alert",
        title=subject,
        intro_lines=[intro.replace('\n\n', '\n')],
        stats_title="Current status",
        stats_items=[
            ('Confirmed attendees', f"{confirmed_count}/{event.capacity}"),
            ('Remaining spots', str(remaining)),
            ('Waiting list', str(waitlist_count)),
        ],
        cta_label="Open event",
        cta_url=_event_link(event),
        tone='warning' if alert_type != 'FULL' else 'success',
    )


def send_event_organizer_digest(event):
    """
    Envoie un récapitulatif organisateur avant l'événement.
    """
    from registrations.models import RegistrationStatus

    active_registrations = list(
        event.registrations
        .filter(
            status__in=[
                RegistrationStatus.CONFIRMED,
                RegistrationStatus.PENDING,
                RegistrationStatus.WAITLIST,
            ]
        )
        .select_related('participant')
    )

    confirmed_count = sum(1 for reg in active_registrations if reg.status == RegistrationStatus.CONFIRMED)
    pending_count = sum(1 for reg in active_registrations if reg.status == RegistrationStatus.PENDING)
    waitlist_count = sum(1 for reg in active_registrations if reg.status == RegistrationStatus.WAITLIST)
    accessibility_entries = [
        (
            f"{reg.participant.first_name} {reg.participant.last_name}".strip() or reg.participant.email,
            reg.accessibility_needs.strip(),
        )
        for reg in active_registrations
        if reg.accessibility_needs.strip()
    ]
    if accessibility_entries:
        accessibility_block = "\n".join(
            f"  - {name} : {needs}" for name, needs in accessibility_entries
        )
    else:
        accessibility_block = "  - No specific accessibility needs reported"

    _send_branded_email(
        subject=f"Pre-event organizer summary — {event.title}",
        text_message=(
            f"Hello,\n\n"
            f"Here is your summary before the event \"{event.title}\".\n\n"
            f"--- Attendance ---\n"
            f"  Confirmed attendees : {confirmed_count}\n"
            f"  Pending review      : {pending_count}\n"
            f"  Waiting list        : {waitlist_count}\n\n"
            f"--- Accessibility needs ---\n"
            f"{accessibility_block}\n\n"
            f"View event: {_event_link(event)}\n\n"
            f"- The Neurovent team"
        ),
        recipient_email=event.company.recovery_email,
        preheader=f"Your organizer summary for {event.title} is ready.",
        eyebrow="Organizer summary",
        title="Prepare your event with confidence",
        intro_lines=[
            f"Here is your summary before the event \"{event.title}\".",
        ],
        detail_title="Event details",
        detail_items=_event_detail_items(event),
        stats_title="Attendance",
        stats_items=[
            ('Confirmed attendees', str(confirmed_count)),
            ('Pending review', str(pending_count)),
            ('Waiting list', str(waitlist_count)),
        ],
        bullet_title="Accessibility needs",
        bullet_items=[f"{name}: {needs}" for name, needs in accessibility_entries] if accessibility_entries else ["No specific accessibility needs reported"],
        cta_label="View event",
        cta_url=_event_link(event),
        tone='primary',
    )


# ─────────────────────────────────────────
#  Authentification
# ─────────────────────────────────────────

def send_company_verification_result(company):
    """
    Notifie la company du résultat de la vérification SIRENE.
    Envoyé à recovery_email (seul email disponible pour les companies).
      - VERIFIED      → confirmation immédiate, accès complet
      - NEEDS_REVIEW  → en attente de révision manuelle
      - REJECTED      → demande refusée avec explication
    """
    email = company.recovery_email
    name = company.company_name
    status = company.verification_status

    if status == 'VERIFIED':
        subject = "Organization account verified — Neurovent"
        body = (
            f"Hello,\n\n"
            f"Good news. Your organization account \"{name}\" has been automatically verified "
            f"through the SIRENE registry.\n\n"
            f"You can now create and publish events on Neurovent.\n\n"
            f"- The Neurovent team"
        )
    elif status == 'NEEDS_REVIEW':
        subject = "Your organization verification is in progress — Neurovent"
        body = (
            f"Hello,\n\n"
            f"Your organization account request for \"{name}\" is currently under manual review "
            f"by our team.\n\n"
            f"This process usually takes 1 to 2 business days. You will receive an email "
            f"as soon as a decision is made.\n\n"
            f"If your file is incomplete, you will be able to submit a supporting document "
            f"(Kbis or RNE extract) from your account area.\n\n"
            f"- The Neurovent team"
        )
    elif status == 'REJECTED':
        subject = "Organization account request declined — Neurovent"
        body = (
            f"Hello,\n\n"
            f"We were unable to verify your organization account \"{name}\".\n\n"
            f"Possible reasons:\n"
            f"  - SIRET not found or invalid in the SIRENE registry\n"
            f"  - Establishment closed or deregistered\n\n"
            f"If you believe this is a mistake, please reply to this email "
            f"with an official supporting document (Kbis or RNE extract).\n\n"
            f"- The Neurovent team"
        )
    else:
        return  # PENDING ou statut inconnu — pas d'email

    if status == 'VERIFIED':
        tone = 'success'
        title = "Your organization account is verified"
        intro_lines = [
            f"Good news: your organization account \"{name}\" has been automatically verified through the SIRENE registry.",
            "You can now create and publish events on Neurovent.",
        ]
        bullet_items = []
    elif status == 'NEEDS_REVIEW':
        tone = 'warning'
        title = "Your file is under review"
        intro_lines = [
            f"Your organization account request for \"{name}\" is currently under manual review by our team.",
            "This process usually takes 1 to 2 business days.",
        ]
        bullet_items = [
            "You will receive an email as soon as a decision is made.",
            "If your file is incomplete, you will be able to submit a supporting document from your account area.",
        ]
    else:
        tone = 'danger'
        title = "Your request could not be approved"
        intro_lines = [
            f"We were unable to verify your organization account \"{name}\".",
        ]
        bullet_items = [
            "SIRET not found or invalid in the SIRENE registry",
            "Establishment closed or deregistered",
            "If you believe this is a mistake, reply to this email with an official supporting document.",
        ]

    _send_branded_email(
        subject=subject,
        text_message=body,
        recipient_email=email,
        preheader=subject,
        eyebrow="Organization verification",
        title=title,
        intro_lines=intro_lines,
        bullet_title="Key points" if bullet_items else None,
        bullet_items=bullet_items,
        tone=tone,
    )


def send_password_reset(recipient_email, reset_link):
    """
    Email envoyé quand un utilisateur demande la réinitialisation de son mot de passe.
    Contient un lien signé valable 24h.
    """
    _send_branded_email(
        subject="Reset your password — Neurovent",
        text_message=(
            f"Hello,\n\n"
            f"You requested a password reset for your Neurovent account.\n\n"
            f"Click this link to choose a new password:\n"
            f"{reset_link}\n\n"
            f"This link is valid for 24 hours. After it expires, you will need to submit "
            f"a new request.\n\n"
            f"If you did not make this request, simply ignore this email and "
            f"your password will remain unchanged.\n\n"
            f"- The Neurovent team"
        ),
        recipient_email=recipient_email,
        preheader="Reset your Neurovent password securely.",
        eyebrow="Account security",
        title="Reset your password",
        intro_lines=[
            "You requested a password reset for your Neurovent account.",
            "Use the button below to choose a new password.",
        ],
        cta_label="Reset my password",
        cta_url=reset_link,
        note_lines=[
            "This link is valid for 24 hours.",
            "If you did not make this request, you can safely ignore this email.",
        ],
        tone='primary',
    )

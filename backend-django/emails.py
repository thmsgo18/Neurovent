"""
emails.py — Centralisation de tous les emails de la plateforme Neurovent.

Toutes les fonctions d'envoi d'email sont ici.
Les vues importent depuis ce fichier et n'ont aucune logique d'email en dur.

Architecture prête pour le HTML :
  Chaque fonction accepte un paramètre optionnel `html_message`.
  Pour ajouter des templates HTML plus tard, il suffit de générer le HTML
  et de le passer à _send() — aucune autre modification nécessaire.

Fonctions disponibles :
  - send_registration_confirmed(registration, from_waitlist=False)
  - send_registration_rejected(registration)
  - send_registration_removed_by_organizer(registration)
  - send_event_cancelled(event)
  - send_password_reset(email, reset_link)
  - send_company_verification_result(company)
"""

from django.core.mail import EmailMultiAlternatives
from django.conf import settings


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
        pass  # Équivalent à fail_silently=True


def _format_event_details(event):
    """
    Construit le bloc de détails d'un événement pour les emails.
    Inclut les infos de lieu/lien selon le format (ONSITE / ONLINE / HYBRID).
    """
    lines = [
        f"  Titre   : {event.title}",
        f"  Début   : {event.date_start.strftime('%d/%m/%Y à %H:%M')}",
        f"  Fin     : {event.date_end.strftime('%d/%m/%Y à %H:%M')}",
        f"  Format  : {event.get_format_display()}",
    ]

    # Infos lieu (ONSITE + HYBRID)
    if event.format in ['ONSITE', 'HYBRID']:
        if event.address_full:
            lines.append(f"  Adresse : {event.address_full}")
        if event.address_city:
            lines.append(f"  Ville   : {event.address_city}{f', {event.address_country}' if event.address_country else ''}")

    # Infos lien distanciel (ONLINE + HYBRID)
    if event.format in ['ONLINE', 'HYBRID']:
        if event.online_platform:
            lines.append(f"  Plateforme : {event.online_platform}")
        if event.online_link:
            lines.append(f"  Lien    : {event.online_link}")

    return "\n".join(lines)


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
    event_link = f"{settings.FRONTEND_URL}/events/{event.id}/"

    if from_waitlist:
        intro = (
            f"Bonne nouvelle ! Vous étiez sur liste d'attente pour \"{event.title}\" "
            f"et une place vient de se libérer. Votre inscription est maintenant confirmée !\n"
        )
    else:
        intro = f"Votre inscription à \"{event.title}\" est confirmée !\n"

    details = _format_event_details(event)

    _send(
        subject=f"Inscription confirmée — {event.title}",
        text_message=(
            f"Bonjour {participant.first_name},\n\n"
            f"{intro}\n"
            f"─── Détails de l'événement ───\n"
            f"{details}\n\n"
            f"Voir l'événement : {event_link}\n\n"
            f"À bientôt sur Neurovent !\n\n"
            f"— L'équipe Neurovent"
        ),
        recipient_email=participant.email,
    )


def send_registration_rejected(registration):
    """
    Email envoyé au participant quand son inscription est rejetée par la company
    (mode VALIDATION uniquement).
    """
    participant = registration.participant
    event = registration.event
    browse_link = f"{settings.FRONTEND_URL}/events/"

    _send(
        subject=f"Inscription non retenue — {event.title}",
        text_message=(
            f"Bonjour {participant.first_name},\n\n"
            f"Nous sommes désolés de vous informer que votre inscription "
            f"à \"{event.title}\" (le {event.date_start.strftime('%d/%m/%Y')}) "
            f"n'a pas été retenue par l'organisateur.\n\n"
            f"Vous pouvez consulter d'autres événements disponibles sur Neurovent :\n"
            f"{browse_link}\n\n"
            f"— L'équipe Neurovent"
        ),
        recipient_email=participant.email,
    )


def send_registration_removed_by_organizer(registration):
    """
    Email envoyé au participant quand l'organisateur retire manuellement
    son inscription à un événement.
    """
    participant = registration.participant
    event = registration.event
    browse_link = f"{settings.FRONTEND_URL}/events/"

    _send(
        subject=f"Inscription retirée par l'organisateur — {event.title}",
        text_message=(
            f"Bonjour {participant.first_name},\n\n"
            f"L'organisateur a retiré votre inscription à \"{event.title}\" "
            f"prévu le {event.date_start.strftime('%d/%m/%Y à %H:%M')}.\n\n"
            f"Si vous pensez qu'il s'agit d'une erreur, nous vous invitons à contacter "
            f"directement l'organisation de l'événement.\n\n"
            f"Vous pouvez découvrir d'autres événements sur Neurovent :\n"
            f"{browse_link}\n\n"
            f"— L'équipe Neurovent"
        ),
        recipient_email=participant.email,
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
        _send(
            subject=f"Événement annulé — {event.title}",
            text_message=(
                f"Bonjour {reg.participant.first_name},\n\n"
                f"Nous avons le regret de vous informer que l'événement "
                f"\"{event.title}\" prévu le {event.date_start.strftime('%d/%m/%Y à %H:%M')} "
                f"a été annulé par l'organisateur.\n\n"
                f"Votre inscription a été automatiquement annulée.\n\n"
                f"D'autres événements sont disponibles sur Neurovent :\n"
                f"{browse_link}\n\n"
                f"— L'équipe Neurovent"
            ),
            recipient_email=reg.participant.email,
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
        subject = "Compte entreprise vérifié — Neurovent"
        body = (
            f"Bonjour,\n\n"
            f"Bonne nouvelle ! Le compte entreprise \"{name}\" a été vérifié automatiquement "
            f"via le répertoire SIRENE.\n\n"
            f"Vous pouvez dès maintenant créer et publier des événements sur Neurovent.\n\n"
            f"— L'équipe Neurovent"
        )
    elif status == 'NEEDS_REVIEW':
        subject = "Vérification de votre compte entreprise en cours — Neurovent"
        body = (
            f"Bonjour,\n\n"
            f"Votre demande de compte entreprise \"{name}\" est en cours de révision manuelle "
            f"par notre équipe.\n\n"
            f"Ce processus prend généralement 1 à 2 jours ouvrés. Vous recevrez un email "
            f"dès qu'une décision sera prise.\n\n"
            f"Si votre dossier est incomplet, vous pourrez nous transmettre un justificatif "
            f"(Kbis ou extrait RNE) via votre espace compte.\n\n"
            f"— L'équipe Neurovent"
        )
    elif status == 'REJECTED':
        subject = "Demande de compte entreprise refusée — Neurovent"
        body = (
            f"Bonjour,\n\n"
            f"Nous n'avons pas pu vérifier votre compte entreprise \"{name}\".\n\n"
            f"Raisons possibles :\n"
            f"  - SIRET introuvable ou invalide dans le répertoire SIRENE\n"
            f"  - Établissement fermé ou radié\n\n"
            f"Si vous pensez qu'il s'agit d'une erreur, contactez-nous en répondant à cet email "
            f"avec un justificatif officiel (Kbis ou extrait RNE).\n\n"
            f"— L'équipe Neurovent"
        )
    else:
        return  # PENDING ou statut inconnu — pas d'email

    _send(subject=subject, text_message=body, recipient_email=email)


def send_password_reset(recipient_email, reset_link):
    """
    Email envoyé quand un utilisateur demande la réinitialisation de son mot de passe.
    Contient un lien signé valable 24h.
    """
    _send(
        subject="Réinitialisation de votre mot de passe — Neurovent",
        text_message=(
            f"Bonjour,\n\n"
            f"Vous avez demandé la réinitialisation de votre mot de passe sur Neurovent.\n\n"
            f"Cliquez sur ce lien pour choisir un nouveau mot de passe :\n"
            f"{reset_link}\n\n"
            f"Ce lien est valable 24 heures. Après expiration, vous devrez faire "
            f"une nouvelle demande.\n\n"
            f"Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — "
            f"votre mot de passe ne sera pas modifié.\n\n"
            f"— L'équipe Neurovent"
        ),
        recipient_email=recipient_email,
    )

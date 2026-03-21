from django.db import models
from django.conf import settings


class RegistrationStatus(models.TextChoices):
    PENDING = 'PENDING', 'En attente'
    CONFIRMED = 'CONFIRMED', 'Confirmé'
    REJECTED = 'REJECTED', 'Rejeté'
    CANCELLED = 'CANCELLED', 'Annulé'
    WAITLIST = 'WAITLIST', 'Liste d\'attente'


class Registration(models.Model):
    participant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='registrations'
    )
    event = models.ForeignKey(
        'events.Event',
        on_delete=models.CASCADE,
        related_name='registrations'
    )
    status = models.CharField(
        max_length=20,
        choices=RegistrationStatus.choices,
        default=RegistrationStatus.PENDING
    )
    # Note optionnelle de l'organisateur (raison de rejet, message de confirmation...)
    company_comment = models.TextField(blank=True, default='')
    # Besoins d'accessibilité du participant (mobilité réduite, etc.)
    accessibility_needs = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['participant', 'event']  # Un participant ne peut s'inscrire qu'une fois par event
        ordering = ['-created_at']
        verbose_name = 'Inscription'
        verbose_name_plural = 'Inscriptions'

    @property
    def waitlist_position(self):
        """Position dans la liste d'attente (1 = premier). None si pas en attente."""
        if self.status != RegistrationStatus.WAITLIST:
            return None
        return (
            Registration.objects
            .filter(event=self.event, status=RegistrationStatus.WAITLIST, created_at__lt=self.created_at)
            .count() + 1
        )

    def __str__(self):
        return f"{self.participant} → {self.event} ({self.status})"

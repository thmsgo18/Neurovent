from django.db import models
from django.conf import settings


class RegistrationStatus(models.TextChoices):
    PENDING = 'PENDING', 'En attente'
    CONFIRMED = 'CONFIRMED', 'Confirmé'
    REJECTED = 'REJECTED', 'Rejeté'
    CANCELLED = 'CANCELLED', 'Annulé'


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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['participant', 'event']  # Un participant ne peut s'inscrire qu'une fois par event
        ordering = ['-created_at']
        verbose_name = 'Inscription'
        verbose_name_plural = 'Inscriptions'

    def __str__(self):
        return f"{self.participant} → {self.event} ({self.status})"

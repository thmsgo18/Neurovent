from django.db import models
from django.conf import settings
from django.utils import timezone


class EventStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Brouillon'
    PUBLISHED = 'PUBLISHED', 'Publié'
    CANCELLED = 'CANCELLED', 'Annulé'


class EventFormat(models.TextChoices):
    ONSITE = 'ONSITE', 'Présentiel'
    ONLINE = 'ONLINE', 'Distanciel'
    HYBRID = 'HYBRID', 'Présentiel + Live'


class RegistrationMode(models.TextChoices):
    AUTO = 'AUTO', 'Inscription automatique'
    VALIDATION = 'VALIDATION', 'Validation par l\'entreprise'


class AddressVisibility(models.TextChoices):
    FULL = 'FULL', 'Adresse complète'
    PARTIAL = 'PARTIAL', 'Ville et pays uniquement'


class OnlineVisibility(models.TextChoices):
    FULL = 'FULL', 'Lien complet'
    PARTIAL = 'PARTIAL', 'Nom de la plateforme uniquement'


class Event(models.Model):
    # --- Organisateur ---
    company = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='events'
    )

    # --- Infos de base ---
    title = models.CharField(max_length=200)
    description = models.TextField()
    banner = models.ImageField(
        upload_to='banners/',
        null=True, blank=True,
        help_text="Image/bannière de l'événement (format recommandé : 1200x400)"
    )
    date_start = models.DateTimeField()
    date_end = models.DateTimeField()
    capacity = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=EventStatus.choices, default=EventStatus.DRAFT)
    view_count = models.PositiveIntegerField(default=0)
    tags = models.ManyToManyField('tags.Tag', blank=True, related_name='events')

    # --- Format & inscription ---
    format = models.CharField(max_length=10, choices=EventFormat.choices, default=EventFormat.ONSITE)
    registration_mode = models.CharField(
        max_length=10,
        choices=RegistrationMode.choices,
        default=RegistrationMode.AUTO
    )
    registration_deadline = models.DateTimeField(
        null=True, blank=True,
        help_text="Date limite d'inscription. Si vide, les inscriptions sont ouvertes jusqu'au début de l'event."
    )

    # --- Localisation (ONSITE et HYBRID) ---
    address_full = models.CharField(max_length=300, blank=True)
    address_city = models.CharField(max_length=100, blank=True)
    address_country = models.CharField(max_length=100, blank=True)
    address_visibility = models.CharField(
        max_length=10,
        choices=AddressVisibility.choices,
        default=AddressVisibility.FULL,
        blank=True
    )
    address_reveal_date = models.DateTimeField(
        null=True, blank=True,
        help_text="Si renseigné, l'adresse complète sera révélée à cette date"
    )

    # --- Lien en ligne (ONLINE et HYBRID) ---
    online_platform = models.CharField(max_length=100, blank=True, help_text="ex: Zoom, YouTube, Teams")
    online_link = models.URLField(blank=True)
    online_visibility = models.CharField(
        max_length=10,
        choices=OnlineVisibility.choices,
        default=OnlineVisibility.FULL,
        blank=True
    )
    online_reveal_date = models.DateTimeField(
        null=True, blank=True,
        help_text="Si renseigné, le lien complet sera révélé à cette date"
    )

    # --- Timestamps ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ─────────────────────────────────────────
    #  PROPRIÉTÉS CALCULÉES
    # ─────────────────────────────────────────

    @property
    def registration_open(self):
        """
        Les inscriptions sont ouvertes si :
        - L'event n'a pas encore commencé
        - ET la deadline n'est pas dépassée (si elle est fixée)
        """
        now = timezone.now()
        if now >= self.date_start:
            return False
        if self.registration_deadline and now >= self.registration_deadline:
            return False
        return True

    @property
    def spots_remaining(self):
        """Places restantes = capacité - inscriptions confirmées"""
        confirmed = self.registrations.filter(status='CONFIRMED').count()
        return self.capacity - confirmed

    @property
    def visible_address(self):
        """
        Retourne l'adresse visible selon les règles de visibilité.
        - FULL → adresse complète toujours visible
        - PARTIAL → ville+pays, sauf si reveal_date est passée
        """
        if self.format not in ('ONSITE', 'HYBRID'):
            return None

        now = timezone.now()
        reveal_passed = self.address_reveal_date and now >= self.address_reveal_date

        if self.address_visibility == AddressVisibility.FULL or reveal_passed:
            return {
                'city': self.address_city,
                'country': self.address_country,
                'full': self.address_full,
                'is_full_revealed': True,
            }
        return {
            'city': self.address_city,
            'country': self.address_country,
            'full': None,
            'is_full_revealed': False,
        }

    @property
    def visible_online(self):
        """
        Retourne les infos en ligne visibles selon les règles de visibilité.
        - FULL → lien complet toujours visible
        - PARTIAL → plateforme seulement, sauf si reveal_date est passée
        """
        if self.format not in ('ONLINE', 'HYBRID'):
            return None

        now = timezone.now()
        reveal_passed = self.online_reveal_date and now >= self.online_reveal_date

        if self.online_visibility == OnlineVisibility.FULL or reveal_passed:
            return {
                'platform': self.online_platform,
                'link': self.online_link,
                'is_link_revealed': True,
            }
        return {
            'platform': self.online_platform,
            'link': None,
            'is_link_revealed': False,
        }

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['date_start']
        verbose_name = 'Événement'
        verbose_name_plural = 'Événements'

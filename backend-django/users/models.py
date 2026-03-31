from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator, MinLengthValidator
from django.db import models

# Validateur pour company_identifier : lettres, chiffres, tirets uniquement, min 3 caractères
company_identifier_validator = RegexValidator(
    regex=r'^[a-zA-Z0-9\-]+$',
    message="L'identifiant ne peut contenir que des lettres, chiffres et tirets (-). Pas d'espaces."
)


class UserRole(models.TextChoices):
    PARTICIPANT = 'PARTICIPANT', 'Participant'
    COMPANY = 'COMPANY', 'Company'
    ADMIN = 'ADMIN', 'Admin'


class VerificationStatus(models.TextChoices):
    PENDING = 'PENDING', 'En attente'
    VERIFIED = 'VERIFIED', 'Vérifié'
    REJECTED = 'REJECTED', 'Refusé'
    NEEDS_REVIEW = 'NEEDS_REVIEW', 'Révision manuelle'


class CustomUserManager(BaseUserManager):
    def create_user(self, email=None, password=None, **extra_fields):
        if email:
            email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', UserRole.ADMIN)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):

    # === COMMUN ===
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.PARTICIPANT
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    tags = models.ManyToManyField('tags.Tag', blank=True, related_name='users')

    # === PARTICIPANT ===
    # email sert de login pour les participants
    email = models.EmailField(unique=True, null=True, blank=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    employer_name = models.CharField(max_length=200, blank=True)  # entreprise où il travaille

    # === COMPANY ===
    # company_identifier sert de login pour les companies (pas l'email)
    company_identifier = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        validators=[
            MinLengthValidator(3, message="L'identifiant doit contenir au moins 3 caractères."),
            company_identifier_validator,
        ],
        help_text="3 à 50 caractères. Lettres, chiffres et tirets uniquement. Ex: braincorp-2026"
    )
    recovery_email = models.EmailField(blank=True)  # email de récupération de mot de passe
    company_name = models.CharField(max_length=200, blank=True)
    company_logo = models.ImageField(upload_to='logos/', null=True, blank=True)
    company_description = models.TextField(blank=True)
    website_url = models.URLField(blank=True)
    youtube_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    twitter_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)
    facebook_url = models.URLField(blank=True)

    # === VÉRIFICATION COMPANY (SIRENE) ===
    siret = models.CharField(max_length=14, blank=True)
    legal_representative = models.CharField(max_length=200, blank=True)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    verification_source = models.CharField(max_length=20, blank=True)  # 'AUTO' ou 'MANUAL'
    verification_document = models.FileField(
        upload_to='verification_docs/', null=True, blank=True
    )
    review_note = models.TextField(blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        if self.role == UserRole.COMPANY:
            return self.company_name or self.company_identifier or ''
        return f"{self.first_name} {self.last_name}".strip() or self.email or ''

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

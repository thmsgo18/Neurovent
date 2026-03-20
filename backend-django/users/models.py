from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserRole(models.TextChoices):
    PARTICIPANT = 'PARTICIPANT', 'Participant'
    COMPANY = 'COMPANY', 'Company'
    ADMIN = 'ADMIN', 'Admin'


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
    company_identifier = models.CharField(max_length=100, unique=True, null=True, blank=True)
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

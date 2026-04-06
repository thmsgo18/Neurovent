from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import CustomUser, UserRole, VerificationStatus
from tags.serializers import TagSerializer


# ─────────────────────────────────────────
#  INSCRIPTION
# ─────────────────────────────────────────

class RegisterParticipantSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ['email', 'password', 'password_confirm', 'first_name', 'last_name']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password': 'Les mots de passe ne correspondent pas'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        return CustomUser.objects.create_user(role=UserRole.PARTICIPANT, **validated_data)


class RegisterCompanySerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'company_identifier', 'password', 'password_confirm',
            'company_name', 'recovery_email',
            'siret', 'legal_representative',
        ]

    def validate_siret(self, value):
        import re
        cleaned = re.sub(r'[\s\-]', '', value)
        if not re.fullmatch(r'\d{14}', cleaned):
            raise serializers.ValidationError("Le SIRET doit contenir exactement 14 chiffres.")
        return cleaned

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password': 'Les mots de passe ne correspondent pas'})
        if not attrs.get('company_name'):
            raise serializers.ValidationError({'company_name': "Le nom de l'entreprise est requis"})
        if not attrs.get('company_identifier'):
            raise serializers.ValidationError({'company_identifier': "L'identifiant est requis"})
        if not attrs.get('siret'):
            raise serializers.ValidationError({'siret': "Le numéro SIRET est requis."})
        if not attrs.get('legal_representative'):
            raise serializers.ValidationError({'legal_representative': "Le nom du représentant légal est requis."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        # Les companies n'ont pas d'email de connexion
        # verification_status = PENDING par défaut (défini dans le modèle)
        return CustomUser.objects.create_user(role=UserRole.COMPANY, email=None, **validated_data)


# ─────────────────────────────────────────
#  PROFIL — PARTICIPANT
# ─────────────────────────────────────────

class ParticipantProfileSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    registration_stats = serializers.SerializerMethodField()
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, source='tags',
        queryset=__import__('tags').models.Tag.objects.all(),
        required=False
    )

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'role',
            'first_name', 'last_name', 'employer_name',
            'participant_profile_type',
            'school_name', 'study_level',
            'professional_company_name', 'job_title', 'job_started_at',
            'participant_avatar_url', 'participant_bio',
            'favorite_domain',
            'personal_website_url', 'github_url', 'participant_linkedin_url',
            'registration_stats',
            'tags', 'tag_ids',
            'date_joined',
        ]
        read_only_fields = ['id', 'email', 'role', 'date_joined']

    def update(self, instance, validated_data):
        # ManyToMany doit être géré manuellement avec .set()
        tags = validated_data.pop('tags', None)
        profile_type = validated_data.get('participant_profile_type', instance.participant_profile_type)

        if 'employer_name' not in validated_data:
            if profile_type == 'STUDENT' and 'school_name' in validated_data:
                validated_data['employer_name'] = validated_data.get('school_name', instance.school_name)
            elif profile_type == 'PROFESSIONAL' and 'professional_company_name' in validated_data:
                validated_data['employer_name'] = validated_data.get(
                    'professional_company_name', instance.professional_company_name
                )

        instance = super().update(instance, validated_data)
        if tags is not None:
            instance.tags.set(tags)
        return instance

    def get_registration_stats(self, obj):
        registrations = obj.registrations.all()
        return {
            'total': registrations.count(),
            'confirmed': registrations.filter(status='CONFIRMED').count(),
            'waitlist': registrations.filter(status='WAITLIST').count(),
        }


# ─────────────────────────────────────────
#  PROFIL — COMPANY
# ─────────────────────────────────────────

class CompanyProfileSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    match_reasons = serializers.SerializerMethodField()
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, source='tags',
        queryset=__import__('tags').models.Tag.objects.all(),
        required=False
    )

    class Meta:
        model = CustomUser
        fields = [
            'id', 'company_identifier', 'role', 'is_active',
            'company_name', 'recovery_email',
            'company_logo', 'company_logo_url', 'company_description',
            'website_url', 'youtube_url', 'linkedin_url',
            'twitter_url', 'instagram_url', 'facebook_url',
            'tags', 'tag_ids',
            'siret', 'legal_representative',
            'verification_status', 'verified_at', 'review_note',
            'match_reasons',
            'date_joined',
        ]
        read_only_fields = [
            'id', 'company_identifier', 'role', 'is_active', 'date_joined',
            'verification_status', 'verified_at',
        ]

    def update(self, instance, validated_data):
        # ManyToMany doit être géré manuellement avec .set()
        tags = validated_data.pop('tags', None)
        instance = super().update(instance, validated_data)
        if tags is not None:
            instance.tags.set(tags)
        return instance

    def get_match_reasons(self, obj):
        request = self.context.get('request')
        search = (request.query_params.get('search') or '').strip() if request else ''
        if not search:
            return []

        terms = [term.lower() for term in search.split() if term.strip()]
        field_map = [
            ("Organization name", obj.company_name or ""),
            ("Recovery email", obj.recovery_email or ""),
            ("Identifier", obj.company_identifier or ""),
            ("Description", obj.company_description or ""),
            ("SIRET", obj.siret or ""),
            ("Legal representative", obj.legal_representative or ""),
            ("Review note", obj.review_note or ""),
            ("Research domains", " ".join(tag.name for tag in obj.tags.all())),
        ]

        reasons = []
        for label, value in field_map:
            lowered = value.lower()
            if lowered and any(term in lowered for term in terms):
                reasons.append(label)
        return reasons[:4]


# ─────────────────────────────────────────
#  PROFIL PUBLIC — COMPANY
# ─────────────────────────────────────────

class CompanyPublicSerializer(serializers.ModelSerializer):
    """
    Profil public d'une company — accessible sans authentification.
    Ne retourne PAS les infos sensibles (recovery_email, company_identifier).
    Inclut les events publiés de la company.
    """
    tags = TagSerializer(many=True, read_only=True)
    events = serializers.SerializerMethodField()
    member_since = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id',
            'company_name',
            'company_logo',
            'company_logo_url',
            'company_description',
            'website_url',
            'youtube_url',
            'linkedin_url',
            'twitter_url',
            'instagram_url',
            'facebook_url',
            'verification_status',
            'tags',
            'events',
            'member_since',
        ]

    def get_events(self, obj):
        """Retourne les events publiés de la company (résumé)"""
        from events.models import Event
        published = Event.objects.filter(company=obj, status='PUBLISHED').order_by('date_start')
        return [
            {
                'id': e.id,
                'title': e.title,
                'date_start': e.date_start,
                'format': e.format,
                'registered_count': e.registrations.filter(status='CONFIRMED').count(),
                'unlimited_capacity': e.unlimited_capacity,
                'spots_remaining': e.spots_remaining,
            }
            for e in published
        ]


class CompanySearchSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    total_events = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id',
            'company_name',
            'company_logo',
            'company_logo_url',
            'company_description',
            'website_url',
            'linkedin_url',
            'youtube_url',
            'tags',
            'verification_status',
            'total_events',
        ]

    def get_total_events(self, obj):
        return obj.events.filter(status='PUBLISHED').count()


# ─────────────────────────────────────────
#  LISTE UTILISATEURS (admin)
# ─────────────────────────────────────────

class UserListSerializer(serializers.ModelSerializer):
    """
    Serializer pour la liste admin des utilisateurs.
    Retourne un champ 'name' adapté selon le rôle :
    - PARTICIPANT → "Prénom Nom"
    - COMPANY     → nom de l'entreprise
    """
    name = serializers.SerializerMethodField()
    match_reasons = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ['id', 'role', 'email', 'name', 'is_active', 'date_joined', 'verification_status', 'match_reasons']

    def get_name(self, obj):
        if obj.role == UserRole.PARTICIPANT:
            return f"{obj.first_name} {obj.last_name}".strip()
        if obj.role == UserRole.COMPANY:
            return obj.company_name
        return ''

    def get_match_reasons(self, obj):
        request = self.context.get('request')
        search = (request.query_params.get('search') or '').strip() if request else ''
        if not search:
            return []

        terms = [term.lower() for term in search.split() if term.strip()]
        field_map = [
            ("First name", obj.first_name or ""),
            ("Last name", obj.last_name or ""),
            ("Email", obj.email or ""),
            ("Employer", obj.employer_name or ""),
            ("School", obj.school_name or ""),
            ("Study level", obj.study_level or ""),
            ("Company", obj.professional_company_name or ""),
            ("Job title", obj.job_title or ""),
            ("Bio", obj.participant_bio or ""),
            ("Favorite domain", obj.favorite_domain or ""),
            ("Research interests", " ".join(tag.name for tag in obj.tags.all())),
        ]

        reasons = []
        for label, value in field_map:
            lowered = value.lower()
            if lowered and any(term in lowered for term in terms):
                reasons.append(label)
        return reasons[:4]


class AdminCompanyVerificationSerializer(serializers.ModelSerializer):
    """
    Serializer pour la révision admin d'un compte entreprise.
    L'admin peut changer le statut de vérification et laisser une note.
    """
    class Meta:
        model = CustomUser
        fields = [
            'id', 'company_name', 'siret', 'legal_representative',
            'verification_status', 'verification_source',
            'verification_document', 'review_note', 'verified_at',
            'recovery_email', 'date_joined',
        ]
        read_only_fields = [
            'id', 'company_name', 'siret', 'legal_representative',
            'verification_source', 'verified_at', 'recovery_email', 'date_joined',
        ]

    def validate_verification_status(self, value):
        allowed = [
            VerificationStatus.VERIFIED,
            VerificationStatus.REJECTED,
            VerificationStatus.NEEDS_REVIEW,
        ]
        if value not in allowed:
            raise serializers.ValidationError(
                f"Valeur invalide. Choisir parmi : {', '.join(allowed)}"
            )
        return value


# ─────────────────────────────────────────
#  MOT DE PASSE
# ─────────────────────────────────────────

class ChangePasswordSerializer(serializers.Serializer):
    """Changement de mot de passe pour un utilisateur connecté"""
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Mot de passe actuel incorrect.')
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password': 'Les mots de passe ne correspondent pas.'})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """Demande de réinitialisation par email (mot de passe oublié)"""
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Confirmation du reset avec le token reçu par email"""
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password': 'Les mots de passe ne correspondent pas.'})
        return attrs


# ─────────────────────────────────────────
#  PROFIL GÉNÉRIQUE (dispatche selon le rôle)
# ─────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    """Utilisé en lecture seule pour afficher le bon profil selon le rôle"""
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'role',
            # Participant
            'first_name', 'last_name', 'employer_name',
            'participant_profile_type',
            'school_name', 'study_level',
            'professional_company_name', 'job_title', 'job_started_at',
            'participant_avatar_url', 'participant_bio',
            'favorite_domain',
            'personal_website_url', 'github_url', 'participant_linkedin_url',
            # Company
            'company_identifier', 'company_name', 'recovery_email',
            'company_logo', 'company_logo_url', 'company_description',
            'website_url', 'youtube_url', 'linkedin_url',
            'twitter_url', 'instagram_url', 'facebook_url',
            # Commun
            'tags', 'date_joined',
        ]
        read_only_fields = fields

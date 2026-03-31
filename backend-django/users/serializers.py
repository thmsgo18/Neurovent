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
            'tags', 'tag_ids',
            'date_joined',
        ]
        read_only_fields = ['id', 'email', 'role', 'date_joined']

    def update(self, instance, validated_data):
        # ManyToMany doit être géré manuellement avec .set()
        tags = validated_data.pop('tags', None)
        instance = super().update(instance, validated_data)
        if tags is not None:
            instance.tags.set(tags)
        return instance


# ─────────────────────────────────────────
#  PROFIL — COMPANY
# ─────────────────────────────────────────

class CompanyProfileSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, source='tags',
        queryset=__import__('tags').models.Tag.objects.all(),
        required=False
    )

    class Meta:
        model = CustomUser
        fields = [
            'id', 'company_identifier', 'role',
            'company_name', 'recovery_email',
            'company_logo', 'company_description',
            'website_url', 'youtube_url', 'linkedin_url',
            'twitter_url', 'instagram_url', 'facebook_url',
            'tags', 'tag_ids',
            'siret', 'legal_representative',
            'verification_status', 'verified_at',
            'date_joined',
        ]
        read_only_fields = [
            'id', 'company_identifier', 'role', 'date_joined',
            'verification_status', 'verified_at',
        ]

    def update(self, instance, validated_data):
        # ManyToMany doit être géré manuellement avec .set()
        tags = validated_data.pop('tags', None)
        instance = super().update(instance, validated_data)
        if tags is not None:
            instance.tags.set(tags)
        return instance


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
            'company_description',
            'website_url',
            'youtube_url',
            'linkedin_url',
            'twitter_url',
            'instagram_url',
            'facebook_url',
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
                'spots_remaining': e.spots_remaining,
            }
            for e in published
        ]


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

    class Meta:
        model = CustomUser
        fields = ['id', 'role', 'email', 'name', 'is_active', 'date_joined', 'verification_status']

    def get_name(self, obj):
        if obj.role == UserRole.PARTICIPANT:
            return f"{obj.first_name} {obj.last_name}".strip()
        if obj.role == UserRole.COMPANY:
            return obj.company_name
        return ''


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
            # Company
            'company_identifier', 'company_name', 'recovery_email',
            'company_logo', 'company_description',
            'website_url', 'youtube_url', 'linkedin_url',
            'twitter_url', 'instagram_url', 'facebook_url',
            # Commun
            'tags', 'date_joined',
        ]
        read_only_fields = fields

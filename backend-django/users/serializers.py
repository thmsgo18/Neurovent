from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import CustomUser, UserRole
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
        fields = ['company_identifier', 'password', 'password_confirm', 'company_name', 'recovery_email']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password': 'Les mots de passe ne correspondent pas'})
        if not attrs.get('company_name'):
            raise serializers.ValidationError({'company_name': "Le nom de l'entreprise est requis"})
        if not attrs.get('company_identifier'):
            raise serializers.ValidationError({'company_identifier': "L'identifiant est requis"})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        # Les companies n'ont pas d'email de connexion
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
            'date_joined',
        ]
        read_only_fields = ['id', 'company_identifier', 'role', 'date_joined']

    def update(self, instance, validated_data):
        # ManyToMany doit être géré manuellement avec .set()
        tags = validated_data.pop('tags', None)
        instance = super().update(instance, validated_data)
        if tags is not None:
            instance.tags.set(tags)
        return instance


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

from rest_framework import serializers
from django.utils import timezone
from .models import Event
from tags.serializers import TagSerializer


class EventListSerializer(serializers.ModelSerializer):
    """Serializer allégé pour la liste des events (page d'accueil)"""
    company_id = serializers.IntegerField(source='company.id', read_only=True)
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    company_logo = serializers.ImageField(source='company.company_logo', read_only=True)
    company_logo_url = serializers.URLField(source='company.company_logo_url', read_only=True)
    spots_remaining = serializers.IntegerField(read_only=True, allow_null=True)
    registration_open = serializers.BooleanField(read_only=True)
    is_full = serializers.SerializerMethodField()
    registered_count = serializers.SerializerMethodField()
    tags = TagSerializer(many=True, read_only=True)
    # Adresse partielle toujours visible dans la liste
    address_city = serializers.CharField(read_only=True)
    address_country = serializers.CharField(read_only=True)
    online_platform = serializers.CharField(read_only=True)

    def get_is_full(self, obj):
        if obj.unlimited_capacity:
            return False
        return obj.spots_remaining <= 0

    def get_registered_count(self, obj):
        return obj.registrations.filter(status='CONFIRMED').count()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'banner', 'date_start', 'date_end',
            'format', 'registration_mode', 'registration_deadline', 'registration_open',
            'allow_registration_during_event',
            'capacity', 'unlimited_capacity', 'registered_count', 'spots_remaining', 'is_full',
            'status', 'tags',
            'company_id', 'company_name', 'company_logo', 'company_logo_url',
            # Localisation partielle
            'address_city', 'address_country', 'online_platform',
        ]


class EventDetailSerializer(serializers.ModelSerializer):
    """
    Serializer complet pour la page détail d'un event.
    Applique les règles de visibilité pour l'adresse et le lien.
    """
    company_id = serializers.IntegerField(source='company.id', read_only=True)
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    company_logo = serializers.ImageField(source='company.company_logo', read_only=True)
    company_logo_url = serializers.URLField(source='company.company_logo_url', read_only=True)
    company_description = serializers.CharField(source='company.company_description', read_only=True)
    spots_remaining = serializers.IntegerField(read_only=True, allow_null=True)
    registration_open = serializers.BooleanField(read_only=True)
    registered_count = serializers.SerializerMethodField()
    tags = TagSerializer(many=True, read_only=True)
    visible_address = serializers.DictField(read_only=True)
    visible_online = serializers.DictField(read_only=True)

    def get_registered_count(self, obj):
        return obj.registrations.filter(status='CONFIRMED').count()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'banner',
            'date_start', 'date_end',
            'format', 'registration_mode', 'registration_deadline', 'registration_open',
            'allow_registration_during_event',
            'capacity', 'unlimited_capacity', 'registered_count', 'spots_remaining',
            'status', 'tags',
            'company_id', 'company_name', 'company_logo', 'company_logo_url', 'company_description',
            # Visibilité dynamique (calculée selon les règles)
            'visible_address',
            'visible_online',
            'created_at',
        ]


class EventCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour créer ou modifier un event (Company uniquement)"""
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, source='tags',
        queryset=__import__('tags').models.Tag.objects.all(),
        required=False
    )
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'banner',
            'date_start', 'date_end', 'capacity', 'unlimited_capacity', 'status',
            'format', 'registration_mode', 'registration_deadline',
            'allow_registration_during_event',
            # Adresse
            'address_full', 'address_city', 'address_country',
            'address_visibility', 'address_reveal_date',
            # En ligne
            'online_platform', 'online_link',
            'online_visibility', 'online_reveal_date',
            # Tags
            'tags', 'tag_ids',
        ]

    def validate(self, attrs):
        # Vérification des dates
        date_start = attrs.get('date_start') or getattr(self.instance, 'date_start', None)
        date_end = attrs.get('date_end') or getattr(self.instance, 'date_end', None)
        date_start_was_updated = self.instance is None or 'date_start' in attrs
        unlimited_capacity = (
            attrs.get('unlimited_capacity')
            if 'unlimited_capacity' in attrs
            else getattr(self.instance, 'unlimited_capacity', False)
        )
        capacity = attrs.get('capacity') if 'capacity' in attrs else getattr(self.instance, 'capacity', None)
        if date_start and date_start_was_updated and date_start < timezone.now():
            raise serializers.ValidationError({'date_start': "La date et l'heure de début ne peuvent pas être dans le passé."})
        if date_start and date_end and date_end <= date_start:
            raise serializers.ValidationError({'date_end': 'La date de fin doit être après la date de début'})
        if not unlimited_capacity and (capacity is None or capacity <= 1):
            raise serializers.ValidationError({'capacity': 'Le nombre maximum de participants doit être supérieur à 1, sauf si la capacité est illimitée.'})

        # Vérification cohérence format / champs localisation
        event_format = attrs.get('format') or getattr(self.instance, 'format', None)
        allow_registration_during_event = (
            attrs.get('allow_registration_during_event')
            if 'allow_registration_during_event' in attrs
            else getattr(self.instance, 'allow_registration_during_event', False)
        )
        registration_mode = attrs.get('registration_mode') or getattr(self.instance, 'registration_mode', None)
        online_visibility = attrs.get('online_visibility') or getattr(self.instance, 'online_visibility', 'FULL')
        registration_deadline = attrs.get('registration_deadline') if 'registration_deadline' in attrs else getattr(self.instance, 'registration_deadline', None)
        if event_format in ('ONSITE', 'HYBRID'):
            if not attrs.get('address_city') and not getattr(self.instance, 'address_city', None):
                raise serializers.ValidationError({'address_city': 'La ville est requise pour un event en présentiel'})
            if not attrs.get('address_country') and not getattr(self.instance, 'address_country', None):
                raise serializers.ValidationError({'address_country': 'Le pays est requis pour un event en présentiel'})
            if not attrs.get('address_full') and not getattr(self.instance, 'address_full', None):
                raise serializers.ValidationError({'address_full': "L'adresse complète est requise pour un event en présentiel"})
        if event_format in ('ONLINE', 'HYBRID'):
            if not attrs.get('online_link') and not getattr(self.instance, 'online_link', None):
                raise serializers.ValidationError({'online_link': "Le lien de réunion est requis pour un event en ligne"})
        if allow_registration_during_event and event_format not in ('ONLINE', 'HYBRID'):
            raise serializers.ValidationError({
                'allow_registration_during_event': "Cette option n'est disponible que pour les événements online ou hybrid."
            })
        if allow_registration_during_event and registration_mode == 'VALIDATION':
            raise serializers.ValidationError({
                'registration_mode': "Le mode Manual Review n'est pas compatible avec l'inscription pendant le live. Utilisez Auto-Confirm."
            })
        if allow_registration_during_event and online_visibility == 'PARTIAL':
            raise serializers.ValidationError({
                'online_visibility': "Le lien de réunion ne peut pas être masqué si l'inscription reste ouverte pendant le live."
            })
        if allow_registration_during_event and registration_deadline:
            raise serializers.ValidationError({
                'registration_deadline': "La date limite d'inscription n'est pas compatible avec l'inscription pendant le live."
            })

        return attrs

    def create(self, validated_data):
        validated_data['company'] = self.context['request'].user
        return super().create(validated_data)

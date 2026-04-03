from rest_framework import serializers
from .models import Event
from tags.serializers import TagSerializer


class EventListSerializer(serializers.ModelSerializer):
    """Serializer allégé pour la liste des events (page d'accueil)"""
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    company_logo = serializers.ImageField(source='company.company_logo', read_only=True)
    spots_remaining = serializers.IntegerField(read_only=True)
    registration_open = serializers.BooleanField(read_only=True)
    is_full = serializers.SerializerMethodField()
    tags = TagSerializer(many=True, read_only=True)
    # Adresse partielle toujours visible dans la liste
    address_city = serializers.CharField(read_only=True)
    address_country = serializers.CharField(read_only=True)
    online_platform = serializers.CharField(read_only=True)

    def get_is_full(self, obj):
        return obj.spots_remaining <= 0

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'banner', 'date_start', 'date_end',
            'format', 'registration_mode', 'registration_deadline', 'registration_open',
            'capacity', 'spots_remaining', 'is_full',
            'status', 'tags',
            'company_name', 'company_logo',
            # Localisation partielle
            'address_city', 'address_country', 'online_platform',
        ]


class EventDetailSerializer(serializers.ModelSerializer):
    """
    Serializer complet pour la page détail d'un event.
    Applique les règles de visibilité pour l'adresse et le lien.
    """
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    company_logo = serializers.ImageField(source='company.company_logo', read_only=True)
    company_description = serializers.CharField(source='company.company_description', read_only=True)
    spots_remaining = serializers.IntegerField(read_only=True)
    registration_open = serializers.BooleanField(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    visible_address = serializers.DictField(read_only=True)
    visible_online = serializers.DictField(read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'banner',
            'date_start', 'date_end',
            'format', 'registration_mode', 'registration_deadline', 'registration_open',
            'capacity', 'spots_remaining',
            'status', 'tags',
            'company_name', 'company_logo', 'company_description',
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
            'date_start', 'date_end', 'capacity', 'status',
            'format', 'registration_mode', 'registration_deadline',
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
        if date_start and date_end and date_end <= date_start:
            raise serializers.ValidationError({'date_end': 'La date de fin doit être après la date de début'})

        # Vérification cohérence format / champs localisation
        event_format = attrs.get('format') or getattr(self.instance, 'format', None)
        if event_format in ('ONSITE', 'HYBRID'):
            if not attrs.get('address_city') and not getattr(self.instance, 'address_city', None):
                raise serializers.ValidationError({'address_city': 'La ville est requise pour un event en présentiel'})
            if not attrs.get('address_country') and not getattr(self.instance, 'address_country', None):
                raise serializers.ValidationError({'address_country': 'Le pays est requis pour un event en présentiel'})
            if not attrs.get('address_full') and not getattr(self.instance, 'address_full', None):
                raise serializers.ValidationError({'address_full': "L'adresse complète est requise pour un event en présentiel"})
        if event_format in ('ONLINE', 'HYBRID'):
            if not attrs.get('online_platform') and not getattr(self.instance, 'online_platform', None):
                raise serializers.ValidationError({'online_platform': 'La plateforme est requise pour un event en ligne'})

        return attrs

    def create(self, validated_data):
        validated_data['company'] = self.context['request'].user
        return super().create(validated_data)

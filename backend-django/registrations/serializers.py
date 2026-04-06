from rest_framework import serializers
from .models import Registration, RegistrationStatus


class RegistrationSerializer(serializers.ModelSerializer):
    """Serializer complet pour afficher une inscription"""
    event_title = serializers.CharField(source='event.title', read_only=True)
    event_date = serializers.DateTimeField(source='event.date_start', read_only=True)
    participant_id = serializers.IntegerField(source='participant.id', read_only=True)
    participant_name = serializers.SerializerMethodField()
    waitlist_position = serializers.IntegerField(read_only=True)

    class Meta:
        model = Registration
        fields = [
            'id', 'event', 'event_title', 'event_date',
            'participant_id', 'participant_name', 'status', 'waitlist_position',
            'accessibility_needs', 'company_comment',
            'created_at',
        ]
        read_only_fields = ['id', 'status', 'company_comment', 'created_at']

    def get_participant_name(self, obj):
        return f"{obj.participant.first_name} {obj.participant.last_name}".strip() or obj.participant.email

    def validate(self, attrs):
        user = self.context['request'].user
        event = attrs.get('event')
        # Bloquer uniquement si une inscription ACTIVE existe (pas CANCELLED ni REJECTED)
        active_statuses = [
            RegistrationStatus.PENDING,
            RegistrationStatus.CONFIRMED,
            RegistrationStatus.WAITLIST,
        ]
        if event and Registration.objects.filter(
            participant=user, event=event, status__in=active_statuses
        ).exists():
            raise serializers.ValidationError(
                {"event": "Vous êtes déjà inscrit à cet événement."}
            )
        return attrs

    def create(self, validated_data):
        validated_data['participant'] = self.context['request'].user
        return super().create(validated_data)


class RegistrationStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour que la Company confirme ou rejette une inscription.
    La company peut aussi laisser un commentaire (company_comment).
    """

    class Meta:
        model = Registration
        fields = ['status', 'company_comment']

    def validate_status(self, value):
        # CONFIRMED ou REJECTED uniquement
        if value not in ['CONFIRMED', 'REJECTED']:
            raise serializers.ValidationError('Valeur invalide. Choisir: CONFIRMED ou REJECTED')
        return value

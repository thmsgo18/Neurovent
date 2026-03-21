from rest_framework import serializers
from .models import Registration


class RegistrationSerializer(serializers.ModelSerializer):
    """Serializer complet pour afficher une inscription"""
    event_title = serializers.CharField(source='event.title', read_only=True)
    event_date = serializers.DateTimeField(source='event.date_start', read_only=True)
    participant_name = serializers.SerializerMethodField()
    waitlist_position = serializers.IntegerField(read_only=True)

    class Meta:
        model = Registration
        fields = [
            'id', 'event', 'event_title', 'event_date',
            'participant_name', 'status', 'waitlist_position', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def get_participant_name(self, obj):
        return f"{obj.participant.first_name} {obj.participant.last_name}".strip() or obj.participant.email

    def create(self, validated_data):
        validated_data['participant'] = self.context['request'].user
        return super().create(validated_data)


class RegistrationStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour que la Company confirme ou rejette une inscription"""

    class Meta:
        model = Registration
        fields = ['status']

    def validate_status(self, value):
        allowed = [Registration.status.field.choices[1][0], Registration.status.field.choices[2][0]]
        # CONFIRMED ou REJECTED uniquement
        if value not in ['CONFIRMED', 'REJECTED']:
            raise serializers.ValidationError('Valeur invalide. Choisir: CONFIRMED ou REJECTED')
        return value

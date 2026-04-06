from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0005_event_allow_registration_during_event'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='unlimited_capacity',
            field=models.BooleanField(
                default=False,
                help_text="Si activé, l'événement n'a pas de limite de participants.",
            ),
        ),
    ]

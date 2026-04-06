from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0004_event_view_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='allow_registration_during_event',
            field=models.BooleanField(
                default=False,
                help_text="Autorise l'inscription après le début de l'événement (utile surtout pour les events online/hybrid).",
            ),
        ),
    ]

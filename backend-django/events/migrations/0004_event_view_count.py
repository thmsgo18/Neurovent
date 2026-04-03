from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0003_event_banner'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='view_count',
            field=models.PositiveIntegerField(default=0),
        ),
    ]

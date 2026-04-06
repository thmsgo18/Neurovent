from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0006_event_unlimited_capacity'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='address_reveal_email_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='almost_full_notified_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='full_notified_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='online_reveal_email_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='organizer_digest_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='reminder_1d_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='reminder_3h_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='reminder_7d_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

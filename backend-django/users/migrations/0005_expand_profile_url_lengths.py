from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_customuser_extended_profile_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='participant_avatar_url',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='personal_website_url',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='github_url',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='participant_linkedin_url',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='company_logo_url',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='website_url',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='youtube_url',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='linkedin_url',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='twitter_url',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='instagram_url',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='facebook_url',
            field=models.URLField(blank=True, max_length=500),
        ),
    ]

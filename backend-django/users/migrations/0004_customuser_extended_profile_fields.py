from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_customuser_legal_representative_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='company_logo_url',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='favorite_domain',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='customuser',
            name='github_url',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='job_started_at',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='job_title',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='customuser',
            name='participant_avatar_url',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='participant_bio',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='participant_linkedin_url',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='participant_profile_type',
            field=models.CharField(
                choices=[('STUDENT', 'Student'), ('PROFESSIONAL', 'Professional')],
                default='STUDENT',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='customuser',
            name='personal_website_url',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='professional_company_name',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='customuser',
            name='school_name',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='customuser',
            name='study_level',
            field=models.CharField(blank=True, max_length=120),
        ),
    ]

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['__str__', 'role', 'email', 'company_identifier', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active', 'is_staff']
    search_fields = ['email', 'first_name', 'last_name', 'company_name', 'company_identifier']
    ordering = ['-date_joined']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Rôle', {'fields': ('role',)}),
        ('Infos Participant', {'fields': ('first_name', 'last_name', 'employer_name')}),
        ('Infos Company', {
            'fields': (
                'company_identifier', 'company_name', 'recovery_email',
                'company_logo', 'company_description',
                'website_url', 'youtube_url', 'linkedin_url',
                'twitter_url', 'instagram_url', 'facebook_url',
            )
        }),
        ('Tags', {'fields': ('tags',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'role'),
        }),
    )

    filter_horizontal = ['tags', 'groups', 'user_permissions']

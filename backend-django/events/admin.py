from django.contrib import admin
from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'company', 'format', 'date_start', 'date_end', 'capacity', 'status', 'registration_mode']
    list_filter = ['status', 'format', 'registration_mode', 'date_start']
    search_fields = ['title', 'company__company_name', 'address_city', 'address_country']
    ordering = ['date_start']
    filter_horizontal = ['tags']

    fieldsets = (
        ('Infos de base', {
            'fields': ('company', 'title', 'description', 'banner', 'date_start', 'date_end', 'capacity', 'status', 'tags')
        }),
        ('Format & Inscription', {
            'fields': ('format', 'registration_mode', 'registration_deadline')
        }),
        ('Localisation (Présentiel)', {
            'fields': ('address_full', 'address_city', 'address_country', 'address_visibility', 'address_reveal_date'),
            'classes': ('collapse',),
        }),
        ('En ligne (Distanciel)', {
            'fields': ('online_platform', 'online_link', 'online_visibility', 'online_reveal_date'),
            'classes': ('collapse',),
        }),
    )

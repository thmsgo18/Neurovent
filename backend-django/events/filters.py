import django_filters
import re
from django.db.models import Q
from django.utils import timezone
from .models import Event, EventFormat, EventStatus
from tags.models import Tag


class EventFilter(django_filters.FilterSet):
    """
    Filtres disponibles sur GET /api/events/

    Exemples d'utilisation :
        ?format=ONSITE
        ?tags=1&tags=2          → events qui ont au moins un de ces tags
        ?date_after=2026-04-01  → events qui commencent après cette date
        ?date_before=2026-05-01 → events qui commencent avant cette date
        ?city=Paris
        ?country=France
        ?search=neuro           → recherche dans le titre et la description
        ?ordering=date_start    → tri par date croissante
        ?ordering=-date_start   → tri par date décroissante
    """

    # Filtre par statut : DRAFT / PUBLISHED / CANCELLED (admin uniquement en pratique)
    status = django_filters.ChoiceFilter(
        choices=EventStatus.choices,
        label='Statut'
    )

    # Filtre par format : ONSITE / ONLINE / HYBRID
    format = django_filters.ChoiceFilter(
        choices=EventFormat.choices,
        label='Format'
    )

    # Filtre par tags (plusieurs IDs possibles : ?tags=1&tags=2)
    tags = django_filters.ModelMultipleChoiceFilter(
        queryset=Tag.objects.all(),
        field_name='tags',
        conjoined=False,  # OR : l'event doit avoir AU MOINS UN des tags sélectionnés
        label='Tags'
    )

    # Filtre par date de début
    date_after = django_filters.DateFilter(
        field_name='date_start',
        lookup_expr='date__gte',
        label='Date de début après le (YYYY-MM-DD)'
    )
    date_before = django_filters.DateFilter(
        field_name='date_start',
        lookup_expr='date__lte',
        label='Date de début avant le (YYYY-MM-DD)'
    )

    # Filtre par ville et pays (insensible à la casse)
    city = django_filters.CharFilter(
        field_name='address_city',
        lookup_expr='icontains',
        label='Ville'
    )
    country = django_filters.CharFilter(
        field_name='address_country',
        lookup_expr='icontains',
        label='Pays'
    )
    organization = django_filters.CharFilter(
        method='filter_organization',
        label='Organisation'
    )

    # Recherche libre dans le titre et la description
    search = django_filters.CharFilter(
        method='filter_search',
        label='Recherche (titre ou description)'
    )
    upcoming_only = django_filters.BooleanFilter(
        method='filter_upcoming_only',
        label='Événements à venir uniquement'
    )

    def filter_search(self, queryset, name, value):
        terms = [term.strip() for term in re.split(r"\s+", value or "") if term.strip()]
        if not terms:
            return queryset

        query = Q()
        for term in terms:
            query &= (
                Q(title__icontains=term) |
                Q(description__icontains=term) |
                Q(company__company_name__icontains=term)
            )

        return queryset.filter(query).distinct()

    def filter_upcoming_only(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(date_start__gt=timezone.now())

    def filter_organization(self, queryset, name, value):
        normalized_value = (value or "").strip()
        if not normalized_value:
            return queryset
        return queryset.filter(company__company_name__iexact=normalized_value)

    class Meta:
        model = Event
        fields = ['status', 'format', 'tags', 'date_after', 'date_before', 'city', 'country', 'organization', 'search', 'upcoming_only']

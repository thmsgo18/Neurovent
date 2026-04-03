from django.urls import path
from .views import (
    RegisterToEventView,
    MyRegistrationsView,
    CancelRegistrationView,
    EventRegistrationsView,
    UpdateRegistrationStatusView,
    ExportEventRegistrationsView,
    RemoveRegistrationView,
)

urlpatterns = [
    # Participant
    path('', RegisterToEventView.as_view(), name='register-to-event'),              # POST /api/registrations/
    path('my/', MyRegistrationsView.as_view(), name='my-registrations'),            # GET  /api/registrations/my/
    path('<int:pk>/cancel/', CancelRegistrationView.as_view(), name='cancel-registration'),  # PATCH /api/registrations/1/cancel/

    # Company
    path('event/<int:event_id>/', EventRegistrationsView.as_view(), name='event-registrations'),                  # GET  /api/registrations/event/1/
    path('event/<int:event_id>/export/', ExportEventRegistrationsView.as_view(), name='export-registrations'),    # GET  /api/registrations/event/1/export/
    path('<int:pk>/status/', UpdateRegistrationStatusView.as_view(), name='update-registration-status'),          # PATCH /api/registrations/1/status/
    path('<int:pk>/remove/', RemoveRegistrationView.as_view(), name='remove-registration'),                       # PATCH /api/registrations/1/remove/
]

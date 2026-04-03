from django.urls import path
from .views import (
    EventListView,
    EventDetailView,
    EventCreateView,
    EventUpdateView,
    EventDeleteView,
    MyEventsView,
    CompanyDashboardStatsView,
    CompanyDashboardStatsSummaryExportView,
    CompanyDashboardPerformanceExportView,
    EventStatsView,
    RecommendedEventsView,
)

urlpatterns = [
    path('', EventListView.as_view(), name='event-list'),               # GET  /api/events/
    path('dashboard-stats/', CompanyDashboardStatsView.as_view(), name='company-dashboard-stats'),
    path('dashboard-stats/export-summary/', CompanyDashboardStatsSummaryExportView.as_view(), name='company-dashboard-stats-export-summary'),
    path('dashboard-stats/export-performance/', CompanyDashboardPerformanceExportView.as_view(), name='company-dashboard-stats-export-performance'),
    path('<int:pk>/', EventDetailView.as_view(), name='event-detail'),  # GET  /api/events/1/
    path('create/', EventCreateView.as_view(), name='event-create'),    # POST /api/events/create/
    path('<int:pk>/update/', EventUpdateView.as_view(), name='event-update'),   # PUT  /api/events/1/update/
    path('<int:pk>/delete/', EventDeleteView.as_view(), name='event-delete'),   # DEL  /api/events/1/delete/
    path('my-events/', MyEventsView.as_view(), name='my-events'),             # GET  /api/events/my-events/
    path('recommended/', RecommendedEventsView.as_view(), name='recommended'), # GET  /api/events/recommended/
    path('<int:pk>/stats/', EventStatsView.as_view(), name='event-stats'),      # GET  /api/events/1/stats/
]

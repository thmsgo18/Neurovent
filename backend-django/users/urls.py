from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterParticipantView, RegisterCompanyView, ProfileView, AdminStatsView, CompanyLoginView, AdminSuspendUserView, AdminActivateUserView
from .tokens import CustomTokenObtainPairView

urlpatterns = [
    # Inscription
    path('register/participant/', RegisterParticipantView.as_view(), name='register-participant'),
    path('register/company/', RegisterCompanyView.as_view(), name='register-company'),

    # Login — deux endpoints séparés selon le type d'utilisateur
    path('login/participant/', CustomTokenObtainPairView.as_view(), name='login-participant'),   # email + password
    path('login/company/', CompanyLoginView.as_view(), name='login-company'),                    # identifier + password

    # Refresh token (commun)
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # Profil de l'utilisateur connecté
    path('me/', ProfileView.as_view(), name='profile'),

    # Statistiques admin
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),

    # Modération admin
    path('admin/users/<int:pk>/suspend/', AdminSuspendUserView.as_view(), name='admin-suspend-user'),
    path('admin/users/<int:pk>/activate/', AdminActivateUserView.as_view(), name='admin-activate-user'),
]

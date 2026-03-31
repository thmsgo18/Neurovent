from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterParticipantView, RegisterCompanyView,
    ProfileView,
    AdminStatsView,
    AdminUserListView,
    AdminDeleteUserView,
    CompanyLoginView,
    AdminSuspendUserView, AdminActivateUserView,
    LogoutView,
    ChangePasswordView,
    PasswordResetRequestView, PasswordResetConfirmView,
    AdminPendingCompaniesView,
    AdminCompanyVerifyView,
    CompanyUploadDocumentView,
)
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

    # Logout
    path('logout/', LogoutView.as_view(), name='logout'),

    # Mot de passe
    path('me/password/', ChangePasswordView.as_view(), name='change-password'),             # PATCH — changer son mdp (connecté)
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),    # POST  — demander un reset par email
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),  # POST  — confirmer le reset

    # Statistiques admin
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),

    # Liste & modération admin
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/delete/', AdminDeleteUserView.as_view(), name='admin-delete-user'),
    path('admin/users/<int:pk>/suspend/', AdminSuspendUserView.as_view(), name='admin-suspend-user'),
    path('admin/users/<int:pk>/activate/', AdminActivateUserView.as_view(), name='admin-activate-user'),

    # Vérification entreprises (admin)
    path('admin/companies/pending/', AdminPendingCompaniesView.as_view(), name='admin-companies-pending'),
    path('admin/companies/<int:pk>/verify/', AdminCompanyVerifyView.as_view(), name='admin-company-verify'),

    # Upload justificatif (company)
    path('me/verification/document/', CompanyUploadDocumentView.as_view(), name='company-upload-document'),
]

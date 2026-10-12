from django.urls import path

from .views import (
    CurrentUserView,
    HealthView,
    LoginView,
    RefreshTokenView,
    UploadHeadersView,
    UploadProcessView,
    MasterPersonImportView,
    DashboardRecordsView,
)

app_name = 'core'

urlpatterns = [
    path('health/', HealthView.as_view(), name='health'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', RefreshTokenView.as_view(), name='refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='current-user'),
    path('uploads/headers/', UploadHeadersView.as_view(), name='upload-headers'),
    path('uploads/process/', UploadProcessView.as_view(), name='upload-process'),
    path(
        'master-persons/import/',
        MasterPersonImportView.as_view(),
        name='master-person-import',
    ),
    path('dashboard/records/', DashboardRecordsView.as_view(), name='dashboard-records'),
]

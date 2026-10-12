from django.urls import path

from .views import (
    CurrentUserView,
    HealthView,
    LoginView,
    LogoutView,
    RefreshTokenView,
    UploadHeadersView,
    UploadProcessView,
    UploadHistoryView,
    UploadDetailView,
    MasterPersonImportView,
    MasterPersonListView,
    DashboardRecordsView,
)

app_name = 'core'

urlpatterns = [
    path('health/', HealthView.as_view(), name='health'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', RefreshTokenView.as_view(), name='refresh'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', CurrentUserView.as_view(), name='current-user'),
    path('uploads/headers/', UploadHeadersView.as_view(), name='upload-headers'),
    path('uploads/process/', UploadProcessView.as_view(), name='upload-process'),
    path('uploads/history/', UploadHistoryView.as_view(), name='upload-history'),
    path(
        'uploads/history/<uuid:batch_id>/',
        UploadDetailView.as_view(),
        name='upload-detail',
    ),
    path(
        'master-persons/',
        MasterPersonListView.as_view(),
        name='master-person-list',
    ),
    path(
        'master-persons/import/',
        MasterPersonImportView.as_view(),
        name='master-person-import',
    ),
    path('dashboard/records/', DashboardRecordsView.as_view(), name='dashboard-records'),
]

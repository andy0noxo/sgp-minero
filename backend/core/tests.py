from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Rol, Usuario


class AuthenticationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.role = Rol.objects.create(
            nombre_rol='Cargador',
            descripcion='Operador de carga de nóminas',
        )
        self.user = Usuario.objects.create_user(
            rut='12345678-5',
            email_corporativo='cargador@minera.cl',
            password='correct-password',
            rol=self.role,
        )

    def test_login_accepts_rut_and_sets_refresh_cookie(self):
        response = self.client.post(
            '/api/v1/auth/login/',
            {'identifier': '12345678-5', 'password': 'correct-password'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data['data'])
        self.assertEqual(response.data['data']['user']['role'], 'Cargador')
        self.assertIn('sgp_refresh_token', response.cookies)

    def test_login_accepts_corporate_email(self):
        response = self.client.post(
            '/api/v1/auth/login/',
            {'identifier': 'CARGADOR@MINERA.CL', 'password': 'correct-password'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)

    @override_settings(MAX_FAILED_LOGIN_ATTEMPTS=3, LOGIN_LOCKOUT_MINUTES=5)
    def test_three_invalid_passwords_lock_account(self):
        payload = {'identifier': '12345678-5', 'password': 'wrong-password'}
        for _ in range(3):
            response = self.client.post('/api/v1/auth/login/', payload, format='json')
            self.assertEqual(response.status_code, 401)
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 3)
        self.assertGreater(self.user.locked_until, timezone.now())

    def test_current_user_requires_authentication(self):
        self.assertEqual(self.client.get('/api/v1/auth/me/').status_code, 401)

    def test_health_endpoint_reports_database_status(self):
        response = self.client.get('/api/v1/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'status': 'ok', 'database': 'ok'})

    def test_current_user_returns_role(self):
        login_response = self.client.post(
            '/api/v1/auth/login/',
            {'identifier': '12345678-5', 'password': 'correct-password'},
            format='json',
        )
        token = login_response.data.get('data', {}).get('access')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/v1/auth/me/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['rut'], '12345678-5')
        self.assertEqual(response.data['data']['role'], 'Cargador')

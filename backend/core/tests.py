import os
from unittest.mock import patch

from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Maestro_Personas, Rol, Usuario


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

    def test_login_normalizes_rut_with_dots_and_without_separator(self):
        for identifier in ('12.345.678-5', '123456785'):
            response = self.client.post(
                '/api/v1/auth/login/',
                {'identifier': identifier, 'password': 'correct-password'},
                format='json',
            )
            self.assertEqual(response.status_code, 200)

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

    def test_logout_clears_refresh_cookie(self):
        login_response = self.client.post(
            '/api/v1/auth/login/',
            {'identifier': '12345678-5', 'password': 'correct-password'},
            format='json',
        )
        self.client.cookies = login_response.cookies
        response = self.client.post('/api/v1/auth/logout/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.cookies['sgp_refresh_token']['max-age'], 0)

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


class DemoDataCommandTests(TestCase):
    @override_settings(DEBUG=True)
    @patch.dict(
        os.environ,
        {
            'SEED_DEMO_DATA': 'True',
            'SEED_DEMO_MASTER_DATA': 'True',
            'DJANGO_SUPERUSER_RUT': '11111111-1',
            'DJANGO_SUPERUSER_EMAIL': 'admin@minera.local',
            'DJANGO_SUPERUSER_PASSWORD': 'admin-password',
            'DEMO_CARGADOR_RUT': '22222222-2',
            'DEMO_CARGADOR_EMAIL': 'cargador@minera.local',
            'DEMO_CARGADOR_PASSWORD': 'cargador-password',
            'DEMO_CONSULTOR_RUT': '33333333-3',
            'DEMO_CONSULTOR_EMAIL': 'consultor@minera.local',
            'DEMO_CONSULTOR_PASSWORD': 'consultor-password',
        },
        clear=False,
    )
    def test_seed_creates_roles_and_demo_users_idempotently(self):
        call_command('seed_demo_data')
        os.environ['DJANGO_SUPERUSER_PASSWORD'] = 'changed-password'
        call_command('seed_demo_data')

        self.assertEqual(Rol.objects.count(), 3)
        self.assertEqual(Usuario.objects.count(), 3)
        admin = Usuario.objects.get(rut='11111111-1')
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.check_password('admin-password'))
        self.assertEqual(admin.rol.nombre_rol, 'Administrador')
        self.assertEqual(Maestro_Personas.objects.count(), 75)
        self.assertEqual(
            Maestro_Personas.objects.filter(centro_costo='MINA-01').count(),
            15,
        )
        self.assertEqual(
            Maestro_Personas.objects.filter(faena='Faena Cordillera').count(),
            25,
        )
        self.assertEqual(
            Maestro_Personas.objects.filter(estado_habilitacion=False).count(),
            19,
        )

    @override_settings(DEBUG=False)
    @patch.dict(os.environ, {'SEED_DEMO_DATA': 'True'}, clear=False)
    def test_seed_is_rejected_outside_development(self):
        with self.assertRaises(CommandError):
            call_command('seed_demo_data')

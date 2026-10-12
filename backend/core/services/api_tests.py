from io import BytesIO

import pandas as pd
from cryptography.fernet import Fernet
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.models import Maestro_Personas, Rol, Usuario


def excel_upload(rows):
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        pd.DataFrame(rows).to_excel(writer, index=False)
    return SimpleUploadedFile('viajes.xlsx', output.getvalue())


class UploadApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.role = Rol.objects.create(nombre_rol='Cargador', descripcion='Carga')
        cls.user = Usuario.objects.create_user(
            rut='12345678-5',
            email_corporativo='cargador@minera.cl',
            password='correct-password',
            rol=cls.role,
        )
        Maestro_Personas.objects.create(
            rut='12345678-5',
            nombre_completo='María Pérez',
            centro_costo='MINA-01',
        )

    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            '/api/v1/auth/login/',
            {'identifier': self.user.rut, 'password': 'correct-password'},
            format='json',
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )

    def test_headers_endpoint_returns_first_row_columns(self):
        response = self.client.post(
            '/api/v1/uploads/headers/',
            {'file': excel_upload([{'Rut': '12345678-5', 'Nombre': 'María Pérez'}])},
            format='multipart',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['headers'], ['Rut', 'Nombre'])

    @override_settings(AES_SECRET_KEY=Fernet.generate_key().decode())
    def test_process_returns_partial_feedback_and_persists_valid_rows(self):
        response = self.client.post(
            '/api/v1/uploads/process/',
            {
                'file': excel_upload([
                    {'Rut': '12345678-5', 'Nombre': 'Maria Perez', 'Fecha': '2026-01-01'},
                    {'Rut': '12345678-6', 'Nombre': 'Persona inválida', 'Fecha': '2026-01-02'},
                ]),
                'mapping': '{"map_rut": "Rut", "map_nombre": "Nombre"}',
            },
            format='multipart',
        )
        self.assertEqual(response.status_code, 207)
        self.assertEqual(response.data['data']['total_procesados'], 1)
        self.assertEqual(response.data['data']['total_errores'], 1)
        self.assertEqual(response.data['data']['detalle_errores'][0]['code'], 'INVALID_RUT')

    def test_upload_requires_file(self):
        response = self.client.post('/api/v1/uploads/headers/', {}, format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error']['code'], 'INVALID_FILE')

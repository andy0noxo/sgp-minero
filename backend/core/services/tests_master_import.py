from io import BytesIO

import pandas as pd
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Maestro_Personas, Rol, Usuario


def master_excel(rows):
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        pd.DataFrame(rows).to_excel(writer, index=False)
    return SimpleUploadedFile('maestro.xlsx', output.getvalue())


class MasterPersonImportApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Rol.objects.create(nombre_rol='Administrador', descripcion='Administración')
        cls.loader_role = Rol.objects.create(nombre_rol='Cargador', descripcion='Carga')
        cls.admin = Usuario.objects.create_user(
            rut='11111111-1',
            email_corporativo='admin@minera.cl',
            password='correct-password',
            rol=cls.admin_role,
        )
        cls.loader = Usuario.objects.create_user(
            rut='12345678-5',
            email_corporativo='loader@minera.cl',
            password='correct-password',
            rol=cls.loader_role,
        )

    def authenticate(self, user):
        client = APIClient()
        response = client.post(
            '/api/v1/auth/login/',
            {'identifier': user.rut, 'password': 'correct-password'},
            format='json',
        )
        client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )
        return client

    def test_admin_imports_new_and_updates_existing_people(self):
        Maestro_Personas.objects.create(
            rut='12345678-5',
            nombre_completo='Nombre anterior',
            centro_costo='ANTIGUO',
        )
        response = self.authenticate(self.admin).post(
            '/api/v1/master-persons/import/',
            {'file': master_excel([
                {'rut': '12345678-5', 'nombre_completo': 'Juan Pérez', 'centro_costo': 'MINA-01', 'estado_habilitacion': 'activo'},
                {'rut': '11111111-1', 'nombre_completo': 'Ana Soto', 'centro_costo': 'MINA-02', 'estado_habilitacion': 'inactivo'},
            ])},
            format='multipart',
        )
        self.assertEqual(response.status_code, 200)
        data = response.data['data']
        self.assertEqual(data['total_creados'], 1)
        self.assertEqual(data['total_actualizados'], 1)
        self.assertEqual(Maestro_Personas.objects.get(rut='12345678-5').centro_costo, 'MINA-01')
        self.assertFalse(Maestro_Personas.objects.get(rut='11111111-1').estado_habilitacion)

    def test_import_applies_valid_rows_and_returns_partial_errors(self):
        response = self.authenticate(self.admin).post(
            '/api/v1/master-persons/import/',
            {'file': master_excel([
                {'rut': '12345678-5', 'nombre_completo': 'Persona válida', 'centro_costo': 'MINA-01'},
                {'rut': '12345678-6', 'nombre_completo': 'Persona inválida', 'centro_costo': 'MINA-02'},
            ])},
            format='multipart',
        )
        self.assertEqual(response.status_code, 207)
        self.assertEqual(response.data['data']['total_creados'], 1)
        self.assertEqual(response.data['data']['total_errores'], 1)

    def test_cargador_cannot_import_master(self):
        response = self.authenticate(self.loader).post(
            '/api/v1/master-persons/import/',
            {'file': master_excel([])},
            format='multipart',
        )
        self.assertEqual(response.status_code, 403)

from datetime import datetime
from django.utils import timezone

from cryptography.fernet import Fernet
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.models import LoteCarga, RegistroViaje, Rol, Usuario
from core.services.encryption import encrypt_pii


class DashboardRecordsApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.consultor_role = Rol.objects.create(nombre_rol='Consultor', descripcion='Auditoría')
        cls.cargador_role = Rol.objects.create(nombre_rol='Cargador', descripcion='Carga')
        cls.consultor = Usuario.objects.create_user(
            rut='12345678-5',
            email_corporativo='consultor@minera.cl',
            password='correct-password',
            rol=cls.consultor_role,
        )
        cls.cargador = Usuario.objects.create_user(
            rut='11111111-1',
            email_corporativo='cargador@minera.cl',
            password='correct-password',
            rol=cls.cargador_role,
        )

    @classmethod
    def create_record(cls):
        batch = LoteCarga.objects.create(
            cargador=cls.cargador,
            nombre_archivo_origen='viajes.xlsx',
            total_filas=1,
        )
        return RegistroViaje.objects.create(
            lote=batch,
            cargador=cls.cargador,
            nombre_archivo_origen='viajes.xlsx',
            fila_origen=2,
            fecha_procesamiento=datetime(2026, 1, 15),
            estado_validacion=RegistroViaje.EstadoValidacion.APROBADO,
            payload_datos={
                'centro_costo': 'MINA-01',
                'rut_cifrado': encrypt_pii('12345678-5'),
                'nombre_cifrado': encrypt_pii('María Pérez'),
            },
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

    @override_settings(AES_SECRET_KEY=Fernet.generate_key().decode())
    def test_consultor_reads_filtered_records_with_decrypted_data(self):
        record = self.create_record()
        today = timezone.localdate().isoformat()
        response = self.authenticate(self.consultor).get(
            f'/api/v1/dashboard/records/?from={today}&to={today}&centro_costo=MINA-01'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['pagination']['total'], 1)
        result = response.data['data']['results'][0]
        self.assertEqual(result['id'], str(record.id))
        self.assertEqual(result['datos']['rut'], '12345678-5')
        self.assertEqual(result['datos']['nombre_completo'], 'María Pérez')
        self.assertNotIn('rut_cifrado', result['datos'])
        self.assertEqual(result['nombre_archivo_origen'], 'viajes.xlsx')
        self.assertEqual(result['cargador_responsable'], 'cargador@minera.cl')

    @override_settings(AES_SECRET_KEY=Fernet.generate_key().decode())
    def test_consultor_can_filter_by_validation_status(self):
        self.create_record()
        rejected = self.create_record()
        rejected.estado_validacion = RegistroViaje.EstadoValidacion.RECHAZADO
        rejected.save(update_fields=['estado_validacion'])
        response = self.authenticate(self.consultor).get(
            '/api/v1/dashboard/records/?estado=RECHAZADO'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['pagination']['total'], 1)
        self.assertEqual(response.data['data']['results'][0]['id'], str(rejected.id))

    @override_settings(AES_SECRET_KEY=Fernet.generate_key().decode())
    def test_cargador_is_forbidden_and_post_is_not_allowed(self):
        self.create_record()
        client = self.authenticate(self.cargador)
        self.assertEqual(client.get('/api/v1/dashboard/records/').status_code, 403)
        self.assertEqual(
            self.authenticate(self.consultor).post('/api/v1/dashboard/records/').status_code,
            405,
        )

    def test_invalid_date_filter_is_rejected(self):
        response = self.authenticate(self.consultor).get(
            '/api/v1/dashboard/records/?from=not-a-date'
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error']['code'], 'INVALID_FILTER')

    def test_invalid_status_filter_is_rejected(self):
        response = self.authenticate(self.consultor).get(
            '/api/v1/dashboard/records/?estado=PENDIENTE'
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error']['code'], 'INVALID_FILTER')

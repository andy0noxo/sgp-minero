from io import BytesIO

import pandas as pd
from cryptography.fernet import Fernet
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from core.models import Maestro_Personas
from core.services.encryption import decrypt_pii, encrypt_pii
from core.services.excel_reader import FileProcessingError, read_headers
from core.services.identity_matcher import find_matching_person, normalize_name
from core.services.rut_validator import is_valid_rut, validate_rut


class ServiceTests(TestCase):
    def test_valid_rut_with_dotted_format(self):
        self.assertTrue(is_valid_rut('12.345.678-5'))

    def test_valid_rut_with_spaces_is_normalized(self):
        self.assertEqual(validate_rut('12 345 678-5'), '12345678-5')

    def test_invalid_rut_with_wrong_verifier(self):
        self.assertFalse(is_valid_rut('12.345.678-6'))

    def test_invalid_rut_with_alphanumeric_body(self):
        self.assertFalse(is_valid_rut('12345678-X'))

    def test_name_normalization_ignores_case_accents_and_spaces(self):
        self.assertEqual(normalize_name('  María   José Pérez '), 'maria jose perez')

    def test_identity_matcher_requires_active_matching_person(self):
        person = Maestro_Personas.objects.create(
            rut='12345678-5',
            nombre_completo='María José Pérez',
            faena='Faena Cordillera',
            centro_costo='MINA-01',
        )
        match, error = find_matching_person('12345678-5', 'maria jose   perez')
        self.assertEqual(match, person)
        self.assertIsNone(error)

        match, error = find_matching_person('12345678-5', 'Otro Nombre')
        self.assertIsNone(match)
        self.assertIn('no coincide', error)

    @override_settings(AES_SECRET_KEY=Fernet.generate_key().decode())
    def test_pii_encryption_round_trip(self):
        token = encrypt_pii('dato sensible')
        self.assertNotEqual(token, 'dato sensible')
        self.assertEqual(decrypt_pii(token), 'dato sensible')

    def test_excel_headers_are_read_and_invalid_files_are_rejected(self):
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            pd.DataFrame([{'RUT': '12345678-5', 'Nombre': 'Persona'}]).to_excel(
                writer, index=False
            )
        upload = SimpleUploadedFile('nomina.xlsx', output.getvalue())
        self.assertEqual(read_headers(upload), ['RUT', 'Nombre'])

        invalid = SimpleUploadedFile('nomina.txt', b'content')
        with self.assertRaises(FileProcessingError):
            read_headers(invalid)

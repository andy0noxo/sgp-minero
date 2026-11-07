from io import BytesIO

import pandas as pd
from config.settings import require_env_secret
from cryptography.fernet import Fernet
from django.core.exceptions import ImproperlyConfigured
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from core.models import Maestro_Personas
from core.services.encryption import decrypt_pii, encrypt_pii
from core.services.excel_reader import (
    FileProcessingError,
    inspect_excel,
    read_headers,
    read_rows,
)
from core.services.identity_matcher import find_matching_person, normalize_name
from core.services.mapper import MapperValidationError, validate_mapper
from core.services.rut_validator import (
    RutValidationError,
    is_valid_rut,
    validate_rut,
)


class ServiceTests(TestCase):
    def test_valid_rut_with_dotted_format(self):
        self.assertTrue(is_valid_rut("12.345.678-5"))

    def test_valid_rut_with_spaces_is_normalized(self):
        self.assertEqual(validate_rut("12 345 678-5"), "12345678-5")

    def test_valid_rut_without_separator_and_verifier_k(self):
        self.assertEqual(validate_rut("10000013K"), "10000013-K")

    def test_invalid_rut_with_wrong_verifier(self):
        self.assertFalse(is_valid_rut("12.345.678-6"))
        with self.assertRaises(RutValidationError):
            validate_rut("12.345.678-6")

    def test_invalid_rut_with_alphanumeric_body(self):
        self.assertFalse(is_valid_rut("12345678-X"))
        with self.assertRaises(RutValidationError):
            validate_rut("12345678-X")

    def test_invalid_rut_with_garbage_text(self):
        self.assertFalse(is_valid_rut("basura_sin_sentido"))
        self.assertFalse(is_valid_rut("ABCDEF"))
        with self.assertRaises(RutValidationError):
            validate_rut("basura_sin_sentido")

    def test_valid_rut_with_k_verifier_lowercase(self):
        self.assertEqual(validate_rut("10.000.013-k"), "10000013-K")

    def test_valid_rut_from_numeric_integer(self):
        self.assertEqual(validate_rut(123456785), "12345678-5")

    def test_valid_rut_from_float_and_float_string_representation(self):
        self.assertEqual(validate_rut(123456785.0), "12345678-5")
        self.assertEqual(validate_rut("123456785.0"), "12345678-5")

    def test_name_normalization_ignores_case_accents_and_spaces(self):
        self.assertEqual(normalize_name("  María   José Pérez "), "maria jose perez")

    def test_identity_matcher_requires_active_matching_person(self):
        person = Maestro_Personas.objects.create(
            rut="12345678-5",
            nombre_completo="María José Pérez",
            faena="Faena Cordillera",
            centro_costo="MINA-01",
        )
        match, error = find_matching_person("12345678-5", "maria jose   perez")
        self.assertEqual(match, person)
        self.assertIsNone(error)

        match, error = find_matching_person("12345678-5", "Otro Nombre")
        self.assertIsNone(match)
        self.assertIn("no coincide", error)

    @override_settings(AES_SECRET_KEY=Fernet.generate_key().decode())
    def test_pii_encryption_round_trip(self):
        token = encrypt_pii("dato sensible")
        self.assertNotEqual(token, "dato sensible")
        self.assertEqual(decrypt_pii(token), "dato sensible")

    def test_excel_headers_are_read_and_invalid_files_are_rejected(self):
        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            pd.DataFrame([{"RUT": "12345678-5", "Nombre": "Persona"}]).to_excel(
                writer, index=False
            )
        upload = SimpleUploadedFile("nomina.xlsx", output.getvalue())
        self.assertEqual(read_headers(upload), ["RUT", "Nombre"])

        invalid = SimpleUploadedFile("nomina.txt", b"content")
        with self.assertRaises(FileProcessingError):
            read_headers(invalid)

    def test_inspect_excel_returns_summary_samples_and_preview(self):
        output = BytesIO()
        rows = [
            {"RUT": "12345678-5", "Nombre": "Maria Perez", "Turno": "7x7"},
            {"RUT": "18452931-9", "Nombre": "Juan Gomez", "Turno": "4x3"},
        ]
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            pd.DataFrame(rows).to_excel(writer, index=False)
        upload = SimpleUploadedFile("nomina_inspeccion.xlsx", output.getvalue())
        info = inspect_excel(upload)
        self.assertEqual(info["headers"], ["RUT", "Nombre", "Turno"])
        self.assertEqual(info["file_summary"]["total_rows"], 2)
        self.assertEqual(info["file_summary"]["total_columns"], 3)
        self.assertEqual(info["file_summary"]["non_empty_rows"], 2)
        self.assertIn("12345678-5", info["column_samples"]["RUT"])
        self.assertEqual(len(info["preview_rows"]), 2)
        self.assertEqual(info["preview_rows"][0]["fila"], 2)
        self.assertEqual(info["preview_rows"][0]["data"]["RUT"], "12345678-5")

    def test_read_rows_with_dtype_object_preserves_numeric_ruts(self):
        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            pd.DataFrame([{"RUT": 123456785, "Nombre": "Juan Perez"}]).to_excel(
                writer, index=False
            )
        upload = SimpleUploadedFile("nomina_numerica.xlsx", output.getvalue())
        df = read_rows(upload)
        rut_read = df.iloc[0]["RUT"]
        self.assertEqual(validate_rut(rut_read), "12345678-5")

    def test_require_env_secret_fails_when_missing_or_empty(self):
        def fake_env(key, default=""):
            return "   "

        with self.assertRaises(ImproperlyConfigured):
            require_env_secret(
                "AES_SECRET_KEY",
                alias_key="AES_ENCRYPTION_KEY",
                environ_reader=fake_env,
            )

    def test_require_env_secret_supports_official_alias_and_validates_fernet(self):
        valid_key = Fernet.generate_key().decode()
        store = {"AES_ENCRYPTION_KEY": valid_key}

        def fake_env(key, default=""):
            return store.get(key, default)

        resolved = require_env_secret(
            "AES_SECRET_KEY",
            alias_key="AES_ENCRYPTION_KEY",
            validate_fernet=True,
            environ_reader=fake_env,
        )
        self.assertEqual(resolved, valid_key)

        invalid_store = {"AES_SECRET_KEY": "llave-invalida-no-base64"}

        def invalid_env(key, default=""):
            return invalid_store.get(key, default)

        with self.assertRaises(ImproperlyConfigured):
            require_env_secret(
                "AES_SECRET_KEY",
                alias_key="AES_ENCRYPTION_KEY",
                validate_fernet=True,
                environ_reader=invalid_env,
            )

    def test_validate_mapper_valid_mapping(self):
        available = ["RUT_COL", "NOMBRE_COL", "OTRA_COL"]
        mapping = {"map_rut": "RUT_COL", "map_nombre": "NOMBRE_COL"}
        cleaned = validate_mapper(mapping, available)
        self.assertEqual(cleaned, {"map_rut": "RUT_COL", "map_nombre": "NOMBRE_COL"})

    def test_validate_mapper_missing_fields_raises_error(self):
        available = ["RUT_COL", "NOMBRE_COL"]
        with self.assertRaises(MapperValidationError) as ctx:
            validate_mapper({"map_rut": "RUT_COL"}, available)
        self.assertIn("Faltan campos obligatorios", str(ctx.exception))

    def test_validate_mapper_unknown_columns_raises_error(self):
        available = ["COL_A", "COL_B"]
        with self.assertRaises(MapperValidationError) as ctx:
            validate_mapper(
                {"map_rut": "COL_INEXISTENTE", "map_nombre": "COL_B"}, available
            )
        self.assertIn("Las columnas no existen", str(ctx.exception))

    def test_validate_mapper_same_column_raises_error(self):
        available = ["COL_A", "COL_B"]
        with self.assertRaises(MapperValidationError) as ctx:
            validate_mapper({"map_rut": "COL_A", "map_nombre": "COL_A"}, available)
        self.assertIn("columnas distintas", str(ctx.exception))

    def test_validate_mapper_non_dict_raises_error(self):
        with self.assertRaises(MapperValidationError) as ctx:
            validate_mapper("no_es_dict", ["COL_A"])
        self.assertIn("objeto JSON", str(ctx.exception))

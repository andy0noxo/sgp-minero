import time
from io import BytesIO, StringIO

import pandas as pd
from cryptography.fernet import Fernet
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings

from core.models import Maestro_Personas, RegistroViaje, Rol, Usuario
from core.services.encryption import decrypt_pii
from core.services.travel_processor import process_travel_file


def _rut_for_number(number):
    digits = str(number)
    multiplier = 2
    total = 0
    for digit in reversed(digits):
        total += int(digit) * multiplier
        multiplier = 2 if multiplier == 7 else multiplier + 1
    remainder = 11 - (total % 11)
    verifier = "0" if remainder == 11 else "K" if remainder == 10 else str(remainder)
    return f"{digits}-{verifier}"


class StressBenchmarkTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cargador_role = Rol.objects.create(
            nombre_rol="Cargador", descripcion="Carga de nóminas"
        )
        cls.cargador = Usuario.objects.create_user(
            rut="18452931-9",
            email_corporativo="cargador.qa@sgp-minero.cl",
            password="Password123!",
            rol=cls.cargador_role,
        )

    @override_settings(AES_SECRET_KEY=Fernet.generate_key().decode())
    def test_stress_5000_rows_benchmark_and_sql_crypto_audit(self):
        total_rows = 5000
        valid_count = 4000
        bad_rut_count = 500
        mismatch_name_count = 300
        unknown_count = 200

        # 1. Aprovisionar 4.300 personas en Maestro_Personas en 1 query masiva
        base_num = 12000000
        people = []
        for i in range(valid_count + mismatch_name_count):
            rut_str = _rut_for_number(base_num + i)
            people.append(
                Maestro_Personas(
                    rut=rut_str,
                    nombre_completo=f"Operador Minero {i + 1}",
                    faena="Faena Cordillera" if i % 2 == 0 else "Faena Norte",
                    centro_costo=f"MINA-{200 + (i % 20)}",
                    estado_habilitacion=True,
                )
            )
        Maestro_Personas.objects.bulk_create(people)

        # 2. Generar dataset sintético de 5.000 filas
        rows = []
        for i in range(valid_count):
            rows.append(
                {
                    "RUT_Pasajero": _rut_for_number(base_num + i),
                    "Nombre_Trabajador": f"Operador Minero {i + 1}",
                    "Turno": "7x7",
                    "Destino": "Calama (CJC)",
                }
            )

        for i in range(bad_rut_count):
            rows.append(
                {
                    "RUT_Pasajero": f"{base_num + valid_count + i}-9",
                    "Nombre_Trabajador": f"Invalido {i + 1}",
                    "Turno": "4x3",
                    "Destino": "Antofagasta (ANF)",
                }
            )

        for i in range(mismatch_name_count):
            rows.append(
                {
                    "RUT_Pasajero": _rut_for_number(base_num + valid_count + i),
                    "Nombre_Trabajador": f"Nombre Discrepante {i + 1}",
                    "Turno": "7x7",
                    "Destino": "Calama (CJC)",
                }
            )

        for i in range(unknown_count):
            rows.append(
                {
                    "RUT_Pasajero": _rut_for_number(40000000 + i),
                    "Nombre_Trabajador": f"Desconocido {i + 1}",
                    "Turno": "7x7",
                    "Destino": "Copiapó (CPO)",
                }
            )

        buffer = BytesIO()
        pd.DataFrame(rows).to_excel(buffer, index=False, engine="openpyxl")
        upload = SimpleUploadedFile("nomina_5000_qa.xlsx", buffer.getvalue())
        mapping = {"map_rut": "RUT_Pasajero", "map_nombre": "Nombre_Trabajador"}

        # 3. Medir tiempo de procesamiento (NFR: < 30 segundos)
        t0 = time.perf_counter()
        result = process_travel_file(upload, mapping, self.cargador)
        elapsed = time.perf_counter() - t0

        self.assertLess(
            elapsed,
            30.0,
            f"El procesamiento tardó {elapsed:.2f}s superando el límite de 30s.",
        )
        self.assertEqual(result["total_filas"], total_rows)
        self.assertEqual(result["total_procesados"], valid_count)
        self.assertEqual(
            result["total_errores"], bad_rut_count + mismatch_name_count + unknown_count
        )

        # 4. Auditoría criptográfica directa en BD (Ley 19.628)
        db_records = list(
            RegistroViaje.objects.filter(lote_id=result["lote_id"]).order_by(
                "fila_origen"
            )[:10]
        )
        self.assertEqual(len(db_records), 10)

        for rec in db_records:
            payload = rec.payload_datos
            self.assertIn("rut_cifrado", payload)
            self.assertIn("nombre_cifrado", payload)
            self.assertTrue(payload["rut_cifrado"].startswith("gAAAAAB"))
            self.assertTrue(payload["nombre_cifrado"].startswith("gAAAAAB"))

            # Verificación de que no existen llaves ni datos planos de PII
            self.assertNotIn("RUT_Pasajero", payload)
            self.assertNotIn("Nombre_Trabajador", payload)
            self.assertNotIn("12000", str(payload))

            # Comprobación de que la desencriptación autorizada
            # recupera los datos correctos en memoria
            decrypted_rut = decrypt_pii(payload["rut_cifrado"])
            decrypted_nombre = decrypt_pii(payload["nombre_cifrado"])
            self.assertTrue(decrypted_rut.startswith("1200"))
            self.assertTrue(decrypted_nombre.startswith("Operador Minero"))

    def test_benchmark_management_command_execution(self):
        output_buffer = StringIO()
        call_command(
            "run_stress_benchmark",
            count=50,
            save_path="",
            stdout=output_buffer,
        )
        output = output_buffer.getvalue()
        self.assertIn("BENCHMARK US-14", output)
        self.assertIn("CRITERIO 1 Y 2 CUMPLIDOS", output)
        self.assertIn("CRITERIO 3 CUMPLIDO", output)

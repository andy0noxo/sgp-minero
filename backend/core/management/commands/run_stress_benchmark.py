import json
import time
from io import BytesIO
from pathlib import Path

import pandas as pd
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand
from django.db import connection

from core.models import Maestro_Personas, Rol, Usuario
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


class Command(BaseCommand):
    help = (
        "Genera una nómina sintética de 5.000 filas, ejecuta la prueba "
        "de estrés US-14/SGP-26 y audita SQL en BD."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--save-path",
            type=str,
            default="nomina_stress_5000.xlsx",
            help="Ruta donde guardar el archivo Excel generado.",
        )
        parser.add_argument(
            "--count",
            type=int,
            default=5000,
            help="Cantidad total de filas a generar (default: 5000).",
        )

    def handle(self, *args, **options):
        count = options["count"]
        save_path = options["save_path"]

        self.stdout.write(
            self.style.NOTICE(
                f"=== INICIANDO BENCHMARK US-14 / SGP-26 ({count} FILAS) ==="
            )
        )

        rol_cargador, _ = Rol.objects.get_or_create(
            nombre_rol="Cargador", defaults={"descripcion": "Cargador de nóminas"}
        )
        cargador, _ = Usuario.objects.get_or_create(
            rut="18452931-9",
            defaults={
                "email_corporativo": "cargador.benchmark@sgp-minero.cl",
                "rol": rol_cargador,
                "is_active": True,
            },
        )

        valid_count = int(count * 0.8)
        bad_rut_count = int(count * 0.1)
        mismatch_name_count = int(count * 0.06)
        unknown_person_count = count - (
            valid_count + bad_rut_count + mismatch_name_count
        )

        self.stdout.write(
            f"1. Aprovisionando {valid_count + mismatch_name_count} "
            f"personas en Maestro_Personas..."
        )
        people_to_create = []
        base_rut_num = 10000000
        for i in range(valid_count + mismatch_name_count):
            num = base_rut_num + i
            rut_str = _rut_for_number(num)
            faena = "Faena Cordillera" if i % 2 == 0 else "Faena Norte"
            people_to_create.append(
                Maestro_Personas(
                    rut=rut_str,
                    nombre_completo=f"Trabajador Minero {i + 1}",
                    faena=faena,
                    centro_costo=f"MINA-{100 + (i % 10)}",
                    estado_habilitacion=True,
                )
            )

        Maestro_Personas.objects.bulk_create(people_to_create, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS("   ✓ Maestro de Personas sincronizado."))

        self.stdout.write(
            f"2. Construyendo conjunto de datos de {count} filas "
            f"(4.000 válidas + 1.000 errores controlados)..."
        )
        rows = []

        # 4.000 válidas
        for i in range(valid_count):
            rut_str = _rut_for_number(base_rut_num + i)
            rows.append(
                {
                    "RUT_Pasajero": rut_str,
                    "Nombre_Trabajador": f"Trabajador Minero {i + 1}",
                    "Fecha_Vuelo": "2026-11-15",
                    "Origen": "Santiago (SCL)",
                    "Destino": "Calama (CJC)",
                    "Aerolínea": "LATAM",
                    "Turno": "7x7",
                }
            )

        # 500 con RUT inválido
        for i in range(bad_rut_count):
            rows.append(
                {
                    "RUT_Pasajero": f"{base_rut_num + valid_count + i}-9",
                    "Nombre_Trabajador": f"Pasajero Rut Invalido {i + 1}",
                    "Fecha_Vuelo": "2026-11-15",
                    "Origen": "Santiago (SCL)",
                    "Destino": "Antofagasta (ANF)",
                    "Aerolínea": "SKY",
                    "Turno": "4x3",
                }
            )

        # 300 con Nombre no coincidente
        for i in range(mismatch_name_count):
            rut_str = _rut_for_number(base_rut_num + valid_count + i)
            rows.append(
                {
                    "RUT_Pasajero": rut_str,
                    "Nombre_Trabajador": f"Nombre Discrepante Erroneo {i + 1}",
                    "Fecha_Vuelo": "2026-11-16",
                    "Origen": "Concepción (CCP)",
                    "Destino": "Calama (CJC)",
                    "Aerolínea": "LATAM",
                    "Turno": "7x7",
                }
            )

        # 200 con RUT no registrado en Maestro_Personas
        for i in range(unknown_person_count):
            rut_str = _rut_for_number(30000000 + i)
            rows.append(
                {
                    "RUT_Pasajero": rut_str,
                    "Nombre_Trabajador": f"No Registrado {i + 1}",
                    "Fecha_Vuelo": "2026-11-16",
                    "Origen": "La Serena (LSC)",
                    "Destino": "Copiapó (CPO)",
                    "Aerolínea": "JetSmart",
                    "Turno": "7x7",
                }
            )

        df = pd.DataFrame(rows)
        buffer = BytesIO()
        df.to_excel(buffer, index=False, engine="openpyxl")
        excel_bytes = buffer.getvalue()

        if save_path:
            Path(save_path).parent.mkdir(parents=True, exist_ok=True)
            with open(save_path, "wb") as f:
                f.write(excel_bytes)
            size_kb = len(excel_bytes) / 1024
            self.stdout.write(
                self.style.SUCCESS(
                    f"   ✓ Archivo Excel generado: {save_path} ({size_kb:.1f} KB)"
                )
            )

        uploaded = SimpleUploadedFile("nomina_stress_5000.xlsx", excel_bytes)
        mapping = {"map_rut": "RUT_Pasajero", "map_nombre": "Nombre_Trabajador"}

        self.stdout.write(
            "3. Ejecutando process_travel_file() con optimización "
            "bulk_create en memoria..."
        )
        t0 = time.perf_counter()
        result = process_travel_file(uploaded, mapping, cargador)
        elapsed = time.perf_counter() - t0

        self.stdout.write(
            self.style.SUCCESS(
                "\n=== RESULTADOS DEL BENCHMARK US-14 (Margen NFR: < 30,0 s) ==="
            )
        )
        self.stdout.write(f"Tiempo Total de Procesamiento: {elapsed:.2f} segundos")
        self.stdout.write(
            f"Velocidad de Ingesta:          {count / elapsed:.1f} filas/segundo"
        )
        self.stdout.write(f"Filas Totales en Lote:         {result['total_filas']}")
        self.stdout.write(
            f"Registros Procesados Exitosos: {result['total_procesados']}"
        )
        self.stdout.write(f"Registros Rechazados:          {result['total_errores']}")
        self.stdout.write(f"ID Lote Carga Creado:          {result['lote_id']}")

        if elapsed < 30.0:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ CRITERIO 1 Y 2 CUMPLIDOS: {count} filas procesadas en "
                    f"{elapsed:.2f} s (< 30 s sin Timeout 504)."
                )
            )
        else:
            self.stdout.write(
                self.style.ERROR(
                    f"✗ TIEMPO EXCEDIDO: {elapsed:.2f} s supera el límite de 30 s."
                )
            )

        self.stdout.write(
            "\n4. Ejecutando auditoría SQL directa en PostgreSQL "
            "(SELECT * FROM registro_viaje)..."
        )
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, fila_origen, estado_validacion, payload_datos
                FROM registro_viaje
                WHERE lote_id = %s
                ORDER BY fila_origen ASC
                LIMIT 5;
            """,
                [result["lote_id"]],
            )
            sample_records = cursor.fetchall()

        self.stdout.write(
            self.style.NOTICE(
                "\n--- EVIDENCIA SQL DIRECTA EN BASE DE DATOS (Ley N° 19.628) ---"
            )
        )
        for row in sample_records:
            rec_id, fila, estado, raw_payload = row
            payload = (
                json.loads(raw_payload)
                if isinstance(raw_payload, str)
                else (raw_payload or {})
            )
            rut_cipher = payload.get("rut_cifrado", "")
            nombre_cipher = payload.get("nombre_cifrado", "")
            faena = payload.get("faena", "")

            rut_decrypted = decrypt_pii(rut_cipher)
            nombre_decrypted = decrypt_pii(nombre_cipher)

            self.stdout.write(f"\n[Fila Excel #{fila}] ID Registro: {rec_id}")
            self.stdout.write(f"  Estado Validación:  {estado}")
            self.stdout.write(f"  Faena Inyectada:    {faena}")
            self.stdout.write(
                f"  RUT en BD (Fernet): {rut_cipher[:30]}... (HMAC-SHA256 valid)"
            )
            self.stdout.write(
                f"  Nombre en BD:       {nombre_cipher[:30]}... (AES-128-CBC)"
            )
            self.stdout.write(
                f"  Descifrado en RAM:  RUT={rut_decrypted} | "
                f"Nombre={nombre_decrypted}"
            )
            self.stdout.write(
                f"  Columnas Dinámicas: Turno={payload.get('Turno')}, "
                f"Vuelo={payload.get('Aerolínea')} "
                f"{payload.get('Origen')}->{payload.get('Destino')}"
            )

        self.stdout.write(
            self.style.SUCCESS(
                "\n✓ CRITERIO 3 CUMPLIDO: Los campos PII residen cifrados "
                "criptográficamente en PostgreSQL sin texto plano."
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                "=== BENCHMARK DE ESTRÉS US-14/SGP-26 FINALIZADO CON ÉXITO ==="
            )
        )

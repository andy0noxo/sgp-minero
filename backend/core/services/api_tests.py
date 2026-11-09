from io import BytesIO

import pandas as pd
from cryptography.fernet import Fernet
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.models import LoteCarga, Maestro_Personas, RegistroViaje, Rol, Usuario


def excel_upload(rows):
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        pd.DataFrame(rows).to_excel(writer, index=False)
    return SimpleUploadedFile("viajes.xlsx", output.getvalue())


class UploadApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.role = Rol.objects.create(nombre_rol="Cargador", descripcion="Carga")
        cls.user = Usuario.objects.create_user(
            rut="12345678-5",
            email_corporativo="cargador@minera.cl",
            password="correct-password",
            rol=cls.role,
        )
        Maestro_Personas.objects.create(
            rut="12345678-5",
            nombre_completo="María Pérez",
            faena="Faena Cordillera",
            centro_costo="MINA-01",
        )

    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/v1/auth/login/",
            {"identifier": self.user.rut, "password": "correct-password"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )

    def test_headers_endpoint_returns_first_row_columns(self):
        response = self.client.post(
            "/api/v1/uploads/headers/",
            {"file": excel_upload([{"Rut": "12345678-5", "Nombre": "María Pérez"}])},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["headers"], ["Rut", "Nombre"])
        self.assertEqual(response.data["data"]["file_summary"]["total_rows"], 1)
        self.assertEqual(response.data["data"]["file_summary"]["total_columns"], 2)
        self.assertIn("Rut", response.data["data"]["column_samples"])
        self.assertEqual(len(response.data["data"]["preview_rows"]), 1)

    @override_settings(AES_SECRET_KEY=Fernet.generate_key().decode())
    def test_process_returns_partial_feedback_and_persists_valid_rows(self):
        response = self.client.post(
            "/api/v1/uploads/process/",
            {
                "file": excel_upload(
                    [
                        {
                            "Rut": "12345678-5",
                            "Nombre": "Maria Perez",
                            "Fecha": "2026-01-01",
                        },
                        {
                            "Rut": "12345678-6",
                            "Nombre": "Persona inválida",
                            "Fecha": "2026-01-02",
                        },
                    ]
                ),
                "mapping": '{"map_rut": "Rut", "map_nombre": "Nombre"}',
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 207)
        self.assertEqual(response.data["data"]["total_procesados"], 1)
        self.assertEqual(response.data["data"]["total_errores"], 1)
        self.assertEqual(
            response.data["data"]["detalle_errores"][0]["code"], "INVALID_RUT"
        )
        self.assertEqual(
            RegistroViaje.objects.get().payload_datos["faena"],
            "Faena Cordillera",
        )
        trace = response.data["data"]["pipeline_trace"]
        self.assertEqual(trace["filas_leidas_excel"], 2)
        self.assertEqual(trace["aprobadas_modulo11"], 1)
        self.assertEqual(trace["rechazadas_modulo11"], 1)
        self.assertEqual(trace["aprobadas_maestro_y_faena"], 1)
        self.assertEqual(trace["campos_pii_cifrados_fernet"], 2)
        self.assertEqual(trace["columnas_dinamicas_jsonb"], ["Fecha"])
        self.assertTrue(trace["ejemplo_token_cifrado"].startswith("gAAAAAB"))

    def test_upload_requires_file(self):
        response = self.client.post("/api/v1/uploads/headers/", {}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "INVALID_FILE")

    @override_settings(AES_SECRET_KEY=Fernet.generate_key().decode())
    def test_upload_history_returns_batch_and_persists_rejection_details(self):
        response = self.client.post(
            "/api/v1/uploads/process/",
            {
                "file": excel_upload(
                    [
                        {
                            "Rut": "12345678-5",
                            "Nombre": "Maria Perez",
                            "Aerolinea": "LATAM",
                        },
                        {
                            "Rut": "12345678-6",
                            "Nombre": "Persona inválida",
                            "Aerolinea": "SKY",
                        },
                    ]
                ),
                "mapping": '{"map_rut": "Rut", "map_nombre": "Nombre"}',
            },
            format="multipart",
        )
        batch_id = response.data["data"]["lote_id"]

        history = self.client.get("/api/v1/uploads/history/")
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.data["data"]["pagination"]["total"], 1)
        self.assertEqual(history.data["data"]["results"][0]["id"], batch_id)
        self.assertEqual(
            history.data["data"]["results"][0]["fecha_termino"] is not None, True
        )
        self.assertEqual(history.data["data"]["summary_kpis"]["total_lotes"], 1)
        self.assertEqual(
            history.data["data"]["summary_kpis"]["total_aprobadas_historico"], 1
        )
        self.assertEqual(
            history.data["data"]["summary_kpis"]["total_rechazadas_historico"], 1
        )

        detail = self.client.get(f"/api/v1/uploads/history/{batch_id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(len(detail.data["data"]["detalle_errores"]), 1)
        self.assertEqual(
            detail.data["data"]["detalle_errores"][0]["code"], "INVALID_RUT"
        )
        self.assertEqual(len(detail.data["data"]["registros_aprobados"]), 1)
        self.assertEqual(
            detail.data["data"]["registros_aprobados"][0]["faena"],
            "Faena Cordillera",
        )
        self.assertEqual(
            detail.data["data"]["registros_aprobados"][0]["datos_dinamicos"],
            {"Aerolinea": "LATAM"},
        )
        self.assertEqual(detail.data["data"]["columnas_dinamicas"], ["Aerolinea"])
        self.assertIn("pipeline_trace", detail.data["data"])
        self.assertEqual(len(detail.data["data"]["filas_tabla"]), 2)

    def test_upload_history_does_not_expose_another_loaders_batch(self):
        other_role = Rol.objects.get(nombre_rol="Cargador")
        other_user = Usuario.objects.create_user(
            rut="11111111-1",
            email_corporativo="otro@minera.cl",
            password="correct-password",
            rol=other_role,
        )
        LoteCarga.objects.create(
            cargador=other_user,
            nombre_archivo_origen="privado.xlsx",
        )
        response = self.client.get("/api/v1/uploads/history/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["pagination"]["total"], 0)

    @override_settings(AES_SECRET_KEY=Fernet.generate_key().decode())
    def test_process_maps_fecha_vuelo_and_strips_midnight_time_and_float_decimals(self):
        from datetime import datetime

        excel_file = excel_upload(
            [
                {
                    "Doc_Identidad": "12345678-5",
                    "Nombres_Pasajero": "María Pérez",
                    "Fecha_Vuelo_Contratista": datetime(2026, 10, 25, 0, 0),
                    "Telefono_Extra": 987654321.0,
                }
            ]
        )
        headers_resp = self.client.post(
            "/api/v1/uploads/headers/",
            {"file": excel_file},
            format="multipart",
        )
        self.assertEqual(headers_resp.status_code, 200)
        self.assertEqual(
            headers_resp.data["data"]["column_samples"]["Fecha_Vuelo_Contratista"],
            ["2026-10-25"],
        )
        self.assertEqual(
            headers_resp.data["data"]["preview_rows"][0]["data"]["Telefono_Extra"],
            "987654321",
        )

        excel_file.seek(0)
        process_resp = self.client.post(
            "/api/v1/uploads/process/",
            {
                "file": excel_file,
                "mapping": (
                    '{"map_rut": "Doc_Identidad", '
                    '"map_nombre": "Nombres_Pasajero", '
                    '"map_fecha_vuelo": "Fecha_Vuelo_Contratista"}'
                ),
            },
            format="multipart",
        )
        self.assertEqual(process_resp.status_code, 200)
        rec = RegistroViaje.objects.get()
        self.assertEqual(rec.payload_datos["fecha_vuelo"], "2026-10-25")
        self.assertNotIn("Fecha_Vuelo_Contratista", rec.payload_datos)
        self.assertEqual(rec.payload_datos["Telefono_Extra"], 987654321)
        self.assertEqual(
            process_resp.data["data"]["pipeline_trace"]["columnas_dinamicas_jsonb"],
            ["Telefono_Extra"],
        )

    @override_settings(AES_SECRET_KEY=Fernet.generate_key().decode())
    def test_process_maps_optional_mining_columns_master_fields_and_extra_jsonb(self):
        excel_file = excel_upload(
            [
                {
                    "RUN_Operario": "12345678-5",
                    "Pasajero": "María Pérez",
                    "Tramo_Fecha": "2026-11-20 Charter LA-901 07:15",
                    "Ciudad_Salida": "SCL",
                    "Aerodromo_Destino": "CJC",
                    "Turno_Rotativo": "7x7",
                    "Codigo_PNR_Extra": "PNR-9988",
                }
            ]
        )
        process_resp = self.client.post(
            "/api/v1/uploads/process/",
            {
                "file": excel_file,
                "mapping": (
                    '{"map_rut": "RUN_Operario", '
                    '"map_nombre": "Pasajero", '
                    '"map_fecha_vuelo": "Tramo_Fecha", '
                    '"map_origen": "Ciudad_Salida", '
                    '"map_destino": "Aerodromo_Destino", '
                    '"map_turno": "Turno_Rotativo"}'
                ),
            },
            format="multipart",
        )
        self.assertEqual(process_resp.status_code, 200)
        rec = RegistroViaje.objects.get()
        self.assertEqual(rec.payload_datos["faena"], "Faena Cordillera")
        self.assertEqual(rec.payload_datos["centro_costo"], "MINA-01")
        self.assertEqual(rec.payload_datos["estado_habilitacion"], "Habilitado")
        self.assertEqual(
            rec.payload_datos["fecha_vuelo"], "2026-11-20 Charter LA-901 07:15"
        )
        self.assertEqual(
            rec.payload_datos["tipo_fecha_vuelo"],
            "Vuelo Chárter / Comercial asignado",
        )
        self.assertEqual(rec.payload_datos["origen"], "SCL")
        self.assertEqual(rec.payload_datos["destino"], "CJC")
        self.assertEqual(rec.payload_datos["turno"], "7x7")
        self.assertEqual(rec.payload_datos["Codigo_PNR_Extra"], "PNR-9988")
        self.assertEqual(
            process_resp.data["data"]["pipeline_trace"]["columnas_dinamicas_jsonb"],
            ["Codigo_PNR_Extra"],
        )

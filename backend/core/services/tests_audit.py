from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import RegistroAuditoria, Rol

Usuario = get_user_model()


class AuditLogApiTests(APITestCase):
    def setUp(self):
        self.role_admin, _ = Rol.objects.get_or_create(
            nombre_rol="Administrador",
            defaults={"descripcion": "Rol de Administrador"},
        )
        self.role_cargador, _ = Rol.objects.get_or_create(
            nombre_rol="Cargador",
            defaults={"descripcion": "Rol de Cargador"},
        )
        self.role_consultor, _ = Rol.objects.get_or_create(
            nombre_rol="Consultor",
            defaults={"descripcion": "Rol de Consultor"},
        )

        self.admin_user = Usuario.objects.create_user(
            rut="18452931-9",
            email_corporativo="admin.audit@sgpminero.cl",
            password="adminpassword123",
            rol=self.role_admin,
            is_active=True,
        )

        self.cargador_user = Usuario.objects.create_user(
            rut="17220104-0",
            email_corporativo="cargador.audit@sgpminero.cl",
            password="cargadorpassword123",
            rol=self.role_cargador,
            is_active=True,
        )

        self.consultor_user = Usuario.objects.create_user(
            rut="16510980-5",
            email_corporativo="consultor.audit@sgpminero.cl",
            password="consultorpassword123",
            rol=self.role_consultor,
            is_active=True,
        )

        # Crear eventos de auditoría variados para pruebas
        self.ev1 = RegistroAuditoria.objects.create(
            usuario=self.admin_user,
            accion="LOGIN_EXITOSO",
            modulo="AUTENTICACION",
            resultado=RegistroAuditoria.Resultado.EXITOSO,
            metadata={"ip": "192.168.1.10", "rol": "Administrador"},
        )

        self.ev2 = RegistroAuditoria.objects.create(
            usuario=None,
            accion="LOGIN_FALLIDO",
            modulo="AUTENTICACION",
            resultado=RegistroAuditoria.Resultado.FALLIDO,
            metadata={
                "ip": "200.75.12.90",
                "motivo": "INVALID_CREDENTIALS",
                "rut": "14.882.301-2",
            },
        )

        self.ev3 = RegistroAuditoria.objects.create(
            usuario=self.cargador_user,
            accion="PROCESAR_CARGA_VIAJES",
            modulo="INGESTA",
            resultado=RegistroAuditoria.Resultado.EXITOSO,
            metadata={
                "lote_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
                "total_procesados": 150,
                "total_errores": 2,
            },
        )

        self.ev4 = RegistroAuditoria.objects.create(
            usuario=self.admin_user,
            accion="CREAR_USUARIO",
            modulo="USUARIOS",
            resultado=RegistroAuditoria.Resultado.EXITOSO,
            metadata={
                "target_rut": "19340112-0",
                "target_email": "n.cortez@sgpminero.cl",
                "rol": "Cargador",
            },
        )

    def test_admin_can_list_audit_logs_and_counts(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/audit-logs/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        body = response.json()["data"]
        self.assertIn("results", body)
        self.assertIn("pagination", body)
        self.assertIn("counts", body)

        self.assertGreaterEqual(body["counts"]["total"], 4)
        self.assertGreaterEqual(body["counts"]["exitosas"], 3)
        self.assertGreaterEqual(body["counts"]["fallidos"], 1)

        first_log = body["results"][0]
        self.assertIn("id", first_log)
        self.assertIn("timestamp", first_log)
        self.assertIn("user", first_log)
        self.assertIn("module", first_log)
        self.assertIn("action", first_log)
        self.assertIn("details", first_log)
        self.assertIn("hash", first_log)
        self.assertIn("status", first_log)
        self.assertTrue(first_log["hash"].endswith("(AES/SHA-256)"))

    def test_audit_filters_by_module_status_search(self):
        self.client.force_authenticate(user=self.admin_user)

        # Filtro por módulo
        res_mod = self.client.get("/api/v1/audit-logs/?modulo=AUTENTICACION")
        self.assertEqual(res_mod.status_code, status.HTTP_200_OK)
        for log in res_mod.json()["data"]["results"]:
            self.assertEqual(log["module"], "AUTENTICACION")

        # Filtro por resultado fallido / peligro
        res_fail = self.client.get("/api/v1/audit-logs/?status=danger")
        self.assertEqual(res_fail.status_code, status.HTTP_200_OK)
        for log in res_fail.json()["data"]["results"]:
            self.assertEqual(log["resultado"], "FALLIDO")

        # Filtro por búsqueda de IP o texto
        res_search = self.client.get("/api/v1/audit-logs/?search=200.75.12.90")
        self.assertEqual(res_search.status_code, status.HTTP_200_OK)
        results = res_search.json()["data"]["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["action"], "LOGIN_FALLIDO")

    def test_audit_export_csv_with_utf8_bom(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/audit-logs/?export=csv")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv; charset=utf-8")
        self.assertIn(
            'attachment; filename="pistas_auditoria.csv"',
            response["Content-Disposition"],
        )

        content = response.content.decode("utf-8")
        # Verificar firma UTF-8 BOM
        self.assertTrue(content.startswith("\ufeff"))
        self.assertIn('"ID Evento"', content)
        self.assertIn('"Usuario Responsable"', content)
        self.assertIn('"Firma Criptográfica"', content)
        self.assertIn("LOGIN_EXITOSO", content)

        # Verificar que se registró la traza de exportación en auditoría
        export_audit = RegistroAuditoria.objects.filter(
            accion="EXPORTAR_AUDITORIA", modulo="AUDITORIA"
        ).first()
        self.assertIsNotNone(export_audit)
        self.assertEqual(export_audit.usuario, self.admin_user)

    def test_audit_read_only_405_on_write(self):
        self.client.force_authenticate(user=self.admin_user)

        # POST no permitido -> 405
        res_post = self.client.post("/api/v1/audit-logs/", data={}, format="json")
        self.assertEqual(res_post.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # PUT no permitido -> 405
        res_put = self.client.put("/api/v1/audit-logs/", data={}, format="json")
        self.assertEqual(res_put.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # DELETE no permitido -> 405
        res_del = self.client.delete("/api/v1/audit-logs/")
        self.assertEqual(res_del.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_non_admin_forbidden_403(self):
        # Cargador bloqueado con 403
        self.client.force_authenticate(user=self.cargador_user)
        res_cargador = self.client.get("/api/v1/audit-logs/")
        self.assertEqual(res_cargador.status_code, status.HTTP_403_FORBIDDEN)

        # Consultor bloqueado con 403
        self.client.force_authenticate(user=self.consultor_user)
        res_consultor = self.client.get("/api/v1/audit-logs/")
        self.assertEqual(res_consultor.status_code, status.HTTP_403_FORBIDDEN)

        # No autenticado con 401
        self.client.logout()
        res_unauth = self.client.get("/api/v1/audit-logs/")
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_no_passenger_pii_in_audit_logs(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/audit-logs/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["data"]["results"]

        for log in results:
            # Nunca exponer contraseñas
            self.assertNotIn("password", str(log).lower())
            self.assertNotIn("password_hash", str(log).lower())
            # En eventos de ingesta no debe figurar la nómina de pasajeros en claro
            if log["module"] in ("INGESTA", "CARGA_VIAJES"):
                self.assertNotIn("rut_pasajero", log["details"].lower())
                self.assertNotIn("nombre_pasajero", log["details"].lower())

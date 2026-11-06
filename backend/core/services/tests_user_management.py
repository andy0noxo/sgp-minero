from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Maestro_Personas, RegistroAuditoria, Rol

Usuario = get_user_model()


class UserManagementApiTests(APITestCase):
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
            email_corporativo="admin.test@sgpminero.cl",
            password="adminpassword123",
            rol=self.role_admin,
            is_active=True,
        )

        self.cargador_user = Usuario.objects.create_user(
            rut="17220104-0",
            email_corporativo="cargador.test@sgpminero.cl",
            password="cargadorpassword123",
            rol=self.role_cargador,
            is_active=True,
        )

        self.consultor_user = Usuario.objects.create_user(
            rut="16510980-5",
            email_corporativo="consultor.test@sgpminero.cl",
            password="consultorpassword123",
            rol=self.role_consultor,
            is_active=True,
        )

        Maestro_Personas.objects.create(
            rut="18452931-9",
            nombre_completo="Ángel Frei Cepeda",
            faena="Faena Cordillera",
            centro_costo="ADMIN",
            estado_habilitacion=True,
        )

    def test_admin_can_list_users_and_filter(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()["data"]
        self.assertIn("results", body)
        self.assertIn("counts", body)
        self.assertGreaterEqual(body["counts"]["total"], 3)
        self.assertGreaterEqual(body["counts"]["admins"], 1)

        # Filter by search
        search_res = self.client.get("/api/v1/users/?search=cargador.test")
        self.assertEqual(search_res.status_code, status.HTTP_200_OK)
        results = search_res.json()["data"]["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["email"], "cargador.test@sgpminero.cl")

        # Filter by role
        role_res = self.client.get("/api/v1/users/?role=cargador")
        self.assertEqual(role_res.status_code, status.HTTP_200_OK)
        for u in role_res.json()["data"]["results"]:
            self.assertEqual(u["role"], "Cargador")

    def test_admin_creates_user_successfully_with_argon2_and_audit(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "name": "Noelia Cortez",
            "rut": "19.340.112-0",
            "email": "n.cortez@sgpminero.cl",
            "role": "cargador",
            "faena": "Faena Central",
            "password": "PasswordSegura2026!",
        }
        response = self.client.post("/api/v1/users/", data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        res_data = response.json()["data"]

        self.assertEqual(res_data["rut"], "19340112-0")
        self.assertEqual(res_data["email"], "n.cortez@sgpminero.cl")
        self.assertEqual(res_data["role"], "Cargador")
        self.assertNotIn("password", res_data)
        self.assertNotIn("password_hash", res_data)

        # Verificar guardado en DB con hash Argon2
        created_user = Usuario.objects.get(rut="19340112-0")
        self.assertTrue(created_user.password.startswith("argon2"))
        self.assertTrue(created_user.check_password("PasswordSegura2026!"))

        # Verificar registro en Maestro_Personas
        person = Maestro_Personas.objects.filter(rut="19340112-0").first()
        self.assertIsNotNone(person)
        self.assertEqual(person.nombre_completo, "noelia cortez")
        self.assertEqual(person.faena, "Faena Central")

        # Verificar auditoría
        audit = RegistroAuditoria.objects.filter(
            accion="CREAR_USUARIO", metadata__target_rut="19340112-0"
        ).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.usuario, self.admin_user)

    def test_create_user_validates_rut_modulo_11_and_duplicate(self):
        self.client.force_authenticate(user=self.admin_user)

        # RUT inválido por dígito verificador
        bad_rut_res = self.client.post(
            "/api/v1/users/",
            data={
                "rut": "12.345.678-6",
                "email": "bad.rut@sgpminero.cl",
                "password": "Password123!",
                "role": "consultor",
            },
            format="json",
        )
        self.assertEqual(bad_rut_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(bad_rut_res.json()["error"]["code"], "INVALID_RUT")

        # RUT duplicado
        dup_rut_res = self.client.post(
            "/api/v1/users/",
            data={
                "rut": "18.452.931-9",
                "email": "other.email@sgpminero.cl",
                "password": "Password123!",
                "role": "consultor",
            },
            format="json",
        )
        self.assertEqual(dup_rut_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(dup_rut_res.json()["error"]["code"], "DUPLICATE_RUT")

        # Email duplicado
        dup_email_res = self.client.post(
            "/api/v1/users/",
            data={
                "rut": "15.820.441-K",
                "email": "admin.test@sgpminero.cl",
                "password": "Password123!",
                "role": "consultor",
            },
            format="json",
        )
        self.assertEqual(dup_email_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(dup_email_res.json()["error"]["code"], "DUPLICATE_EMAIL")

        # Contraseña corta (< 8)
        short_pwd_res = self.client.post(
            "/api/v1/users/",
            data={
                "rut": "15.820.441-K",
                "email": "short.pwd@sgpminero.cl",
                "password": "short",
                "role": "consultor",
            },
            format="json",
        )
        self.assertEqual(short_pwd_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(short_pwd_res.json()["error"]["code"], "INVALID_PASSWORD")

    def test_admin_can_toggle_is_active_and_update_role(self):
        self.client.force_authenticate(user=self.admin_user)

        # Deactivate cargador
        patch_res = self.client.patch(
            f"/api/v1/users/{self.cargador_user.id}/",
            data={"is_active": False, "role": "consultor"},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertFalse(patch_res.json()["data"]["is_active"])
        self.assertEqual(patch_res.json()["data"]["role"], "Consultor")

        self.cargador_user.refresh_from_db()
        self.assertFalse(self.cargador_user.is_active)
        self.assertEqual(self.cargador_user.rol.nombre_rol, "Consultor")

        # Audit recorded
        audit = RegistroAuditoria.objects.filter(
            accion="ACTUALIZAR_USUARIO", metadata__target_rut=self.cargador_user.rut
        ).first()
        self.assertIsNotNone(audit)

    def test_admin_cannot_deactivate_self(self):
        self.client.force_authenticate(user=self.admin_user)
        patch_res = self.client.patch(
            f"/api/v1/users/{self.admin_user.id}/",
            data={"is_active": False},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(patch_res.json()["error"]["code"], "CANNOT_DEACTIVATE_SELF")

    def test_admin_cannot_demote_self(self):
        self.client.force_authenticate(user=self.admin_user)
        patch_res = self.client.patch(
            f"/api/v1/users/{self.admin_user.id}/",
            data={"role": "cargador"},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(patch_res.json()["error"]["code"], "CANNOT_DEMOTE_SELF")

    def test_last_admin_protection(self):
        # Create a second admin to allow tests without premature trigger
        second_admin = Usuario.objects.create_user(
            rut="15820441-K",
            email_corporativo="second.admin@sgpminero.cl",
            password="adminpassword456",
            rol=self.role_admin,
            is_active=True,
        )

        self.client.force_authenticate(user=self.admin_user)

        # Deactivate second admin -> now only 1 admin remains active
        res1 = self.client.patch(
            f"/api/v1/users/{second_admin.id}/",
            data={"is_active": False},
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Reactivate second admin
        res2 = self.client.patch(
            f"/api/v1/users/{second_admin.id}/",
            data={"is_active": True},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

        # Now, if we switch login to second_admin and attempt to deactivate admin_user,
        # it succeeds because second_admin is active.
        self.client.force_authenticate(user=second_admin)
        res3 = self.client.patch(
            f"/api/v1/users/{self.admin_user.id}/",
            data={"is_active": False},
            format="json",
        )
        self.assertEqual(res3.status_code, status.HTTP_200_OK)

        # But now, if another user attempts to deactivate the last active admin:
        second_admin.refresh_from_db()
        self.admin_user.refresh_from_db()
        # admin_user is inactive. second_admin is the ONLY active admin.
        # Test LAST_ADMIN_PROTECTION directly via service:
        from core.services.api_errors import UploadValidationError
        from core.services.user_management import update_user_with_audit

        with self.assertRaises(UploadValidationError) as ctx:
            update_user_with_audit(
                second_admin.id,
                {"is_active": False},
                actor_user=self.cargador_user,  # actor is not second_admin
            )
        self.assertEqual(ctx.exception.code, "LAST_ADMIN_PROTECTION")

    def test_non_admin_forbidden(self):
        self.client.force_authenticate(user=self.cargador_user)
        list_res = self.client.get("/api/v1/users/")
        self.assertEqual(list_res.status_code, status.HTTP_403_FORBIDDEN)

        post_res = self.client.post("/api/v1/users/", data={}, format="json")
        self.assertEqual(post_res.status_code, status.HTTP_403_FORBIDDEN)

        patch_res = self.client.patch(
            f"/api/v1/users/{self.admin_user.id}/", data={}, format="json"
        )
        self.assertEqual(patch_res.status_code, status.HTTP_403_FORBIDDEN)

        # Unauthenticated
        self.client.logout()
        unauth_res = self.client.get("/api/v1/users/")
        self.assertEqual(unauth_res.status_code, status.HTTP_401_UNAUTHORIZED)

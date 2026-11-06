import hashlib

from rest_framework import serializers

from .models import Maestro_Personas, RegistroAuditoria, Usuario


class AuthUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ("id", "rut", "email_corporativo", "role")

    def get_role(self, obj):
        return obj.rol.nombre_rol if obj.rol else None


class UserManagementSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    nombre = serializers.SerializerMethodField()
    faena = serializers.SerializerMethodField()
    last_login_formatted = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = (
            "id",
            "rut",
            "email_corporativo",
            "role",
            "nombre",
            "faena",
            "is_active",
            "is_staff",
            "last_login_formatted",
            "failed_login_attempts",
        )

    def get_role(self, obj):
        return obj.rol.nombre_rol if obj.rol else None

    def get_nombre(self, obj):
        person = Maestro_Personas.objects.filter(rut=obj.rut).first()
        if person and person.nombre_completo:
            return person.nombre_completo.title()
        prefix = obj.email_corporativo.split("@")[0].replace(".", " ").replace("_", " ")
        return prefix.title()

    def get_faena(self, obj):
        person = Maestro_Personas.objects.filter(rut=obj.rut).first()
        return person.faena if person else "Todas las faenas"

    def get_last_login_formatted(self, obj):
        if not obj.last_login:
            return "Sin ingresos"
        return obj.last_login.strftime("%Y-%m-%d %H:%M")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["name"] = data["nombre"]
        data["email"] = data["email_corporativo"]
        data["status"] = "active" if instance.is_active else "inactive"
        data["lastLogin"] = data["last_login_formatted"]
        return data


class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    rut = serializers.SerializerMethodField()
    ip = serializers.SerializerMethodField()
    details = serializers.SerializerMethodField()
    hash = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    timestamp = serializers.SerializerMethodField()
    module = serializers.CharField(source="modulo")
    action = serializers.CharField(source="accion")

    class Meta:
        model = RegistroAuditoria
        fields = (
            "id",
            "timestamp",
            "user",
            "rut",
            "ip",
            "module",
            "action",
            "details",
            "hash",
            "status",
            "resultado",
            "metadata",
        )

    def get_user(self, obj):
        if obj.usuario:
            role = obj.usuario.rol.nombre_rol.lower() if obj.usuario.rol else "usuario"
            email_name = (
                obj.usuario.email_corporativo.split("@")[0]
                .replace(".", " ")
                .replace("_", " ")
                .title()
            )
            return f"{email_name} ({role})"
        return "Sistema / Desconocido"

    def get_rut(self, obj):
        if obj.usuario:
            return obj.usuario.rut
        return obj.metadata.get("target_rut") or obj.metadata.get("rut") or "—"

    def get_ip(self, obj):
        return obj.metadata.get("ip") or "127.0.0.1"

    def get_timestamp(self, obj):
        return obj.creado_en.strftime("%Y-%m-%d %H:%M:%S")

    def get_status(self, obj):
        if obj.resultado == "EXITOSO":
            if (
                obj.metadata.get("total_errores", 0) > 0
                or obj.metadata.get("total_rechazados", 0) > 0
            ):
                return "warning"
            return "success"
        return "danger"

    def get_details(self, obj):
        if obj.modulo == "AUTENTICACION":
            motivo = obj.metadata.get("motivo", "")
            if obj.accion == "LOGIN_EXITOSO":
                return "Inicio de sesión corporativo exitoso con token seguro."
            if obj.accion == "LOGIN_BLOQUEADO":
                return (
                    "Acceso denegado: cuenta temporalmente bloqueada "
                    "por exceso de intentos."
                )
            if obj.accion == "CUENTA_BLOQUEADA":
                return (
                    "3 intentos consecutivos con contraseña incorrecta. "
                    "Cuenta bloqueada preventivamente."
                )
            return f"Intento de acceso denegado ({motivo or 'Credenciales inválidas'})."
        if obj.modulo in ("INGESTA", "CARGA_VIAJES"):
            lote = str(obj.metadata.get("lote_id", ""))[:8]
            tot = obj.metadata.get("total_procesados", 0)
            err = obj.metadata.get("total_errores", 0)
            return (
                f"Nómina procesada (Lote {lote}): {tot} registros válidos "
                f"cifrados con Fernet, {err} rechazados."
            )
        if obj.modulo == "MAESTRO_PERSONAS":
            archivo = obj.metadata.get("nombre_archivo", "archivo")
            creados = obj.metadata.get("total_creados", 0)
            act = obj.metadata.get("total_actualizados", 0)
            err = obj.metadata.get("total_errores", 0)
            return (
                f"Sincronización maestro '{archivo}': {creados} creados, "
                f"{act} actualizados, {err} errores."
            )
        if obj.modulo == "USUARIOS":
            target_rut = obj.metadata.get("target_rut", "")
            target_email = obj.metadata.get("target_email", "")
            act_label = obj.accion.replace("_", " ").lower()
            return f"Gestión de usuario {target_rut} ({target_email}): {act_label}."
        if obj.modulo == "AUDITORIA":
            return (
                f"Exportación de pistas de auditoría: "
                f"{obj.metadata.get('total_exportados', 0)} registros generados en CSV."
            )
        return "Operación del sistema registrada."

    def get_hash(self, obj):
        raw = f"{obj.id}-{obj.creado_en.isoformat()}-{obj.accion}-{obj.resultado}"
        digest = hashlib.sha256(raw.encode()).hexdigest()[:8]
        return f"{digest}... (AES/SHA-256)"

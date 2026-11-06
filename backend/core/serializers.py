from rest_framework import serializers

from .models import Maestro_Personas, Usuario


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

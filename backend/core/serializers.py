from rest_framework import serializers

from .models import Usuario


class AuthUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ('id', 'rut', 'email_corporativo', 'role')

    def get_role(self, obj):
        return obj.rol.nombre_rol if obj.rol else None

from datetime import timedelta

from django.conf import settings
from django.db import models
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import APIException
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import AuthUserSerializer
from .services.rut_validator import RutValidationError, normalize_rut


class AuthenticationApiError(APIException):
    status_code = 401
    default_code = "authentication_failed"

    def __init__(self, code, message):
        self.detail = {"code": code, "message": message}


def _extract_client_ip(request):
    if request is None:
        return None
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        identifier = attrs.get("identifier", "").strip()
        password = attrs.get("password")
        request = self.context.get("request")
        client_ip = _extract_client_ip(request)
        from .models import RegistroAuditoria, Usuario

        rut_identifier = identifier
        try:
            rut_identifier = normalize_rut(identifier)
        except RutValidationError:
            pass

        authentication_error = None
        with transaction.atomic():
            user = (
                Usuario.objects.select_for_update()
                .filter(
                    models.Q(rut__iexact=rut_identifier)
                    | models.Q(email_corporativo__iexact=identifier)
                )
                .first()
            )

            if user is None:
                RegistroAuditoria.objects.create(
                    usuario=None,
                    accion="LOGIN_FALLIDO",
                    modulo="AUTENTICACION",
                    resultado=RegistroAuditoria.Resultado.FALLIDO,
                    metadata={
                        "motivo": "USUARIO_NO_ENCONTRADO",
                        "ip": client_ip,
                    },
                )
                authentication_error = {
                    "code": "INVALID_CREDENTIALS",
                    "message": "Credenciales inválidas.",
                }
            elif user.is_login_locked():
                RegistroAuditoria.objects.create(
                    usuario=user,
                    accion="LOGIN_BLOQUEADO",
                    modulo="AUTENTICACION",
                    resultado=RegistroAuditoria.Resultado.FALLIDO,
                    metadata={
                        "motivo": "ACCOUNT_LOCKED",
                        "intentos_fallidos": user.failed_login_attempts,
                        "locked_until": (
                            user.locked_until.isoformat() if user.locked_until else None
                        ),
                        "ip": client_ip,
                    },
                )
                authentication_error = {
                    "code": "ACCOUNT_LOCKED",
                    "message": "La cuenta está temporalmente bloqueada.",
                }
            elif not user.is_active:
                RegistroAuditoria.objects.create(
                    usuario=user,
                    accion="LOGIN_FALLIDO",
                    modulo="AUTENTICACION",
                    resultado=RegistroAuditoria.Resultado.FALLIDO,
                    metadata={
                        "motivo": "INACTIVE_USER",
                        "ip": client_ip,
                    },
                )
                authentication_error = {
                    "code": "INACTIVE_USER",
                    "message": "El usuario está inactivo.",
                }
            elif not user.check_password(password):
                user.failed_login_attempts += 1
                locked_now = (
                    user.failed_login_attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS
                )
                if locked_now:
                    user.locked_until = timezone.now() + timedelta(
                        minutes=settings.LOGIN_LOCKOUT_MINUTES
                    )
                user.save(update_fields=("failed_login_attempts", "locked_until"))
                RegistroAuditoria.objects.create(
                    usuario=user,
                    accion="CUENTA_BLOQUEADA" if locked_now else "LOGIN_FALLIDO",
                    modulo="AUTENTICACION",
                    resultado=RegistroAuditoria.Resultado.FALLIDO,
                    metadata={
                        "motivo": (
                            "MAX_INTENTOS_SUPERADOS"
                            if locked_now
                            else "INVALID_CREDENTIALS"
                        ),
                        "intentos_fallidos": user.failed_login_attempts,
                        "bloqueada": locked_now,
                        "ip": client_ip,
                    },
                )
                authentication_error = {
                    "code": "INVALID_CREDENTIALS",
                    "message": "Credenciales inválidas.",
                }
            else:
                user.failed_login_attempts = 0
                user.locked_until = None
                user.save(update_fields=("failed_login_attempts", "locked_until"))
                RegistroAuditoria.objects.create(
                    usuario=user,
                    accion="LOGIN_EXITOSO",
                    modulo="AUTENTICACION",
                    resultado=RegistroAuditoria.Resultado.EXITOSO,
                    metadata={
                        "rol": user.rol.nombre_rol if user.rol else None,
                        "ip": client_ip,
                    },
                )

        if authentication_error:
            raise AuthenticationApiError(**authentication_error)

        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.rol.nombre_rol if user.rol else None
        refresh["email"] = user.email_corporativo
        refresh["rut"] = user.rut

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": AuthUserSerializer(user).data,
        }

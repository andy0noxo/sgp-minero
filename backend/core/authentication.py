from datetime import timedelta

from django.conf import settings
from django.db import models
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import APIException
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import AuthUserSerializer


class AuthenticationApiError(APIException):
    status_code = 401
    default_code = 'authentication_failed'

    def __init__(self, code, message):
        self.detail = {'code': code, 'message': message}


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        identifier = attrs.get('identifier', '').strip()
        password = attrs.get('password')
        from .models import Usuario

        authentication_error = None
        with transaction.atomic():
            user = Usuario.objects.select_for_update().filter(
                models.Q(rut__iexact=identifier)
                | models.Q(email_corporativo__iexact=identifier)
            ).first()

            if user is None:
                authentication_error = {
                    'code': 'INVALID_CREDENTIALS',
                    'message': 'Credenciales inválidas.',
                }
            elif user.is_login_locked():
                authentication_error = {
                    'code': 'ACCOUNT_LOCKED',
                    'message': 'La cuenta está temporalmente bloqueada.',
                }
            elif not user.is_active:
                authentication_error = {
                    'code': 'INACTIVE_USER',
                    'message': 'El usuario está inactivo.',
                }
            elif not user.check_password(password):
                user.failed_login_attempts += 1
                if user.failed_login_attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
                    user.locked_until = timezone.now() + timedelta(
                        minutes=settings.LOGIN_LOCKOUT_MINUTES
                    )
                user.save(update_fields=('failed_login_attempts', 'locked_until'))
                authentication_error = {
                    'code': 'INVALID_CREDENTIALS',
                    'message': 'Credenciales inválidas.',
                }
            else:
                user.failed_login_attempts = 0
                user.locked_until = None
                user.save(update_fields=('failed_login_attempts', 'locked_until'))

        if authentication_error:
            raise AuthenticationApiError(**authentication_error)

        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.rol.nombre_rol if user.rol else None
        refresh['email'] = user.email_corporativo
        refresh['rut'] = user.rut

        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': AuthUserSerializer(user).data,
        }

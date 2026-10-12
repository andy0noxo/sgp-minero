from rest_framework.permissions import BasePermission


def _has_role(request, expected_role):
    return (
        request.user.is_authenticated
        and request.user.rol is not None
        and request.user.rol.nombre_rol == expected_role
    )


class IsAdministrador(BasePermission):
    message = 'Se requiere el rol Administrador.'

    def has_permission(self, request, view):
        return _has_role(request, 'Administrador')


class IsCargador(BasePermission):
    message = 'Se requiere el rol Cargador.'

    def has_permission(self, request, view):
        return _has_role(request, 'Cargador')


class IsConsultor(BasePermission):
    message = 'Se requiere el rol Consultor.'

    def has_permission(self, request, view):
        return _has_role(request, 'Consultor')


class IsAdministradorOrConsultor(BasePermission):
    message = 'Se requiere el rol Administrador o Consultor.'

    def has_permission(self, request, view):
        return _has_role(request, 'Administrador') or _has_role(request, 'Consultor')

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import Q

from core.models import Maestro_Personas, RegistroAuditoria, Rol, Usuario
from core.services.api_errors import UploadValidationError
from core.services.rut_validator import RutValidationError, validate_rut


def resolve_role(role_name):
    if not role_name:
        raise UploadValidationError("INVALID_ROLE", "El rol es obligatorio.")
    raw = str(role_name).strip().casefold()
    if raw in {"admin", "administrador"}:
        target = "Administrador"
    elif raw in {"cargador", "cargador de datos"}:
        target = "Cargador"
    elif raw in {"consultor", "auditor", "consultor / auditor"}:
        target = "Consultor"
    else:
        raise UploadValidationError(
            "INVALID_ROLE",
            (
                f"Rol '{role_name}' inválido. "
                "Debe ser Administrador, Cargador o Consultor."
            ),
        )
    role, _ = Rol.objects.get_or_create(
        nombre_rol=target,
        defaults={"descripcion": f"Rol de {target}"},
    )
    return role


def list_users(filters=None):
    filters = filters or {}
    queryset = Usuario.objects.select_related("rol").all().order_by("rut")

    search = (filters.get("search") or "").strip()
    if search:
        queryset = queryset.filter(
            Q(rut__icontains=search) | Q(email_corporativo__icontains=search)
        )

    role_filter = (filters.get("role") or filters.get("rol") or "").strip()
    if role_filter and role_filter.casefold() not in {"all", "todos"}:
        target_role = resolve_role(role_filter)
        queryset = queryset.filter(rol=target_role)

    estado = filters.get("estado") or filters.get("status")
    if estado in {"active", "activo", "true", "True", True}:
        queryset = queryset.filter(is_active=True)
    elif estado in {"inactive", "inactivo", "false", "False", False}:
        queryset = queryset.filter(is_active=False)

    users_list = list(queryset)

    # Conteos globales para KPI cards
    all_users = Usuario.objects.select_related("rol").all()
    count_admins = sum(
        1 for u in all_users if u.rol and u.rol.nombre_rol == "Administrador"
    )
    count_cargadores = sum(
        1 for u in all_users if u.rol and u.rol.nombre_rol == "Cargador"
    )
    count_consultores = sum(
        1 for u in all_users if u.rol and u.rol.nombre_rol == "Consultor"
    )

    return {
        "users": users_list,
        "counts": {
            "total": len(all_users),
            "admins": count_admins,
            "cargadores": count_cargadores,
            "consultores": count_consultores,
        },
    }


@transaction.atomic
def create_user_with_audit(data, actor_user):
    raw_rut = data.get("rut")
    if not raw_rut:
        raise UploadValidationError("MISSING_RUT", "El RUT es obligatorio.")
    try:
        normalized_rut = validate_rut(raw_rut)
    except RutValidationError as exc:
        raise UploadValidationError("INVALID_RUT", str(exc)) from exc

    if Usuario.objects.filter(rut=normalized_rut).exists():
        raise UploadValidationError(
            "DUPLICATE_RUT",
            f"Ya existe un usuario registrado con el RUT {normalized_rut}.",
        )

    email = (
        str(data.get("email_corporativo") or data.get("email") or "").strip().lower()
    )
    if not email:
        raise UploadValidationError(
            "MISSING_EMAIL", "El correo corporativo es obligatorio."
        )
    try:
        validate_email(email)
    except ValidationError as exc:
        raise UploadValidationError(
            "INVALID_EMAIL", "El formato del correo corporativo no es válido."
        ) from exc

    if Usuario.objects.filter(email_corporativo__iexact=email).exists():
        raise UploadValidationError(
            "DUPLICATE_EMAIL",
            f"Ya existe un usuario registrado con el correo {email}.",
        )

    password = str(data.get("password") or "").strip()
    if not password or len(password) < 8:
        raise UploadValidationError(
            "INVALID_PASSWORD",
            "La contraseña es obligatoria y debe contener al menos 8 caracteres.",
        )

    role_input = data.get("role") or data.get("rol")
    role_obj = resolve_role(role_input)
    is_active = bool(data.get("is_active", True))

    user = Usuario.objects.create_user(
        rut=normalized_rut,
        email_corporativo=email,
        password=password,
        rol=role_obj,
        is_active=is_active,
    )

    name = str(data.get("name") or data.get("nombre") or "").strip()
    faena = str(data.get("faena") or "").strip()
    if name:
        person = Maestro_Personas.objects.filter(rut=normalized_rut).first()
        if person:
            person.nombre_completo = name
            if faena:
                person.faena = faena
            person.save()
        else:
            Maestro_Personas.objects.create(
                rut=normalized_rut,
                nombre_completo=name,
                faena=faena or "Todas las faenas",
                centro_costo="ADMIN",
                estado_habilitacion=True,
            )

    RegistroAuditoria.objects.create(
        usuario=actor_user if actor_user and actor_user.is_authenticated else None,
        accion="CREAR_USUARIO",
        modulo="USUARIOS",
        resultado=RegistroAuditoria.Resultado.EXITOSO,
        metadata={
            "target_rut": user.rut,
            "target_email": user.email_corporativo,
            "rol": role_obj.nombre_rol,
            "is_active": user.is_active,
        },
    )

    return user


@transaction.atomic
def update_user_with_audit(user_id, data, actor_user):
    target_user = Usuario.objects.filter(id=user_id).first()
    if not target_user:
        raise UploadValidationError(
            "USER_NOT_FOUND", "El usuario especificado no existe."
        )

    changes = {}

    # Protección de auto-desactivación
    if "is_active" in data:
        new_active = bool(data["is_active"])
        if target_user.id == actor_user.id and not new_active:
            raise UploadValidationError(
                "CANNOT_DEACTIVATE_SELF",
                "No puedes desactivar tu propia cuenta de Administrador.",
            )

        # Protección del último Administrador activo
        if (
            target_user.rol
            and target_user.rol.nombre_rol == "Administrador"
            and target_user.is_active
            and not new_active
        ):
            active_admins = (
                Usuario.objects.filter(rol__nombre_rol="Administrador", is_active=True)
                .exclude(id=target_user.id)
                .count()
            )
            if active_admins == 0:
                raise UploadValidationError(
                    "LAST_ADMIN_PROTECTION",
                    (
                        "No es posible desactivar al único "
                        "Administrador activo del sistema."
                    ),
                )

        if target_user.is_active != new_active:
            changes["is_active"] = {
                "antes": target_user.is_active,
                "despues": new_active,
            }
            target_user.is_active = new_active

    # Modificación de rol
    if "role" in data or "rol" in data:
        role_input = data.get("role") or data.get("rol")
        new_role = resolve_role(role_input)

        if target_user.id == actor_user.id and new_role.nombre_rol != "Administrador":
            raise UploadValidationError(
                "CANNOT_DEMOTE_SELF",
                "No puedes revocar tu propio rol de Administrador.",
            )

        if (
            target_user.rol
            and target_user.rol.nombre_rol == "Administrador"
            and new_role.nombre_rol != "Administrador"
            and target_user.is_active
        ):
            active_admins = (
                Usuario.objects.filter(rol__nombre_rol="Administrador", is_active=True)
                .exclude(id=target_user.id)
                .count()
            )
            if active_admins == 0:
                raise UploadValidationError(
                    "LAST_ADMIN_PROTECTION",
                    "No es posible degradar al único Administrador activo del sistema.",
                )

        old_role_name = target_user.rol.nombre_rol if target_user.rol else None
        if old_role_name != new_role.nombre_rol:
            changes["rol"] = {
                "antes": old_role_name,
                "despues": new_role.nombre_rol,
            }
            target_user.rol = new_role

    # Actualización opcional de contraseña
    if "password" in data and data["password"]:
        new_password = str(data["password"]).strip()
        if len(new_password) < 8:
            raise UploadValidationError(
                "INVALID_PASSWORD",
                "La contraseña debe contener al menos 8 caracteres.",
            )
        target_user.set_password(new_password)
        changes["password"] = "actualizada"

    # Actualización opcional de email
    if "email_corporativo" in data or "email" in data:
        new_email = (
            str(data.get("email_corporativo") or data.get("email")).strip().lower()
        )
        if new_email and new_email != target_user.email_corporativo:
            try:
                validate_email(new_email)
            except ValidationError as exc:
                raise UploadValidationError(
                    "INVALID_EMAIL",
                    "El formato del correo corporativo no es válido.",
                ) from exc

            if (
                Usuario.objects.filter(email_corporativo__iexact=new_email)
                .exclude(id=target_user.id)
                .exists()
            ):
                raise UploadValidationError(
                    "DUPLICATE_EMAIL",
                    f"Ya existe otro usuario registrado con el correo {new_email}.",
                )
            changes["email_corporativo"] = {
                "antes": target_user.email_corporativo,
                "despues": new_email,
            }
            target_user.email_corporativo = new_email

    if "name" in data or "nombre" in data or "faena" in data:
        new_name = str(data.get("name") or data.get("nombre") or "").strip()
        new_faena = str(data.get("faena") or "").strip()
        person = Maestro_Personas.objects.filter(rut=target_user.rut).first()
        if person:
            if new_name:
                person.nombre_completo = new_name
            if new_faena:
                person.faena = new_faena
            person.save()
            changes["persona"] = {
                "nombre": person.nombre_completo,
                "faena": person.faena,
            }
        elif new_name:
            Maestro_Personas.objects.create(
                rut=target_user.rut,
                nombre_completo=new_name,
                faena=new_faena or "Todas las faenas",
                centro_costo="ADMIN",
                estado_habilitacion=True,
            )
            changes["persona"] = {
                "nombre": new_name,
                "faena": new_faena or "Todas las faenas",
            }

    if changes:
        target_user.save()
        RegistroAuditoria.objects.create(
            usuario=actor_user if actor_user and actor_user.is_authenticated else None,
            accion="ACTUALIZAR_USUARIO",
            modulo="USUARIOS",
            resultado=RegistroAuditoria.Resultado.EXITOSO,
            metadata={
                "target_rut": target_user.rut,
                "target_email": target_user.email_corporativo,
                "cambios": changes,
            },
        )

    return target_user

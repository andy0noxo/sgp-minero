import os

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.models import (
    LoteCarga,
    Maestro_Personas,
    RegistroAuditoria,
    RegistroViaje,
    Rol,
    Usuario,
)


ROLE_DEFINITIONS = {
    "Administrador": "Administración y mantenimiento del maestro de personas",
    "Cargador": "Carga y procesamiento de archivos de viajes",
    "Consultor": "Consulta del dashboard y auditoría",
}

DEMO_MASTER_ROW_COUNT = 600
DEMO_NAMES = (
    "Ana Soto",
    "Juan Pérez",
    "Carlos Muñoz",
    "María González",
    "Pedro Rojas",
    "Sofía Castillo",
    "Diego Morales",
    "Camila Torres",
    "Luis Fuentes",
    "Valentina Herrera",
)
DEMO_COST_CENTERS = ("MINA-01", "MINA-02", "MINA-03", "MINA-04", "MINA-05")
DEMO_FAENAS = ("Faena Cordillera", "Faena Norte", "Faena Central")


def _rut_for_number(number):
    digits = str(number)
    multiplier = 2
    total = 0
    for digit in reversed(digits):
        total += int(digit) * multiplier
        multiplier = 2 if multiplier == 7 else multiplier + 1
    remainder = 11 - (total % 11)
    verifier = "0" if remainder == 11 else "K" if remainder == 10 else str(remainder)
    return f"{digits}-{verifier}"


class BaseCommandWithSeed(BaseCommand):
    def _required_env(self, name):
        value = os.getenv(name, "").strip()
        if not value:
            raise CommandError(
                f"La variable {name} es obligatoria cuando SEED_DEMO_DATA=True."
            )
        return value

    def _get_or_create_user(
        self, *, env_prefix, role, superuser=False, force_reset=False
    ):
        rut = self._required_env(f"{env_prefix}_RUT")
        email = self._required_env(f"{env_prefix}_EMAIL")
        password = self._required_env(f"{env_prefix}_PASSWORD")

        user, created = Usuario.objects.get_or_create(
            rut=rut,
            defaults={
                "email_corporativo": email,
                "rol": role,
                "is_staff": superuser,
                "is_superuser": superuser,
            },
        )
        if created or force_reset:
            user.set_password(password)
        else:
            user.email_corporativo = email
            user.rol = role
            if superuser:
                user.is_staff = True
                user.is_superuser = True
        if force_reset:
            user.email_corporativo = email
            user.rol = role
            user.is_active = True
            user.is_staff = superuser
            user.is_superuser = superuser
            user.failed_login_attempts = 0
            user.locked_until = None
        user.save()
        return user, created

    def _reset_database_state(self, *, seed_user_ruts, keep_demo_master=False):
        viajes_deleted, _ = RegistroViaje.objects.all().delete()
        lotes_deleted, _ = LoteCarga.objects.all().delete()
        auditoria_deleted, _ = RegistroAuditoria.objects.all().delete()
        usuarios_deleted, _ = Usuario.objects.exclude(rut__in=seed_user_ruts).delete()
        if keep_demo_master:
            demo_master_ruts = {
                _rut_for_number(20000000 + index)
                for index in range(DEMO_MASTER_ROW_COUNT)
            }
            maestro_deleted, _ = Maestro_Personas.objects.exclude(
                rut__in=demo_master_ruts
            ).delete()
        else:
            maestro_deleted, _ = Maestro_Personas.objects.all().delete()

        return {
            "viajes": viajes_deleted,
            "lotes": lotes_deleted,
            "auditoria": auditoria_deleted,
            "usuarios_extra": usuarios_deleted,
            "maestro_extra": maestro_deleted,
        }

    def _seed_master_people(self):
        created = 0
        updated = 0
        for index in range(DEMO_MASTER_ROW_COUNT):
            rut = _rut_for_number(20000000 + index)
            demo_name = DEMO_NAMES[index % len(DEMO_NAMES)]
            defaults = {
                "nombre_completo": f"{demo_name} Demo {index + 1}",
                "faena": DEMO_FAENAS[index % len(DEMO_FAENAS)],
                "centro_costo": DEMO_COST_CENTERS[index % len(DEMO_COST_CENTERS)],
                "estado_habilitacion": index % 4 != 0,
            }
            _, was_created = Maestro_Personas.objects.update_or_create(
                rut=rut,
                defaults=defaults,
            )
            if was_created:
                created += 1
            else:
                updated += 1
        return created, updated


class Command(BaseCommandWithSeed):
    help = "Crea datos locales de demostración de forma idempotente."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help=(
                "Limpia cargas previas, viajes, auditoría, usuarios extra y "
                "personas no pertenecientes al seed antes de poblar desde cero."
            ),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force_reset = bool(options.get("reset", False))
        if os.getenv("SEED_DEMO_DATA", "False").strip().lower() not in {
            "1",
            "true",
            "yes",
            "on",
        }:
            self.stdout.write(
                "SEED_DEMO_DATA no está habilitado; se omite el seed local."
            )
            return
        if not settings.DEBUG:
            raise CommandError(
                "seed_demo_data solo puede ejecutarse con DJANGO_DEBUG=True."
            )

        roles = {}
        for name, description in ROLE_DEFINITIONS.items():
            roles[name], _ = Rol.objects.get_or_create(
                nombre_rol=name,
                defaults={"descripcion": description},
            )

        users = [
            ("DJANGO_SUPERUSER", "Administrador", True),
            ("DEMO_CARGADOR", "Cargador", False),
            ("DEMO_CONSULTOR", "Consultor", False),
        ]

        seed_master_enabled = os.getenv(
            "SEED_DEMO_MASTER_DATA", "False"
        ).strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }

        if force_reset:
            seed_user_ruts = {
                self._required_env(f"{env_prefix}_RUT") for env_prefix, _, _ in users
            }
            reset_counts = self._reset_database_state(
                seed_user_ruts=seed_user_ruts,
                keep_demo_master=seed_master_enabled,
            )
            self.stdout.write(
                self.style.WARNING(
                    "Base de datos de desarrollo reiniciada en limpio "
                    f"(viajes eliminados: {reset_counts['viajes']}, "
                    f"lotes: {reset_counts['lotes']}, "
                    f"auditoría: {reset_counts['auditoria']}, "
                    f"usuarios extra: {reset_counts['usuarios_extra']}, "
                    f"maestro extra: {reset_counts['maestro_extra']})."
                )
            )

        created_users = []
        for env_prefix, role_name, superuser in users:
            user, created = self._get_or_create_user(
                env_prefix=env_prefix,
                role=roles[role_name],
                superuser=superuser,
                force_reset=force_reset,
            )
            if created:
                created_users.append(user.email_corporativo)

        master_created = master_updated = 0
        if seed_master_enabled:
            master_created, master_updated = self._seed_master_people()

        self.stdout.write(
            self.style.SUCCESS(
                "Seed local completado. "
                f'Roles disponibles: {", ".join(ROLE_DEFINITIONS)}. '
                f"Usuarios nuevos: {len(created_users)}. "
                f"Maestro demo: {master_created} creados, "
                f"{master_updated} actualizados."
            )
        )

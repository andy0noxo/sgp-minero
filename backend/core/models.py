import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class Rol(models.Model):
    ROLES_CHOICES = [('Administrador', 'Administrador'), ('Cargador', 'Cargador'), ('Consultor', 'Consultor')]
    nombre_rol = models.CharField(max_length=20, choices=ROLES_CHOICES, unique=True)
    descripcion = models.CharField(max_length=255)

    def __str__(self):
        return self.nombre_rol


class UsuarioManager(BaseUserManager):
    def create_user(self, rut, email_corporativo, password=None, **extra_fields):
        if not email_corporativo:
            raise ValueError('El Email corporativo es obligatorio')
        user = self.model(
            rut=rut,
            email_corporativo=self.normalize_email(email_corporativo),
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, rut, email_corporativo, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('El superusuario debe tener is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('El superusuario debe tener is_superuser=True.')
        return self.create_user(rut, email_corporativo, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rut = models.CharField(max_length=12, unique=True, db_index=True)
    email_corporativo = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    rol = models.ForeignKey(Rol, on_delete=models.PROTECT, null=True, blank=True)
    failed_login_attempts = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    objects = UsuarioManager()
    USERNAME_FIELD = 'rut'
    REQUIRED_FIELDS = ['email_corporativo']

    def __str__(self):
        return self.rut

    def is_login_locked(self):
        return self.locked_until is not None and self.locked_until > timezone.now()


class Maestro_Personas(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rut = models.CharField(max_length=12, unique=True, db_index=True)
    nombre_completo = models.CharField(max_length=255)
    faena = models.CharField(max_length=100, default='Sin asignar')
    centro_costo = models.CharField(max_length=100)
    estado_habilitacion = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre_completo

    def save(self, *args, **kwargs):
        if self.nombre_completo:
            self.nombre_completo = self.nombre_completo.lower()
        super().save(*args, **kwargs)


class LoteCarga(models.Model):
    class Estado(models.TextChoices):
        PROCESANDO = 'PROCESANDO', 'Procesando'
        COMPLETADO = 'COMPLETADO', 'Completado'
        COMPLETADO_CON_ERRORES = 'COMPLETADO_CON_ERRORES', 'Completado con errores'
        FALLIDO = 'FALLIDO', 'Fallido'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cargador = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='lotes_carga')
    nombre_archivo_origen = models.CharField(max_length=255)
    estado = models.CharField(max_length=30, choices=Estado.choices, default=Estado.PROCESANDO)
    total_filas = models.PositiveIntegerField(default=0)
    filas_procesadas = models.PositiveIntegerField(default=0)
    filas_rechazadas = models.PositiveIntegerField(default=0)
    detalle_errores = models.JSONField(default=list, blank=True)
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_termino = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'lote_carga'
        ordering = ('-fecha_inicio',)


class RegistroViaje(models.Model):
    class EstadoValidacion(models.TextChoices):
        APROBADO = 'APROBADO', 'Aprobado'
        RECHAZADO = 'RECHAZADO', 'Rechazado'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lote = models.ForeignKey(LoteCarga, on_delete=models.PROTECT, related_name='registros')
    cargador = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='registros_viaje')
    nombre_archivo_origen = models.CharField(max_length=255)
    fila_origen = models.PositiveIntegerField()
    fecha_procesamiento = models.DateTimeField(auto_now_add=True)
    estado_validacion = models.CharField(max_length=15, choices=EstadoValidacion.choices)
    motivo_rechazo = models.CharField(max_length=255, blank=True)
    payload_datos = models.JSONField(default=dict)

    class Meta:
        db_table = 'registro_viaje'
        ordering = ('-fecha_procesamiento',)
        indexes = [
            models.Index(fields=('estado_validacion', 'fecha_procesamiento')),
            models.Index(fields=('cargador', 'fecha_procesamiento')),
        ]


class RegistroAuditoria(models.Model):
    class Resultado(models.TextChoices):
        EXITOSO = 'EXITOSO', 'Exitoso'
        FALLIDO = 'FALLIDO', 'Fallido'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        related_name='eventos_auditoria',
        null=True,
        blank=True,
    )
    accion = models.CharField(max_length=100)
    modulo = models.CharField(max_length=100)
    resultado = models.CharField(max_length=10, choices=Resultado.choices)
    metadata = models.JSONField(default=dict, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'registro_auditoria'
        ordering = ('-creado_en',)

import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

# 1. TABLA PARAMÉTRICA: ROL
class Rol(models.Model):
    ROLES_CHOICES = [
        ('Administrador', 'Administrador'),
        ('Cargador', 'Cargador'),
        ('Consultor', 'Consultor'),
    ]
    nombre_rol = models.CharField(max_length=20, choices=ROLES_CHOICES, unique=True)
    descripcion = models.CharField(max_length=255)

    def __str__(self):
        return self.nombre_rol

# Gestor de usuarios ACTUALIZADO
class UsuarioManager(BaseUserManager):
    def create_user(self, rut, email_corporativo, password=None, **extra_fields):
        if not email_corporativo:
            raise ValueError('El Email corporativo es obligatorio')
        email_corporativo = self.normalize_email(email_corporativo)
        user = self.model(rut=rut, email_corporativo=email_corporativo, **extra_fields)
        user.set_password(password) 
        user.save(using=self._db)
        return user

    def create_superuser(self, rut, email_corporativo, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(rut, email_corporativo, password, **extra_fields)

# 2. TABLA TRANSACCIONAL: USUARIO ACTUALIZADA
class Usuario(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rut = models.CharField(max_length=12, unique=True, db_index=True)
    email_corporativo = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False) # Obligatorio para poder entrar al panel /admin
    rol = models.ForeignKey(Rol, on_delete=models.PROTECT, null=True, blank=True)

    objects = UsuarioManager()

    USERNAME_FIELD = 'rut'
    REQUIRED_FIELDS = ['email_corporativo']

    def __str__(self):
        return self.rut

# 3. TABLA DE VALIDACIÓN: MAESTRO PERSONAS
class Maestro_Personas(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rut = models.CharField(max_length=12, unique=True, db_index=True)
    nombre_completo = models.CharField(max_length=255)
    centro_costo = models.CharField(max_length=100)
    estado_habilitacion = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre_completo

    def save(self, *args, **kwargs):
        if self.nombre_completo:
            self.nombre_completo = self.nombre_completo.lower()
        super().save(*args, **kwargs)
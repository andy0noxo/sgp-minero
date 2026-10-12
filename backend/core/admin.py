from django.contrib import admin

from .models import (
    LoteCarga,
    Maestro_Personas,
    RegistroAuditoria,
    RegistroViaje,
    Rol,
    Usuario,
)

admin.site.register(
    (Rol, Usuario, Maestro_Personas, LoteCarga, RegistroViaje, RegistroAuditoria)
)

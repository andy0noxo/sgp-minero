# PostgreSQL y persistencia

PostgreSQL es un servicio independiente del backend y del frontend. En
desarrollo se ejecuta mediante el servicio `db` (`postgres:15-alpine`) de
[`docker-compose.yml`](../docker-compose.yml); en producción puede reemplazarse
por PostgreSQL administrado, como Neon (mediante `DATABASE_URL` con SSL), sin
cambiar el dominio del backend.

## Fuente única del esquema

El esquema oficial pertenece a Django y se versiona en
[`backend/core/migrations/`](../backend/core/migrations/) (`0001_initial` a
`0005_maestro_personas_faena`). No se crean tablas duplicadas mediante SQL
manual: esto evita que el esquema de PostgreSQL se desincronice del ORM, las
pruebas y el despliegue.

La carpeta `database` se conserva como frontera de infraestructura para:

- documentar la operación y persistencia de PostgreSQL;
- describir el modelo físico híbrido (relacional + documental `JSONB`);
- centralizar instrucciones de respaldo, restauración o verificación operativa.

La inicialización de roles y usuarios demo pertenece al backend y se ejecuta
mediante `seed_demo_data` cuando `SEED_DEMO_DATA=True` (solo permitido con
`DJANGO_DEBUG=True`); no se deben crear usuarios ni credenciales desde scripts
SQL. Los scripts operativos futuros no deben contener credenciales, datos reales
ni definiciones de tablas que ya pertenezcan a las migraciones.

## Modelo de datos híbrido implementado (6 entidades)

El modelo físico materializado por las migraciones de
[`backend/core/models.py`](../backend/core/models.py) combina integridad
relacional estricta con flexibilidad documental `JSONB`:

| Modelo Django | Tabla en PostgreSQL | PK | Rol y Reglas de Integridad / Seguridad |
| --- | --- | --- | --- |
| `Rol` | `core_rol` | `BigAutoField` | Catálogo paramétrico RBAC (`Administrador`, `Cargador`, `Consultor`). |
| `Usuario` | `core_usuario` | `UUID` | Cuentas corporativas con `rut` único indexado, `email_corporativo` único, hash `Argon2`, `rol_id` (`PROTECT`) y campos anti-fuerza bruta (`failed_login_attempts`, `locked_until`). |
| `Maestro_Personas` | `core_maestro_personas` | `UUID` | Nómina oficial de validación interna: `rut` único indexado, `nombre_completo`, **`faena`** (dimensión operacional obligatoria), `centro_costo` (imputación contable) y `estado_habilitacion`. |
| `LoteCarga` | `lote_carga` | `UUID` | Cabecera transaccional de cada archivo procesado por un `Cargador` (`PROTECT`), totales de filas y `detalle_errores` (`JSONB` libre de PII). |
| `RegistroViaje` | `registro_viaje` | `UUID` | Entidad híbrida central asociada a `Usuario` y `LoteCarga` (`PROTECT`), con `fila_origen`, `estado_validacion`, índices compuestos `(fecha_procesamiento, estado_validacion)` y `(cargador, fecha_procesamiento)`, y columna **`payload_datos` (`JSONB`)** donde el RUT y el Nombre se guardan exclusivamente cifrados con `Fernet` (`AES-128-CBC + HMAC-SHA256`), acompañados de la `faena` y las columnas dinámicas del Excel. |
| `RegistroAuditoria` | `registro_auditoria` | `UUID` | Bitácora inmutable de acciones críticas (`PROCESAR_CARGA_VIAJES`, `IMPORTAR_MAESTRO_PERSONAS`) con `usuario_id` (`SET_NULL`) y `detalles` en `JSONB` sin PII. |

## Creación local con Docker

Desde la raíz del repositorio:

```powershell
docker compose up --build -d
```

En el primer arranque, PostgreSQL crea automáticamente la base definida por
`DB_NAME`. El backend espera el healthcheck del servicio `db` (`pg_isready`) y
ejecuta `python manage.py migrate --noinput` antes de iniciar Django.

La base queda disponible en `localhost:5432` con las credenciales de `.env`.
Si `.env` todavía no existe, Compose utiliza valores de desarrollo seguros para
la prueba local. Para un entorno compartido se debe copiar `.env.example` a
`.env` y reemplazar todas las credenciales y llaves.

Comandos de verificación:

```powershell
docker compose ps
docker compose logs -f db
docker compose exec backend python manage.py showmigrations
docker compose exec backend python manage.py check
docker compose exec backend pytest
docker compose exec db pg_isready -U usuario_local -d sgp_minero_db
curl.exe http://localhost:8000/api/v1/health/
```

Para detener los servicios sin eliminar los datos:

```powershell
docker compose down
```

`docker compose down -v` elimina el volumen `pgdata` y los datos locales;
solo debe utilizarse en un entorno descartable.

## Persistencia y datos

El volumen Docker `pgdata` mantiene los datos entre reinicios. No debe
eliminarse en un entorno con datos que se quieran conservar. Para reiniciar
solamente un entorno local descartable se puede eliminar explícitamente ese
volumen y volver a levantar Compose.

Las credenciales, `AES_SECRET_KEY`, archivos `.env` y datos reales no deben
versionarse. La PII de los viajes se cifra con `Fernet` antes de persistirse en
el campo `JSONB` de `RegistroViaje` (`registro_viaje.payload_datos`), cumpliendo
con la Ley N° 19.628.

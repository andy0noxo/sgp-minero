# Backend API

El backend expone la API versionada bajo `/api/v1/`.

## Estado del backend

Este backend implementa el MVP definido en la documentación ágil de
SGP-Minero y está separado del frontend y de la infraestructura PostgreSQL.
La base de datos se administra mediante las migraciones de Django; no se
duplican definiciones de tablas en archivos SQL.

## Autenticación y autorización

`POST /api/v1/auth/login/` recibe `identifier` (RUT o correo corporativo) y
`password`. Devuelve un access token en JSON y establece el refresh token en
la cookie HttpOnly `sgp_refresh_token` con `SameSite=Strict`.

Las peticiones autenticadas utilizan:

```text
Authorization: Bearer <access-token>
```

`POST /api/v1/auth/refresh/` lee el refresh token desde la cookie y
`GET /api/v1/auth/me/` devuelve el usuario y su rol.

Los roles implementados son `Administrador`, `Cargador` y `Consultor`. La
autorización real se ejecuta en el backend mediante permisos DRF; las
restricciones visuales del frontend no sustituyen estos permisos. Después de
tres intentos inválidos consecutivos, la cuenta se bloquea temporalmente.
Los errores de API mantienen la estructura:

```json
{
  "error": {
    "code": "INVALID_FILTER",
    "message": "Descripción del error",
    "details": {}
  }
}
```

## Carga y procesamiento de viajes

El rol `Cargador` utiliza estos endpoints protegidos:

- `POST /api/v1/uploads/headers/` con el campo multipart `file` para leer
  solamente los encabezados de un archivo `.xlsx`.
- `POST /api/v1/uploads/process/` con los campos multipart `file` y `mapping`.
  El mapper exige `map_rut` y `map_nombre`.

El procesamiento exitoso devuelve `200`. Si existen rechazos parciales,
devuelve `207` y conserva las filas válidas. La respuesta contiene
`total_filas`, `total_procesados`, `total_errores` y `detalle_errores`.

Se validan el formato y el dígito verificador del RUT mediante Módulo 11, la
identidad contra `Maestro_Personas`, los archivos corruptos o vacíos y el
límite de 10 MB. El RUT y el nombre se cifran con Fernet antes de persistirse
en `RegistroViaje.payload_datos` como JSONB.

## Mantenedor masivo de personas

El rol `Administrador` puede sincronizar `Maestro_Personas` mediante
`POST /api/v1/master-persons/import/` usando CSV o XLSX. Las columnas
obligatorias son `rut`, `nombre_completo` y `centro_costo`; 
`estado_habilitacion` es opcional y por defecto queda activa. La respuesta
informa registros creados, actualizados y rechazados, y devuelve `207` si el
resultado es parcial. La operación queda registrada en auditoría.

## Dashboard del Consultor

El rol `Consultor` puede consultar registros procesados mediante:

```text
GET /api/v1/dashboard/records/
```

Los parámetros disponibles son `from`, `to`, `centro_costo`, `estado`, `page`
y `page_size`. El endpoint es de solo lectura. Los datos PII se descifran
únicamente en memoria al construir la respuesta y permanecen cifrados en
PostgreSQL JSONB.

## Salud y despliegue

`GET /api/v1/health/` es un endpoint público de salud para el orquestador o
la plataforma de despliegue. Devuelve `200` cuando Django puede conectarse a
PostgreSQL y `503` cuando la base de datos no está disponible.

La imagen Docker utiliza Gunicorn para producción:

```text
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

En desarrollo, `docker-compose.yml` reemplaza este comando por `runserver`.
Para Render u otra plataforma equivalente se deben configurar las variables
de entorno directamente en el panel de secretos:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=False`
- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_COOKIE_SECURE=True`
- `AES_SECRET_KEY`
- `DATABASE_URL` con conexión PostgreSQL
- `CORS_ALLOWED_ORIGINS`

La configuración de producción activa redirección HTTPS y HSTS. Las llaves,
credenciales y archivos `.env` nunca deben subirse al repositorio. Las
migraciones deben ejecutarse antes de levantar la aplicación:

```text
python manage.py migrate
python manage.py check --deploy
```

## Cobertura de QA

La suite automatizada cubre:

- RUT validation, including valid, invalid, and alphanumeric inputs.
- Name normalization and identity matching.
- Fernet encryption/decryption and invalid configuration handling.
- Excel header parsing and invalid-file handling.
- Upload processing, partial `207` feedback, and persistence.
- Administrator master import, UPSERT behavior, partial errors, and RBAC.
- Consultant dashboard filters, pagination, read-only access, and in-memory
  PII decryption.

La prueba de rendimiento con 5.000 filas queda intencionalmente pendiente y
no forma parte de esta ejecución de QA.

## Dominio y separación de base de datos

El backend modela roles, usuarios, el maestro de personas, lotes de carga,
registros de viaje y eventos de auditoría. `RegistroViaje.payload_datos` es un
`JSONField` de Django almacenado como `JSONB` en PostgreSQL.

PostgreSQL es un servicio independiente. Los cambios de esquema pertenecen a
las migraciones de Django; nunca deben versionarse datos de producción,
credenciales ni llaves de cifrado.

Las entidades principales son `Rol`, `Usuario`, `Maestro_Personas`,
`LoteCarga`, `RegistroViaje` y `RegistroAuditoria`.

## Desarrollo local

Copia `.env.example` a `.env`, completa las variables locales y levanta el
backend mediante Docker Compose. La variable `AES_SECRET_KEY` debe ser una
llave Fernet válida en Base64 URL-safe.

Comandos habituales:

```text
docker compose up --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py check
docker compose exec backend python manage.py test core
```

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

El login acepta el RUT con puntos, guion, sin separadores o con espacios
externos, por ejemplo `12.345.678-5`, `12345678-5` y `123456785`. El backend
normaliza el valor al formato canónico antes de consultar al usuario.

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

En desarrollo, el arranque ejecuta `seed_demo_data` cuando
`SEED_DEMO_DATA=True`. El comando es idempotente, crea los tres roles del MVP,
un superusuario con rol `Administrador`, un usuario `Cargador` y un usuario
`Consultor`. Las contraseñas se leen desde `.env` y no se cambian si los
usuarios ya existen.

El `.env.example` contiene valores de demostración locales:

```env
SEED_DEMO_DATA=True
SEED_DEMO_MASTER_DATA=True
DJANGO_SUPERUSER_RUT=11111111-1
DJANGO_SUPERUSER_EMAIL=admin@minera.local
DJANGO_SUPERUSER_PASSWORD=cambiar-superuser-local
DEMO_CARGADOR_RUT=22222222-2
DEMO_CARGADOR_EMAIL=cargador@minera.local
DEMO_CARGADOR_PASSWORD=cambiar-cargador-local
DEMO_CONSULTOR_RUT=33333333-3
DEMO_CONSULTOR_EMAIL=consultor@minera.local
DEMO_CONSULTOR_PASSWORD=cambiar-consultor-local
```

El seed solo puede ejecutarse con `DJANGO_DEBUG=True`. En producción se debe
usar `SEED_DEMO_DATA=False` y `SEED_DEMO_MASTER_DATA=False`. En ese entorno
el maestro se carga con un archivo real desde el endpoint del Administrador.
El primer usuario administrativo se crea de forma interactiva:

```powershell
docker compose exec backend python manage.py createsuperuser
```

El comando solicita el RUT, correo corporativo y contraseña. No se deben
llevar contraseñas demo ni credenciales compartidas a producción.

Para ejecutar el seed manualmente en desarrollo:

```powershell
docker compose exec backend python manage.py seed_demo_data
```

Con `SEED_DEMO_MASTER_DATA=True` el comando crea 75 personas demo, repartidas
entre `Faena Cordillera`, `Faena Norte` y `Faena Central`, cinco centros de
costo y estados habilitados e inhabilitados para probar paginación y filtros.
Es idempotente, conserva los registros reales y solo actualiza sus RUT demo
deterministas.

Para omitir el seed en un entorno local:

```env
SEED_DEMO_DATA=False
```

## URLs de la API

| Método | Ruta | Permiso |
| --- | --- | --- |
| `GET` | `/api/v1/health/` | Público |
| `POST` | `/api/v1/auth/login/` | Público |
| `POST` | `/api/v1/auth/refresh/` | Cookie de refresh |
| `POST` | `/api/v1/auth/logout/` | Público; elimina la cookie de refresh |
| `GET` | `/api/v1/auth/me/` | Autenticado |
| `POST` | `/api/v1/uploads/headers/` | Cargador |
| `POST` | `/api/v1/uploads/process/` | Cargador |
| `GET` | `/api/v1/uploads/history/` | Cargador |
| `GET` | `/api/v1/uploads/history/<lote_id>/` | Cargador propietario |
| `POST` | `/api/v1/master-persons/import/` | Administrador |
| `GET` | `/api/v1/master-persons/` | Administrador |
| `GET` | `/api/v1/dashboard/records/` | Consultor |

Las rutas protegidas responden `401` sin JWT y `403` cuando el usuario
autenticado no posee el rol requerido. El frontend es una SPA y actualmente usa una única URL web (`/`); sus módulos
se muestran dentro de esa página tras iniciar sesión. El Administrador inicia
en Mantenedor de Personas, el Cargador en Carga Masiva y el Consultor en el
Dashboard. El Dashboard es exclusivo del Consultor, tanto en frontend como en
backend.

El selector superior `Faena` es un filtro operacional del Dashboard. Sus
valores demo son `Faena Cordillera`, `Faena Norte` y `Faena Central`. No
reemplaza al campo `centro_costo`: `faena` identifica la operación minera y
`centro_costo` la imputación contable. Al procesar un viaje, la faena se toma
del registro correspondiente del maestro y se guarda en `payload_datos`.

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

El Cargador puede consultar sus propias cargas mediante:

- `GET /api/v1/uploads/history/` para obtener el historial paginado. Acepta
  `page` y `page_size`, con un máximo de 100 elementos por página.
- `GET /api/v1/uploads/history/<lote_id>/` para consultar el detalle de una
  carga, incluyendo sus filas aprobadas y el detalle persistido de los
  rechazos.

El historial está aislado por usuario: un Cargador no puede consultar lotes de
otro usuario. Los estados, totales y fechas se almacenan en `LoteCarga`; los
rechazos se conservan en `detalle_errores` como JSON y no contienen PII.

## Mantenedor masivo de personas

El rol `Administrador` puede sincronizar `Maestro_Personas` mediante
`POST /api/v1/master-persons/import/` usando CSV o XLSX. Las columnas
obligatorias son `rut`, `nombre_completo`, `faena` y `centro_costo`;
`estado_habilitacion` es opcional y por defecto queda activa. La respuesta
informa registros creados, actualizados y rechazados, y devuelve `207` si el
resultado es parcial. La operación queda registrada en auditoría.

También puede consultar la tabla mediante `GET /api/v1/master-persons/`. La
respuesta es paginada y admite `faena`, `search`, `estado`, `page` y
`page_size`. El frontend muestra este listado debajo del cargador masivo.

## Dashboard del Consultor

El rol `Consultor` puede consultar registros procesados mediante:

```text
GET /api/v1/dashboard/records/
```

Los parámetros disponibles son `from`, `to`, `faena`, `centro_costo`, `estado`,
`page` y `page_size`. El endpoint es de solo lectura. El filtro `faena`
compara contra la faena asociada a la persona en el maestro y propagada al
registro de viaje. Los datos PII se descifran
únicamente en memoria al construir la respuesta y permanecen cifrados en
PostgreSQL JSONB. Cada resultado incluye el archivo de origen, la fila del
Excel, el estado, la fecha de procesamiento y el cargador responsable.
El filtro `estado` solo acepta `APROBADO` o `RECHAZADO`; otros valores devuelven
`400` con el error `INVALID_FILTER`.

El frontend permite filtrar por faena, rango de fechas, centro de costo y
estado (`APROBADO` o `RECHAZADO`). También permite exportar a CSV los registros
actualmente renderizados en la página, sin enviar datos adicionales al
servidor ni persistir el archivo exportado.

## Salud y despliegue

`GET /api/v1/health/` es un endpoint público de salud para el orquestador o
la plataforma de despliegue. Devuelve `200` cuando Django puede conectarse a
PostgreSQL y `503` cuando la base de datos no está disponible.

La imagen Docker utiliza Gunicorn para producción:

```text
python manage.py migrate --noinput
gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000}
```

El script `production_entrypoint.sh` ejecuta las migraciones antes de iniciar
Gunicorn y utiliza el puerto `PORT` entregado por el proveedor cloud. En
desarrollo, `docker-compose.yml` reemplaza este comando por `runserver`.
Para Render u otra plataforma equivalente se deben configurar las variables
de entorno directamente en el panel de secretos:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=False`
- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_COOKIE_SECURE=True`
- `REFRESH_TOKEN_COOKIE_SAMESITE=None` cuando el frontend y backend estén en
  dominios distintos, como Vercel y Render
- `AES_SECRET_KEY`
- `DATABASE_URL` con conexión PostgreSQL
- `CORS_ALLOWED_ORIGINS` con el origen HTTPS exacto de Vercel, sin `/` final

Neon entrega una cadena `DATABASE_URL` que Django consume directamente,
incluyendo sus parámetros SSL. No se deben configurar `DB_HOST`, `DB_NAME`,
`DB_USER` ni `DB_PASSWORD` con valores locales cuando se utilice esa cadena.
`DJANGO_ALLOWED_HOSTS` debe contener el dominio público del backend.

Cuando el frontend y el backend viven en dominios diferentes, el navegador
requiere `credentials: include`, CORS con credenciales y una cookie de refresh
con `Secure=True` y `SameSite=None`. En local se mantiene `SameSite=Strict`
porque ambos servicios se prueban bajo `localhost`.

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
- Upload history, batch detail, rejection persistence, and per-user isolation.
- Administrator master import, UPSERT behavior, partial errors, and RBAC.
- Consultant dashboard filters, pagination, read-only access, and in-memory
  PII decryption.

Para ejecutar todos los archivos de pruebas descubiertos por pytest:

```powershell
docker compose exec backend pytest
```

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

Copia `.env.example` a `.env` desde la raíz y levanta el backend mediante
Docker Compose. En Windows PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

Las variables `DJANGO_SECRET_KEY` y `AES_SECRET_KEY` se leen desde el archivo
`.env` ubicado en la raíz del repositorio. No se configuran en `settings.py` ni
en el frontend.

`DJANGO_SECRET_KEY` debe ser una cadena aleatoria, privada y larga. No requiere
un formato Base64 concreto. Puedes generar una con:

```powershell
docker compose run --rm backend python -c "import secrets; print(secrets.token_urlsafe(64))"
```

`AES_SECRET_KEY` debe ser una llave Fernet válida: 32 bytes aleatorios
codificados en Base64 URL-safe. Para generarla usando el contenedor:

```powershell
docker compose run --rm backend python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Pega cada resultado en su variable correspondiente dentro de `.env`. La llave
Fernet no debe cambiar mientras existan registros cifrados, porque los datos
anteriores dejarían de poder descifrarse. Usa claves diferentes para local,
staging y producción; las claves de producción deben registrarse en el panel
de secretos del proveedor y nunca versionarse.

Comandos habituales desde la raíz:

```powershell
docker compose ps
docker compose logs -f backend
curl.exe http://localhost:8000/api/v1/health/
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py showmigrations
docker compose exec backend python manage.py check
docker compose exec backend python manage.py check --deploy
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py makemigrations --check --dry-run
docker compose exec backend python manage.py test core
docker compose exec backend python manage.py test core.services.api_tests
docker compose down
```

El servicio `backend` ejecuta `migrate --noinput` automáticamente mediante
`backend/entrypoint.sh` antes de iniciar `runserver`. La imagen define
Gunicorn para producción, pero Compose utiliza `runserver` en local.

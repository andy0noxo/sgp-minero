# Backend API

El backend expone la API versionada bajo `/api/v1/`.

## Estado del backend

Este backend implementa el MVP definido en la documentación ágil de
SGP-Minero y está separado del frontend y de la infraestructura PostgreSQL.
La base de datos se administra mediante las migraciones de Django; no se
duplican definiciones de tablas en archivos SQL.

## Autenticación y autorización

`POST /api/v1/auth/login/` recibe `identifier` (RUT o correo corporativo) y
`password`. Valida la contraseña utilizando **`Argon2PasswordHasher`**
(`argon2-cffi`) como algoritmo primario, devuelve un `access` token en JSON
(para mantener exclusivamente en memoria RAM del cliente) y establece el
`refresh` token en la cookie `HttpOnly` `sgp_refresh_token` (`SameSite=Strict`
por defecto en entorno local y configurable mediante
`REFRESH_TOKEN_COOKIE_SAMESITE=None` + `DJANGO_COOKIE_SECURE=True` en entornos
Cloud cross-origin).

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
autorización real se ejecuta en el backend mediante permisos DRF
(`IsAdministradorRole`, `IsCargadorRole`, `IsConsultorRole`); las restricciones
visuales y rutas del frontend no sustituyen estos permisos. Después de tres
intentos inválidos consecutivos (`MAX_FAILED_LOGIN_ATTEMPTS=3`), la cuenta se
bloquea temporalmente durante cinco minutos (`LOGIN_LOCKOUT_MINUTES=5`) de forma
transaccional (`select_for_update()`). Los errores de API mantienen la
estructura:

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

El `.env.example` declara la estructura de variables de demostración locales con las contraseñas vacías para que cada desarrollador defina las suyas en `.env`:

```env
SEED_DEMO_DATA=True
SEED_DEMO_MASTER_DATA=True
DJANGO_SUPERUSER_RUT=11111111-1
DJANGO_SUPERUSER_EMAIL=admin@minera.local
DJANGO_SUPERUSER_PASSWORD=
DEMO_CARGADOR_RUT=22222222-2
DEMO_CARGADOR_EMAIL=cargador@minera.local
DEMO_CARGADOR_PASSWORD=
DEMO_CONSULTOR_RUT=33333333-3
DEMO_CONSULTOR_EMAIL=consultor@minera.local
DEMO_CONSULTOR_PASSWORD=
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

Las rutas protegidas responden `401` sin JWT, `403` cuando el usuario
autenticado no posee el rol requerido y `405` ante métodos HTTP no habilitados.
El frontend es una SPA React/Vite enrutada con `react-router-dom`
(`BrowserRouter` + `ProtectedRoute`) sobre `/`, `/carga`, `/historial` y
`/dashboard`. Al autenticarse en `/`, el Administrador y el Cargador son
dirigidos a `/carga` (Mantenedor de Personas o Carga Masiva respectivamente) y
el Consultor a `/dashboard`. El Dashboard es exclusivo del Consultor, tanto en
frontend como en backend.

El selector superior `Faena` actúa como filtro operacional contextual tanto en
el Mantenedor de Personas como en el Dashboard. Sus valores demo son
`Faena Cordillera`, `Faena Norte` y `Faena Central`. No reemplaza al campo
`centro_costo`: `faena` identifica la operación minera y `centro_costo` la
imputación contable. Al procesar un viaje, la faena se toma del registro
correspondiente del maestro y se guarda en `payload_datos`.

## Carga y procesamiento de viajes

El rol `Cargador` utiliza estos endpoints protegidos:

- `POST /api/v1/uploads/headers/` con el campo multipart `file` para leer
  solamente los encabezados (`nrows=0`) de un archivo `.xlsx`.
- `POST /api/v1/uploads/process/` con los campos multipart `file` y `mapping`.
  El mapper exige `map_rut` y `map_nombre`.

El procesamiento exitoso devuelve `200`. Si existen rechazos parciales,
devuelve `207` y conserva las filas válidas. La respuesta contiene
`total_filas`, `total_procesados`, `total_errores` y `detalle_errores`.

Se validan el formato y el dígito verificador del RUT mediante Módulo 11, la
identidad y habilitación contra `Maestro_Personas`, los archivos corruptos o
vacíos y el límite de 10 MB. El RUT y el nombre se cifran con Fernet antes de
persistirse en `RegistroViaje.payload_datos` como JSONB, eliminando del payload
las columnas originales en texto plano.

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
resultado es parcial. La operación queda registrada en `RegistroAuditoria`
(`IMPORTAR_MAESTRO_PERSONAS`).

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
registro de viaje. Los datos PII se descifran únicamente en memoria al
construir la respuesta y permanecen cifrados en PostgreSQL JSONB. Cada
resultado incluye el archivo de origen, la fila del Excel, el estado, la fecha
de procesamiento y el cargador responsable. El filtro `estado` solo acepta
`APROBADO` o `RECHAZADO`; otros valores devuelven `400` con el error
`INVALID_FILTER`.

El frontend permite filtrar por faena, rango de fechas, centro de costo y
estado (`APROBADO` o `RECHAZADO`). También permite exportar a CSV (UTF-8 BOM)
los registros actualmente renderizados en la página, sin enviar datos
adicionales al servidor ni persistir el archivo exportado.

## Alcance MVP aprobado y decisiones funcionales

La aplicación frontend es una SPA React/Vite que utiliza `react-router-dom`
(`BrowserRouter` + `ProtectedRoute`) para gestionar las rutas `/`, `/carga`,
`/historial` y `/dashboard` según el rol autenticado, mientras que la
autorización efectiva se aplica obligatoriamente en el backend mediante JWT y
permisos DRF.

`faena` es obligatoria en `Maestro_Personas` y representa la operación minera.
`centro_costo` representa la imputación contable. Son dimensiones distintas y
no deben utilizarse como sinónimos. `fecha_procesamiento` corresponde al
momento de procesamiento de la carga; `fecha_vuelo` corresponde a la fecha
del viaje informada por la planilla cuando está disponible. Actualmente el
filtro implementado en este endpoint utiliza la fecha de procesamiento.

La exportación CSV del MVP se realiza sobre los registros actualmente
renderizados en la página y con los filtros aplicados. No es todavía una
exportación masiva de todo el resultado paginado.

El cifrado de PII se implementa con Fernet, basado en AES-128-CBC y
HMAC-SHA256. La llave se obtiene desde `AES_SECRET_KEY`; el término AES se
utiliza para describir el algoritmo subyacente y Fernet para referirse a la
implementación concreta autenticada.

**Gestión de Usuarios (`SGP-28`) y Auditoría Operativa (`SGP-29`):** Ambos
módulos forman parte del alcance activo en desarrollo del Sprint 3. En el
estado actual del backend, las entidades `Rol`, `Usuario` (con `Argon2`) y
`RegistroAuditoria` ya existen y persisten los eventos críticos de cargas y
sincronización de maestro (siendo administrables temporalmente desde **Django
Admin `/admin/`**), quedando pendiente exponer los endpoints REST protegidos
(`/api/v1/users/` y `/api/v1/audit-logs/`) para conectar `UsersView.jsx` y
`AuditView.jsx`. Adicionalmente, bajo `US-EXTRA-01 / SGP-30` se contempla
extender la respuesta de pre-lectura y procesamiento de cargas para alimentar el
asistente visual paso a paso solicitado por el Profesor Guía. El centro de
emisión, la agencia, el canal de compra y el sitio operacional quedan fuera del
MVP hasta contar con semántica y catálogos oficiales.

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
desarrollo, `docker-compose.yml` reemplaza este comando por `entrypoint.sh`
(`migrate` + `seed_demo_data` + `runserver`). Para Render u otra plataforma
equivalente se deben configurar las variables de entorno directamente en el
panel de secretos:

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

La suite automatizada actual cuenta con **34 pruebas** distribuidas en 5 módulos
(`core/tests.py`, `core/services/tests.py`, `core/services/api_tests.py`,
`core/services/tests_master_import.py` y `core/services/tests_dashboard.py`) y
ejecutadas automáticamente en GitHub Actions (`.github/workflows/ci.yml`),
cubriendo:

- Autenticación JWT, login por correo o RUT en múltiples formatos, renovación y
  cierre de sesión por cookie `HttpOnly`, bloqueo tras 3 intentos fallidos y
  control RBAC (`core/tests.py`).
- Idempotencia del comando `seed_demo_data`, preservación de contraseñas y
  bloqueo de ejecución cuando `DEBUG=False` (`core/tests.py`).
- Validación matemática de RUT (Módulo 11), normalización de nombres sin tildes
  ni espacios sobrantes y coincidencia contra el maestro (`core/services/tests.py`).
- Cifrado y descifrado autenticado con `Fernet` y manejo de llaves inválidas o
  ausentes (`core/services/tests.py`).
- Lectura exclusiva de encabezados Excel (`nrows=0`), rechazo de archivos
  corruptos/vacíos/mayores a 10 MB, procesamiento con respuesta parcial `207`,
  persistencia cifrada en `JSONB`, historial de cargas y aislamiento estricto
  por usuario (`core/services/api_tests.py`).
- Importación masiva del Administrador (`UPSERT` CSV/XLSX), errores parciales,
  listado paginado y permisos RBAC (`core/services/tests_master_import.py`).
- Filtros del Dashboard del Consultor, paginación, acceso exclusivo de solo
  lectura y descifrado PII únicamente en memoria RAM (`core/services/tests_dashboard.py`).

Para ejecutar todos los archivos de pruebas descubiertos por pytest:

```powershell
docker compose exec backend pytest
```

La prueba de rendimiento con 5.000 filas (`US-14 / SGP-26`) queda programada
como hito específico de certificación de carga del Sprint 3 y no forma parte de
la corrida rápida de CI.

## Dominio y separación de base de datos

El backend modela roles, usuarios, el maestro de personas, lotes de carga,
registros de viaje y eventos de auditoría. `RegistroViaje.payload_datos` es un
`JSONField` de Django almacenado como `JSONB` en PostgreSQL.

PostgreSQL es un servicio independiente. Los cambios de esquema pertenecen a
las migraciones de Django; nunca deben versionarse datos de producción,
credenciales ni llaves de cifrado.

Las entidades principales son `Rol`, `Usuario`, `Maestro_Personas`,
`LoteCarga`, `RegistroViaje` y `RegistroAuditoria` (registradas también en
`core/admin.py` para gestión en `/admin/`).

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
docker compose exec backend pytest
docker compose exec backend flake8 .
docker compose exec backend black --check .
docker compose exec backend python manage.py test core
docker compose exec backend python manage.py test core.services.api_tests
docker compose down
```

El servicio `backend` ejecuta `migrate --noinput` automáticamente mediante
`backend/entrypoint.sh` antes de iniciar `runserver`. La imagen define
Gunicorn (`production_entrypoint.sh`) para producción, pero Compose utiliza
`runserver` en local.

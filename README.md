# **SGP-Minero (Sistema de Gestión de Pasajes)**

SGP-Minero es una plataforma web B2B orientada al sector logístico de la industria minera. Su objetivo es estandarizar, validar algorítmicamente y resguardar criptográficamente la ingesta masiva de solicitudes de pasajes de trabajadores provenientes de planillas Excel variables.

## **Descripción y Propuesta de Valor**

**¿A quién va dirigido?** El sistema está diseñado para el área de logística y coordinación de viajes de empresas mineras, subcontratistas (Cargadores), área de Soporte TI/Administración, y jefaturas o clientes internos (Consultores/Auditores) que requieren visibilidad de los datos procesados.

**¿Qué problema crítico resuelve?**

1. **Formatos Variables:** Elimina las horas-hombre perdidas en la manipulación manual de archivos Excel mediante un asistente dinámico de mapeo de columnas (Mapper UI).  
2. **Errores de Identidad:** Previene la autorización de pasajes inválidos aplicando una validación matemática del RUT (Módulo 11) y una coincidencia de identidad algorítmica contra una base de datos maestra.  
3. **Vulnerabilidad y Fuga de Datos:** Da cumplimiento estricto a la Ley N° 19.628 (Protección de la Vida Privada en Chile), aplicando criptografía simétrica autenticada (`AES-128-CBC + HMAC-SHA256` mediante `Fernet`) a la Información de Identificación Personal (PII) antes de su persistencia en disco.

## **Arquitectura de la Solución**

El proyecto opera bajo una arquitectura de servicios contenerizados desacoplados y un esquema de persistencia híbrido para garantizar seguridad, escalabilidad y flexibilidad:

1. **Capa de Presentación (Frontend — SPA):** Interfaz desacoplada enfocada en usabilidad preventiva. Implementa enrutamiento cliente protegido (`react-router-dom` + `ProtectedRoute`) mediante Control de Acceso Basado en Roles (RBAC) gestionado por JSON Web Tokens (JWT) con `Access Token` en memoria volátil y `Refresh Token` en cookie `HttpOnly`.  
2. **Capa Lógica (Backend — API REST `/api/v1/`):** Motor transaccional y de validación. Se encarga de procesar los archivos en memoria, validar la lógica de negocio, cifrar los datos PII al vuelo y resguardar credenciales con `Argon2`. Rechaza cualquier conexión que no provenga del origen autorizado (CORS estricto).  
3. **Capa de Persistencia (Base de Datos Híbrida):** Utiliza esquemas estrictamente relacionales (SQL) para el control de acceso, gestión de roles, trazabilidad de lotes/auditoría y maestros. Paralelamente, emplea almacenamiento documental nativo (`JSONB`) para soportar la naturaleza dinámica e impredecible de las columnas del Excel sin romper la integridad referencial.

## **Stack Tecnológico**

**Frontend:**

* React.js 19 & Vite 8 (Framework SPA)  
* React Router DOM v7 (`BrowserRouter` + `ProtectedRoute`)  
* pnpm (Gestor de dependencias de alta velocidad)  
* Tailwind CSS & Lucide React (Framework de diseño de utilidades e iconografía)  
* Oxlint (Linter estático de alta velocidad)

**Backend:**

* Python 3.11, Django 5.2 & Django REST Framework (API REST `/api/v1/`)  
* SimpleJWT & Argon2 (`argon2-cffi`) (Autenticación JWT y hashing resistente a GPU)  
* Pandas & Openpyxl (Motor de ingesta y lectura de Excel y CSV)  
* Cryptography (Módulo `Fernet` `AES-128-CBC + HMAC-SHA256` para cifrado PII)  
* Gunicorn, WhiteNoise, Pytest, Flake8 & Black (Servidor WSGI de producción, servicio de estáticos, suite de **68 pruebas automatizadas** y linters/formateadores contenerizados)

**Base de Datos & DevSecOps:**

* PostgreSQL 15 (Estructura Relacional + Documental `JSONB`)  
* Docker & Docker Compose (Orquestación local con `healthcheck` y volumen `pgdata`)  
* Neon (PostgreSQL Cloud Serverless con conexión SSL)  
* GitHub & GitHub Actions CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml) — linting, compilación y tests automáticos)

### Compatibilidad con hosting cloud (Vercel + Render + Neon)

La separación prevista por la arquitectura desacoplada se encuentra 100% configurada y soportada:

* **Frontend compilado en Vercel:** Soporte para enrutamiento SPA sin errores 404 al refrescar (`frontend/vercel.json` con `rewrites` y cabeceras de seguridad HTTP).
* **Backend Dockerizado en Render:** Aprovisionable vía Blueprint (`render.yaml`) o Web Service Docker (`backend/Dockerfile` + `backend/production_entrypoint.sh`), con servicio de estáticos comprimidos (`WhiteNoise`), endpoint de monitoreo en `/api/v1/health/` y soporte de cookies cross-domain (`SameSite=None; Secure=True`).
* **PostgreSQL administrado en Neon:** Conexión forzada SSL (`sslmode=require`) mediante `DATABASE_URL`.

Para un instructivo operacional completo de despliegue paso a paso, consulta el documento oficial [docs/GUIA_DESPLIEGUE_CLOUD.md](docs/GUIA_DESPLIEGUE_CLOUD.md).

## **Ejecución local y comandos**

Este proyecto emplea Infraestructura como Código (IaC). Todo el entorno se levanta mediante contenedores, por lo que no es necesario instalar Node, Python o PostgreSQL directamente en tu máquina local.

**Requisitos Previos:**

* Git instalado.  
* Docker Desktop en ejecución.

**Paso a Paso:**

1. **Clonar el repositorio:**

```powershell
git clone https://github.com/andy0noxo/sgp-minero.git
Set-Location .\sgp-minero
```

2. **Configuración de Secretos (Variables de Entorno):** Copia la plantilla de variables segura hacia tu entorno local:

```powershell
Copy-Item .env.example .env
```

Abre el archivo `.env` generado y completa las variables sensibles que vienen
vacías en la plantilla (`DB_PASSWORD`, `DJANGO_SECRET_KEY` y `AES_SECRET_KEY`).
Todas las claves se configuran únicamente en `.env` (o mediante los alias
`SECRET_KEY` y `AES_ENCRYPTION_KEY`); no deben escribirse en `settings.py`, en
el frontend ni en otro archivo versionado.

`DJANGO_SECRET_KEY` es la clave interna de firma de Django. Debe ser aleatoria,
privada y suficientemente larga; para este proyecto se recomienda generar al
menos 50 bytes aleatorios. No tiene que tener un formato Base64 específico.
Puedes generarla desde PowerShell con:

```powershell
docker compose run --rm backend python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Pega el resultado después de `DJANGO_SECRET_KEY=` en `.env`.

`AES_SECRET_KEY` utiliza el formato de clave Fernet de la librería
`cryptography`: 32 bytes aleatorios codificados en Base64 URL-safe (normalmente
44 caracteres y termina en `=`). No inventes esta clave ni la reemplaces por
una contraseña. Genérala mediante el contenedor:

```powershell
docker compose run --rm backend python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Pega el resultado después de `AES_SECRET_KEY=` en `.env`.

La `AES_SECRET_KEY` debe permanecer estable mientras existan datos cifrados:
si se cambia o se pierde, los registros PII existentes no podrán descifrarse.
Para producción se debe generar una clave distinta a la local y configurarla
directamente como secreto en el proveedor cloud; nunca se debe subir al
repositorio ni compartirla.

El host de la base de datos ya está configurado por defecto para la red interna
de Docker (`DB_HOST=db`).

3. **Desplegar el Ecosistema:** Levanta todos los servicios en segundo plano:

```powershell
docker compose up --build -d
```

4. **Migraciones automáticas:** El backend espera que PostgreSQL esté saludable y
ejecuta las migraciones Django automáticamente antes de iniciar el servidor.
Para comprobarlas manualmente:

```powershell
docker compose exec backend python manage.py showmigrations
```

Comandos operativos adicionales desde la raíz:

```powershell
docker compose ps
docker compose logs -f
docker compose logs -f backend
curl.exe http://localhost:8000/api/v1/health/
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py check
docker compose exec backend python manage.py check --deploy
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py seed_demo_data
# Reiniciar la base de datos de desarrollo en limpio desde 0 (borra cargas, viajes, auditoría y usuarios extra):
docker compose exec backend python manage.py seed_demo_data --reset
docker compose exec backend pytest
docker compose exec backend flake8 .
docker compose exec backend black --check .
docker compose exec backend python manage.py test core
docker compose exec backend python manage.py test core.services.api_tests
docker compose exec backend python manage.py makemigrations --check --dry-run
docker compose down
# Elimina también los datos locales de PostgreSQL:
docker compose down -v
```

Validaciones del frontend con pnpm, desde `frontend`:

```powershell
Set-Location .\frontend
pnpm install
pnpm lint
pnpm build
pnpm dev
Set-Location ..
```

### Flujo mínimo de primera ejecución

Si el repositorio ya está clonado y Docker Desktop está iniciado, ejecuta los
comandos desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
curl.exe http://localhost:8000/api/v1/health/
```

El último comando debe devolver `{"status":"ok","database":"ok"}`.

### Ejecuciones posteriores

Cuando `.env` ya existe y las imágenes ya fueron construidas, no es necesario
usar `--build`:

```powershell
docker compose up -d
docker compose ps
curl.exe http://localhost:8000/api/v1/health/
```

Usa nuevamente `docker compose up --build -d` cuando cambien un `Dockerfile`,
`requirements.txt`, `package.json`, `pnpm-lock.yaml` o la configuración de
construcción de un servicio.

### Usuarios y roles

En desarrollo, el arranque puede crear automáticamente los roles y usuarios
demo mediante `SEED_DEMO_DATA=True`. El seed es idempotente: puede ejecutarse
varias veces sin duplicar usuarios ni cambiar sus contraseñas existentes.

El archivo `.env.example` declara los usuarios locales de demostración con las
contraseñas vacías para que las definas en tu `.env`:

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

Al iniciar el backend local se crean:

| Usuario | Rol | Uso |
| --- | --- | --- |
| `admin@minera.local` | Administrador y superusuario | Panel Django (`/admin/`), Mantenedor de Personas (`/carga`), Gestión de Usuarios (`/usuarios`) y Auditoría (`/auditoria`) |
| `cargador@minera.local` | Cargador | Carga Masiva + Mapper UI (`/carga`) y Mis Cargas (`/historial`) |
| `consultor@minera.local` | Consultor | Dashboard Corporativo (`/dashboard`) y Auditoría Operativa (`/auditoria`) |

Con `SEED_DEMO_MASTER_DATA=True` también se crean 75 personas demo en el
Mantenedor, distribuidas entre `Faena Cordillera`, `Faena Norte` y
`Faena Central`, cinco centros de costo y estados habilitados e inhabilitados.
La cantidad permite probar la paginación y los filtros sin subir manualmente
un archivo.

**Reinicio limpio de datos en desarrollo (`RESET_DB_ON_CONTAINER_CREATE` y `--reset`):**
Debido a que `docker-compose.yml` monta el volumen persistente `pgdata`, al eliminar únicamente los contenedores (sin `-v`) PostgreSQL conserva el disco anterior. Para permitir partir limpio desde cero al eliminar y recrear los contenedores en desarrollo, `backend/entrypoint.sh` verifica la marca interna `/var/lib/sgp_container_initialized`: cuando se crea un contenedor nuevo (`RESET_DB_ON_CONTAINER_CREATE=True` por defecto) o cuando se define `RESET_DB_ON_START=True`, ejecuta automáticamente `python manage.py seed_demo_data --reset`, purgando cargas previas (`LoteCarga`), viajes (`RegistroViaje`), eventos de auditoría (`RegistroAuditoria`), usuarios adicionales y registros maestros ajenos al seed base, dejando el entorno 100% limpio desde cero. También puedes ejecutarlo manualmente en cualquier momento con `docker compose exec backend python manage.py seed_demo_data --reset` o eliminar el volumen con `docker compose down -v`.

El seed solo se ejecuta con `DJANGO_DEBUG=True`. En producción debe mantenerse
`SEED_DEMO_DATA=False` y `SEED_DEMO_MASTER_DATA=False`. Los datos reales se
cargan desde el Mantenedor mediante CSV o XLSX. Se debe crear el usuario
administrativo de forma segura con:

```powershell
docker compose exec backend python manage.py createsuperuser
```

El comando solicita interactivamente el RUT, correo corporativo y contraseña.
Nunca se deben configurar contraseñas demo ni credenciales compartidas en el
entorno productivo.

**Accesos Disponibles (Entorno Local):**

* Frontend (SPA y login): `http://localhost:5173/`
* Administración Django: `http://localhost:8000/admin/`
* Login del panel Django: `http://localhost:8000/admin/login/`
* API base: `http://localhost:8000/api/v1/`
* Healthcheck público: `http://localhost:8000/api/v1/health/`
* PostgreSQL local (no es una URL web): `localhost:5432`

### URLs y control de acceso

El selector superior `Faena` representa el contexto operacional de la interfaz
corporativa y filtra las vistas operativas (Mantenedor de Personas y Dashboard
del Consultor). `faena` y `centro_costo` son dimensiones separadas: la primera
identifica la operación minera y la segunda la imputación contable. La tabla
`Maestro_Personas` exige ambos datos; al procesar un viaje, la faena se obtiene
del registro maestro de la persona y se conserva en el registro de viaje. Los
datos demo incluyen las faenas `Faena Cordillera`, `Faena Norte` y
`Faena Central`.

El centro de compra, canal de emisión, agencia o proveedor del pasaje no se
incluyen en este MVP porque la documentación no define todavía su semántica ni
su catálogo oficial.

El frontend es una SPA construida con React, Vite y **`react-router-dom`
(`BrowserRouter`)**, protegida en el cliente mediante `<ProtectedRoute>` y en el
backend mediante permisos DRF por rol:

| Ruta Frontend (SPA) | Roles Autorizados | Propósito |
| --- | --- | --- |
| `/` | Público / Autenticado | Muestra Login sin sesión; con sesión redirige automáticamente al módulo principal del rol (`/carga` o `/dashboard`) |
| `/carga` | `Cargador`, `Administrador` | *Carga Masiva + Mapper UI* (`Cargador`) o *Mantenedor Ágil + Directorio Maestro* (`Administrador`) |
| `/historial` | `Cargador` | *Mis Cargas*: historial paginado y detalle de rechazos de los lotes propios |
| `/dashboard` | `Consultor` | *Dashboard Corporativo*: consulta de solo lectura, filtros y exportación CSV |
| `/usuarios` (`/admin-panel`) | `Administrador` | *Gestión de Usuarios y Roles* (`SGP-28` — vista protegida RBAC; conexión API en curso para Sprint 3) |
| `/auditoria` | `Administrador`, `Consultor` | *Auditoría Operativa* (`SGP-29` — vista protegida RBAC; conexión API en curso para Sprint 3) |
| `*` | Cualquiera | Redirección automática segura hacia `/` |

Si un usuario autenticado intenta acceder manualmente por URL a una ruta que no
pertenece a su rol (por ejemplo, un `Cargador` navegando a `/dashboard`,
`/usuarios` o `/admin-panel`), `<ProtectedRoute>` intercepta la navegación y
renderiza la vista de bloqueo **`Error 403: Acceso Denegado`**. Sin sesión,
cualquier ruta del frontend redirige al formulario de login. Al
recargar el navegador, la sesión se restaura silenciosamente mediante la cookie
`HttpOnly` `sgp_refresh_token` (`POST /api/v1/auth/refresh/` + decodificación
en memoria del payload JWT y sincronización con `GET /api/v1/auth/me/`); si no
existe o es inválida, el frontend permanece en el login. El backend protege las
operaciones mediante JWT y devuelve `401` si se solicita un endpoint protegido
sin autenticación.

| Método | URL API | Acceso |
| --- | --- | --- |
| `GET` | `/api/v1/health/` | Público |
| `POST` | `/api/v1/auth/login/` | Público |
| `POST` | `/api/v1/auth/refresh/` | Cookie `HttpOnly` de refresh |
| `POST` | `/api/v1/auth/logout/` | Público; elimina la cookie de refresh |
| `GET` | `/api/v1/auth/me/` | Usuario autenticado |
| `POST` | `/api/v1/uploads/headers/` | Cargador |
| `POST` | `/api/v1/uploads/process/` | Cargador |
| `GET` | `/api/v1/uploads/history/` | Cargador |
| `GET` | `/api/v1/uploads/history/<lote_id>/` | Cargador propietario |
| `POST` | `/api/v1/master-persons/import/` | Administrador |
| `GET` | `/api/v1/master-persons/` | Administrador |
| `GET` | `/api/v1/dashboard/records/` | Consultor |

El Dashboard (`/dashboard`) es exclusivo del rol Consultor. En el frontend ya se
encuentran protegidas por rol las rutas de **Mantenedor de Personas (`/carga`)**,
**Gestión de Usuarios (`/usuarios` — `SGP-28`)** y **Auditoría Operativa
(`/auditoria` — `SGP-29`)**, encontrándose en desarrollo para el cierre del
Sprint 3 la conexión de `/usuarios` y `/auditoria` con sus respectivos endpoints
DRF.

Los métodos no definidos para una vista protegida responden `405`, y un usuario
autenticado con un rol incorrecto recibe `403`. La URL `/admin/` corresponde al
panel administrativo nativo de Django y requiere autenticación de superusuario/staff;
no forma parte de la SPA.

Para comprobar el comportamiento de una API protegida sin iniciar sesión:

```powershell
curl.exe -i http://localhost:8000/api/v1/auth/me/
curl.exe -i http://localhost:8000/api/v1/dashboard/records/
```

Ambas solicitudes deben responder `401 Unauthorized`.

### Formatos aceptados para el RUT de inicio de sesión

El login acepta el RUT con o sin separadores:

```text
12.345.678-5
12345678-5
123456785
```

El backend normaliza el valor al formato canónico `12345678-5` antes de
buscar al usuario. El correo corporativo mantiene su comportamiento normal.

El rol Cargador dispone de las opciones **Carga Masiva (Excel)** (`/carga`, con
asistente visual en 4 pasos, zona interactiva *Drag & Drop*, validación en
cliente de extensión + MIME `.xlsx` y tamaño `<= 10 MB`, alertas flotantes
*Toast* y *spinner* de progreso) y **Mis Cargas** (`/historial`). Esta última
presenta tarjetas KPI acumuladas de gestión, un listado visual de las planillas
`.xlsx` subidas con barra de progreso de aprobación, y un **panel de inspección
visual en 4 pasos** para cualquier lote seleccionado: 1) Ficha del archivo
subido y columnas dinámicas `JSONB`, 2) Trazabilidad de las 4 etapas del
pipeline backend (`pipeline_trace`: Pandas, Módulo 11, Maestro y Fernet),
3) Balance de resultados de la subida y 4) Representación interactiva en tabla
fila por fila del archivo (con filtros `Todas`, `Aprobadas` y `Rechazadas`,
buscador en vivo, previsualización de tokens cifrados `Fernet`, faena asignada,
columnas dinámicas del Excel y diagnóstico de validación); los lotes de otros
usuarios no se exponen.

El rol Consultor dispone del **Dashboard corporativo** (`/dashboard`), con
filtros por fecha, faena, centro de costo y estado, paginación de hasta 50
registros y exportación CSV (UTF-8 BOM) de la página actualmente renderizada.

### Alcance documental vigente del MVP

Las decisiones funcionales y de arquitectura vigentes son las siguientes:

- La aplicación frontend es una SPA React/Vite con enrutamiento cliente
  mediante **`react-router-dom` (`BrowserRouter` + `ProtectedRoute`)** sobre
  las rutas `/`, `/carga`, `/historial`, `/dashboard`, `/usuarios` (`/admin-panel`)
  y `/auditoria`, respaldada por autorización estricta RBAC en el backend.
- Las contraseñas utilizan **`Argon2`** como algoritmo primario de hashing y el
  login bloquea temporalmente la cuenta durante `5` minutos tras `3` intentos
  inválidos consecutivos.
- `faena` es una dimensión operacional obligatoria de `Maestro_Personas`;
  `centro_costo` representa la imputación contable y no debe confundirse con
  la faena.
- `fecha_procesamiento` representa el momento en que el sistema procesa una
  carga. `fecha_vuelo` representa la fecha del viaje informada por la
  planilla cuando ese campo está disponible.
- La exportación CSV del MVP contiene los registros actualmente renderizados
  en la página activa y con los filtros aplicados; no es todavía una
  exportación masiva en servidor de todos los resultados.
- El cifrado de PII se implementa con `Fernet`, basado en `AES-128-CBC` y
  `HMAC-SHA256`, mediante la llave `AES_SECRET_KEY`.
- **Gestión de Usuarios (`SGP-28`) y Auditoría Operativa (`SGP-29`)** forman
  parte del alcance funcional vigente en desarrollo para Sprint 3: sus modelos
  (`Rol`, `Usuario`, `RegistroAuditoria` con bitácora activa de
  `LOGIN_EXITOSO`, `LOGIN_FALLIDO`, `CUENTA_BLOQUEADA`, `LOGIN_BLOQUEADO`,
  `PROCESAR_CARGA_VIAJES` e `IMPORTAR_MAESTRO_PERSONAS`), sus interfaces base
  (`UsersView.jsx` y `AuditView.jsx`) y sus rutas protegidas RBAC (`/usuarios`
  y `/auditoria`) ya están integrados en el repositorio, restando conectar sus
  endpoints DRF (`/api/v1/users/` y `/api/v1/audit-logs/`), manteniendo
  **Django Admin (`/admin/`)** como consola administrativa nativa auxiliar.
- Por solicitud del Profesor Guía, se encuentra planificada la tarea adicional
  **`US-EXTRA-01 / SGP-30`** para enriquecer visualmente el flujo del `Cargador`
  con comparación visual de encabezados, vista previa de la tabla estandarizada
  a subir y visualización paso a paso de lo que ejecuta internamente el backend.
- Centro de emisión, agencia, canal de compra y sitio operacional quedan
  fuera del MVP hasta que exista una definición empresarial y un catálogo
  oficial.

### Documentación del repositorio

- [`backend/README.md`](backend/README.md): contratos detallados de la API
  `/api/v1/`, autenticación JWT/Argon2, despliegue Gunicorn/Render y cobertura QA.
- [`database/README.md`](database/README.md): operación de PostgreSQL, volumen
  `pgdata` y detalle de las 6 entidades del esquema híbrido (`JSONB`).

La carpeta [`database`](database/README.md) documenta la operación de
PostgreSQL. El esquema no se duplica en SQL: la fuente oficial son las
migraciones de Django en `backend/core/migrations/`.

## **Equipo de Desarrollo (Squad)**

El proyecto es desarrollado por un equipo técnico de 3 desarrolladores Full-Stack (Ingeniería en Informática — Duoc UC, Sede Plaza Vespucio):

* **Bernardo Burisch (Scrum Master & Developer):** Liderazgo de ceremonias, gestión de impedimentos. Foco técnico en Backend (Django, Pandas), Base de Datos y orquestación DevSecOps (Docker).  
* **Ángel Frei (Product Owner & Developer):** Priorización del Backlog, validación de valor de negocio. Foco técnico en Frontend (React, Vite, React Router) y experiencia de usuario B2B (Mapper UI).  
* **Andrés Salcedo (QA, Security Lead & Developer):** Auditoría de código, aseguramiento de calidad y CI/CD. Foco técnico en Base de Datos (PostgreSQL, esquema híbrido `JSONB`), Criptografía (`AES/Fernet`, `Argon2`) y pruebas automatizadas (`Pytest`).

## **Metodología de Trabajo**

Operamos bajo el marco de trabajo ágil **Scrum** con Sprints iterativos (Sprints 0 al 4):

* **Gestión de Backlog y Ceremonias:** Conservando íntegramente la codificación de Épicas y Tickets definida originalmente para Jira (`SGP-1` al `SGP-27`, `91 SP`, más las ampliaciones trazables `SGP-28` a `SGP-30`, total `109 SP`), el registro formal de ceremonias (*Sprint Planning, Review y Retrospective*) se lleva en un **documento maestro en Word** y el seguimiento diario de **Daily Scrum** en una **planilla estructurada en Excel** por Sprint (Semanas 5 a 18).  
* **Trazabilidad (Smart Commits):** Todo el desarrollo en este repositorio está estrictamente ligado a los requerimientos del negocio. Cada commit o Pull Request integra el identificador único del ticket del Backlog (ej. `SGP-15: Implementación de validación Módulo 11`).  
* **Calidad Continua (DoD + CI):** Ningún cambio se consolida en la rama principal (`main`) sin antes ser verificado funcionalmente en contenedores Docker, superar las validaciones automáticas de GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) y aislar todos sus secretos mediante `.env`.

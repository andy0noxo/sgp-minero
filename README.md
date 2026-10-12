# **SGP-Minero (Sistema de Gestión de Pasajes)**

SGP-Minero es una plataforma web B2B orientada al sector logístico de la industria minera. Su objetivo es estandarizar, validar algorítmicamente y resguardar criptográficamente la ingesta masiva de solicitudes de pasajes de trabajadores provenientes de planillas Excel variables.

## **Descripción y Propuesta de Valor**

**¿A quién va dirigido?** El sistema está diseñado para el área de logística y coordinación de viajes de empresas mineras, subcontratistas (Cargadores), área de Soporte TI/Administración, y jefaturas o clientes internos (Consultores/Auditores) que requieren visibilidad de los datos procesados.

**¿Qué problema crítico resuelve?**

1. **Formatos Variables:** Elimina las horas-hombre perdidas en la manipulación manual de archivos Excel mediante un asistente dinámico de mapeo de columnas (Mapper UI).  
2. **Errores de Identidad:** Previene la autorización de pasajes inválidos aplicando una validación matemática del RUT (Módulo 11\) y una coincidencia de identidad algorítmica contra una base de datos maestra.  
3. **Vulnerabilidad y Fuga de Datos:** Da cumplimiento estricto a la Ley N° 19.628 (Protección de la Vida Privada en Chile), aplicando criptografía simétrica (AES) a la Información de Identificación Personal (PII) antes de su persistencia en disco.

## **Arquitectura de la Solución**

El proyecto opera bajo una arquitectura de microservicios contenerizados y un esquema de persistencia híbrido para garantizar seguridad, escalabilidad y flexibilidad:

1. **Capa de Presentación (Frontend \- SPA):** Interfaz desacoplada enfocada en usabilidad preventiva. Implementa enrutamiento protegido mediante Control de Acceso Basado en Roles (RBAC) gestionado por JSON Web Tokens (JWT) en memoria.  
2. **Capa Lógica (Backend \- API REST):** Motor transaccional y de validación. Se encarga de procesar los archivos en memoria, validar la lógica de negocio, y cifrar los datos PII en vuelo. Rechaza cualquier conexión que no provenga del origen autorizado (CORS estricto).  
3. **Capa de Persistencia (Base de Datos Híbrida):** Utiliza esquemas estrictamente relacionales (SQL) para el control de acceso, gestión de roles y maestros. Paralelamente, emplea el almacenamiento documental nativo (`JSONB`) para soportar la naturaleza dinámica e impredecible de las columnas del Excel sin romper la integridad referencial.

## **Stack Tecnológico**

**Frontend:**

* React.js & Vite (Framework SPA)  
* pnpm (Gestor de dependencias de alta velocidad)  
* Tailwind CSS (Framework de diseño de utilidades)

**Backend:**

* Python & Django REST Framework (API REST)  
* Pandas & Openpyxl (Motor de ingesta y lectura de Excel)  
* Cryptography (Módulo AES/Fernet para cifrado PII)

**Base de Datos & DevSecOps:**

* PostgreSQL (Estructura Relacional \+ Documental JSONB)  
* Docker & Docker Compose (Orquestación y contenerización)  
* Neon (PostgreSQL Cloud Serverless)  
* GitHub (Control de versiones y auditoría)

### Compatibilidad con hosting cloud

La separación prevista por la documentación se soporta con:

* Frontend compilado en Vercel.
* Backend Dockerizado en Render o Railway.
* PostgreSQL administrado en Neon.

Para el backend cloud se deben configurar `DJANGO_DEBUG=False`,
`DJANGO_COOKIE_SECURE=True`, `REFRESH_TOKEN_COOKIE_SAMESITE=None`,
`DJANGO_ALLOWED_HOSTS` con el dominio del backend,
`CORS_ALLOWED_ORIGINS` con el dominio HTTPS exacto de Vercel y `DATABASE_URL`
con la cadena SSL entregada por Neon. El contenedor ejecuta las migraciones
antes de Gunicorn y escucha el puerto `PORT` del proveedor.

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

Abre el archivo `.env` generado y reemplaza los valores de ejemplo de
`DJANGO_SECRET_KEY` y `AES_SECRET_KEY`. Ambas claves se configuran únicamente
en `.env`; no deben escribirse en `settings.py`, en el frontend ni en otro
archivo versionado.

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

El archivo `.env.example` incluye valores locales de demostración. Después de
copiarlo a `.env`, cambia las contraseñas antes de compartir el entorno:

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

Al iniciar el backend local se crean:

| Usuario | Rol | Uso |
| --- | --- | --- |
| `admin@minera.local` | Administrador y superusuario | Panel Django y mantenedor |
| `cargador@minera.local` | Cargador | Carga masiva y Mis Cargas |
| `consultor@minera.local` | Consultor | Dashboard corporativo |

Con `SEED_DEMO_MASTER_DATA=True` también se crean 75 personas demo en el
Mantenedor, distribuidas entre `Faena Cordillera`, `Faena Norte` y
`Faena Central`, cinco centros de costo y estados habilitados e inhabilitados.
La cantidad permite probar la paginación y los filtros sin subir manualmente
un archivo. El seed actualiza solamente sus RUT demo deterministas y no elimina
ni modifica otros registros.

El seed solo se ejecuta con `DJANGO_DEBUG=True`. En producción debe mantenerse
`SEED_DEMO_DATA=False` y `SEED_DEMO_MASTER_DATA=False`. Los datos reales se
cargan desde el Mantenedor mediante CSV o XLSX. Se debe crear el usuario
administrativo de forma
segura con:

```powershell
docker compose exec backend python manage.py createsuperuser
```

El comando solicita interactivamente el RUT, correo corporativo y contraseña.
Nunca se deben configurar contraseñas demo ni credenciales compartidas en el
entorno productivo.

**Accesos Disponibles (Entorno Local):**

* Frontend (punto de entrada y login): `http://localhost:5173/`
* Administración Django: `http://localhost:8000/admin/`
* Login del panel Django: `http://localhost:8000/admin/login/`
* API base: `http://localhost:8000/api/v1/`
* Healthcheck público: `http://localhost:8000/api/v1/health/`
* PostgreSQL local (no es una URL web): `localhost:5432`

### URLs y control de acceso

El selector superior `Faena` representa el contexto operacional de la interfaz
y filtra los registros del Dashboard del Consultor. `faena` y `centro_costo`
son dimensiones separadas: la primera identifica la operación minera y la
segunda la imputación contable. La tabla `Maestro_Personas` exige ambos datos;
al procesar un viaje, la faena se obtiene del registro maestro de la persona y
se conserva en el registro de viaje. Los datos demo incluyen las faenas
`Faena Cordillera`, `Faena Norte` y `Faena Central`.

El centro de compra, canal de emisión, agencia o proveedor del pasaje no se
incluyen en este MVP porque la documentación no define todavía su semántica ni
su catálogo oficial.

El frontend actual es una SPA sin enrutador URL. Por eso solo existe la ruta
web `/`; después del login, el menú cambia las vistas dentro de la misma página
y no crea URLs independientes como `/dashboard` o `/admin-panel`. Cada rol
inicia en su primer módulo autorizado: Administrador en Mantenedor de
Personas, Cargador en Carga Masiva y Consultor en Dashboard.

Sin sesión, `http://localhost:5173/` muestra el formulario de login. La sesión
se recupera mediante la cookie de refresh; si no existe o es inválida, el
frontend permanece en el login. El backend protege las operaciones mediante
JWT y devuelve `401` si se solicita un endpoint protegido sin autenticación.

| Método | URL | Acceso |
| --- | --- | --- |
| `GET` | `/api/v1/health/` | Público |
| `POST` | `/api/v1/auth/login/` | Público |
| `POST` | `/api/v1/auth/refresh/` | Cookie de refresh |
| `POST` | `/api/v1/auth/logout/` | Público; elimina la cookie de refresh |
| `GET` | `/api/v1/auth/me/` | Usuario autenticado |
| `POST` | `/api/v1/uploads/headers/` | Cargador |
| `POST` | `/api/v1/uploads/process/` | Cargador |
| `GET` | `/api/v1/uploads/history/` | Cargador |
| `GET` | `/api/v1/uploads/history/<lote_id>/` | Cargador propietario |
| `POST` | `/api/v1/master-persons/import/` | Administrador |
| `GET` | `/api/v1/master-persons/` | Administrador |
| `GET` | `/api/v1/dashboard/records/` | Consultor |

El Dashboard es exclusivo del rol Consultor. El Administrador no debe intentar
abrirlo desde el navegador: su módulo autorizado es Mantenedor de Personas.

Los métodos no definidos para una vista protegida responden `405`, y un usuario
autenticado con un rol incorrecto recibe `403`. La URL `/admin/` corresponde al
panel administrativo de Django y requiere autenticación; no forma parte de la
SPA.

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

El rol Cargador dispone de las opciones **Carga Masiva (Excel)** y **Mis
Cargas**. Esta última consulta el historial de sus lotes, sus totales y el
detalle de las filas rechazadas mediante la API protegida; los lotes de otros
usuarios no se exponen.

El rol Consultor dispone del **Dashboard corporativo**, con filtros por fecha,
centro de costo y estado, paginación de hasta 50 registros y exportación CSV
de la página actualmente renderizada.

La carpeta [`database`](database/README.md) documenta la operación de
PostgreSQL. El esquema no se duplica en SQL: la fuente oficial son las
migraciones de Django en `backend/core/migrations/`.

## **Equipo de Desarrollo (Squad)**

El proyecto es mantenido por un equipo técnico de 3 desarrolladores Full-Stack:

* **Bernardo Burisch (Scrum Master):** Liderazgo de ceremonias, gestión de impedimentos. Foco técnico en Backend (Django, Pandas) y orquestación DevSecOps (Docker).  
* **Ángel Frei (Product Owner):** Priorización del Backlog, validación de valor de negocio. Foco técnico en Frontend (React, Vite) y experiencia de usuario B2B (Mapper UI).  
* **Andrés Salcedo (QA & Security Lead):** Auditoría de código, aseguramiento de calidad. Foco técnico en Base de Datos (PostgreSQL, esquema híbrido) y Criptografía (AES).

## **Metodología de Trabajo**

Operamos bajo el marco de trabajo ágil **Scrum** con Sprints iterativos:

* **Tablero de Gestión:** El Product Backlog y Sprint Backlogs se administran activamente mediante **Jira Software**.  
* **Trazabilidad (Smart Commits):** Todo el desarrollo en este repositorio está estrictamente ligado a los requerimientos del negocio. Cada commit o Pull Request integra el identificador único del ticket de Jira (ej. `SGP-15: Implementación de validación Módulo 11`).  
* **Calidad Continua (DoD):** Ningún código es fusionado a la rama principal (`main`) sin antes ser verificado funcionalmente en el entorno de contenedores y haber ocultado todos sus secretos mediante el archivo `.env`.

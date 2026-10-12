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

Abre el archivo `.env` generado y asegúrate de:

* Configurar una llave `DJANGO_SECRET_KEY` aleatoria.  
* Agregar una llave AES válida de 32 bytes (URL-safe base64) en la variable `AES_SECRET_KEY` para que el motor de base de datos pueda cifrar los registros PII.  
* El host de la base de datos ya está configurado por defecto para la red interna de Docker (`DB_HOST=db`).  

Si necesitas generar una llave Fernet mediante el contenedor:

```powershell
docker compose run --rm backend python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

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

Si el repositorio ya está clonado y Docker Desktop está iniciado:

```powershell
Set-Location D:\proyectos\Capstone\sgp-minero
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
Set-Location D:\proyectos\Capstone\sgp-minero
docker compose up -d
docker compose ps
curl.exe http://localhost:8000/api/v1/health/
```

Usa nuevamente `docker compose up --build -d` cuando cambien un `Dockerfile`,
`requirements.txt`, `package.json`, `pnpm-lock.yaml` o la configuración de
construcción de un servicio.

### Usuarios y roles

El arranque no crea usuarios de negocio automáticamente. Para crear el
superusuario del panel Django:

```powershell
docker compose exec backend python manage.py createsuperuser
```

Después ingresa a <http://localhost:8000/admin/> y crea o configura los roles
`Administrador`, `Cargador` y `Consultor`, asociándolos a los usuarios
correspondientes.

**Accesos Disponibles (Entorno Local):**

* Frontend (Mapper UI): `http://localhost:5173`  
* Backend (API REST): `http://localhost:8000/api/v1/`  
* Base de Datos (Conexión TCP): `localhost:5432`

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

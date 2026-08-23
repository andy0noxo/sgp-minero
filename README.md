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

## **Instrucciones de Ejecución Local (Docker)**

Este proyecto emplea Infraestructura como Código (IaC). Todo el entorno se levanta mediante contenedores, por lo que no es necesario instalar Node, Python o PostgreSQL directamente en tu máquina local.

**Requisitos Previos:**

* Git instalado.  
* Docker Desktop en ejecución.

**Paso a Paso:**

1. **Clonar el repositorio:**

Bash  
git clone https://github.com/andy0noxo/sgp-minero.git  
cd sgp-minero

2. **Configuración de Secretos (Variables de Entorno):** Copia la plantilla de variables segura hacia tu entorno local:

Bash  
cp .env.example .env

Abre el archivo `.env` generado y asegúrate de:

* Configurar una llave `DJANGO_SECRET_KEY` aleatoria.  
* Agregar una llave AES válida de 32 bytes (URL-safe base64) en la variable `AES_SECRET_KEY` para que el motor de base de datos pueda cifrar los registros PII.  
* El host de la base de datos ya está configurado por defecto para la red interna de Docker (`DB_HOST=db`).  
3. **Desplegar el Ecosistema:** Levanta todos los servicios en segundo plano:

Bash  
docker-compose up \--build \-d

4. **Aplicar Migraciones (Solo la primera ejecución):** Construye las tablas de la base de datos ejecutando las migraciones dentro del contenedor del backend:

Bash  
docker-compose exec backend python manage.py migrate

**Accesos Disponibles (Entorno Local):**

* Frontend (Mapper UI): `http://localhost:5173`  
* Backend (API REST): `http://localhost:8000/api/v1/`  
* Base de Datos (Conexión TCP): `localhost:5432`

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


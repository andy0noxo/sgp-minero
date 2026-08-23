

**DOCUMENTACIÓN ÁGIL \- FASE 1: SGP-MINERO**

## 

## 

**Integrantes:**

Ángel Frei

Andrés Salcedo  
Bernardo Diaz

**Profesor:** 

Diego Alberto Garces Miranda

## Índice {#índice}

[Índice	2](#índice)

[**1\. Análisis del Caso: Contexto, Problemática e Impacto	3**](#1.-análisis-del-caso:-contexto,-problemática-e-impacto)

[**2\. Visión del Proyecto y los 4 Pilares Estratégicos	4**](#2.-visión-del-proyecto-y-los-4-pilares-estratégicos)

[**3\. Mapa de Actores (Stakeholders)	5**](#3.-mapa-de-actores-\(stakeholders\))

[**4\. Squad y Responsabilidades (Estructura del Equipo)	6**](#4.-squad-y-responsabilidades-\(estructura-del-equipo\))

[**5\. Mapa Mental (Estructura de la Solución)	8**](#5.-mapa-mental-\(estructura-de-la-solución\))

[**6\. Impact Mapping (Alineación Estratégica)	9**](#6.-impact-mapping-\(alineación-estratégica\))

[**7\. User Story Mapping (Viajes de Usuario por Rol)	10**](#7.-user-story-mapping-\(viajes-de-usuario-por-rol\))

[A. Viaje del Usuario: Rol Cargador (Flujo Operativo de Ingesta)	10](#a.-viaje-del-usuario:-rol-cargador-\(flujo-operativo-de-ingesta\))

[B. Viaje del Usuario: Rol Administrador (Flujo de Mantenimiento B2B)	11](#b.-viaje-del-usuario:-rol-administrador-\(flujo-de-mantenimiento-b2b\))

[C. Viaje del Usuario: Rol Consultor (Flujo de Auditoría y Control)	12](#c.-viaje-del-usuario:-rol-consultor-\(flujo-de-auditoría-y-control\))

[**8\. Épicas del Proyecto (Roadmap de Desarrollo)	14**](#8.-épicas-del-proyecto-\(roadmap-de-desarrollo\))

[**9\. Historias de Usuario (Product Backlog Inicial Completo)	16**](#9.-historias-de-usuario-\(product-backlog-inicial-completo\))

[**10\. Product Backlog Priorizado	20**](#10.-product-backlog-priorizado)

[Must Have (Críticos \- Sprints 1 y 2\)	20](#must-have-\(críticos---sprints-1-y-2\))

[Should y Could Have (Valor B2B \- Sprint 3\)	20](#should-y-could-have-\(valor-b2b---sprint-3\))

[Won't Have (Fuera de Alcance Estricto)	20](#won't-have-\(fuera-de-alcance-estricto\))

## 

## 1\. Análisis del Caso: Contexto, Problemática e Impacto {#1.-análisis-del-caso:-contexto,-problemática-e-impacto}

**Contexto Operativo** El área de logística y coordinación de viajes de una empresa minera es responsable de gestionar y centralizar las solicitudes de pasajes para los trabajadores que se trasladan hacia y desde las faenas. Actualmente, este proceso crítico de ingesta de datos se realiza de forma precaria, dependiendo de la recepción de múltiples planillas Excel enviadas por diversas áreas operativas y subcontratistas.

**Identificación de la Problemática (Puntos de Dolor)**

El flujo de trabajo actual presenta tres fallas sistémicas que degradan la operatividad del negocio:

* **Heterogeneidad de Datos (Formatos Variables):** Al no existir una plantilla única y estricta, los archivos Excel entrantes presentan estructuras de columnas dinámicas, celdas combinadas y formatos incompatibles. Esto obliga al personal logístico a realizar una manipulación manual intensiva y tediosa para consolidar la información antes de cualquier gestión.

* **Ausencia de Validación Automatizada (Errores de Identidad):** El proceso manual carece de verificación algorítmica. Los errores de digitación en campos críticos, como el RUT o el Nombre de los trabajadores, no son detectados a tiempo, lo que resulta frecuentemente en la autorización y emisión de pasajes inválidos.

* **Vulnerabilidad Crítica de Datos (Exposición PII):** El manejo, distribución y almacenamiento de Información de Identificación Personal (PII) en archivos sueltos y sin ningún tipo de cifrado constituye un riesgo severo de ciberseguridad.

**Impacto en el Negocio** 

La suma de estas deficiencias técnicas se traduce en una merma directa de eficiencia (horas-hombre consumidas en limpieza de datos) y en pérdidas económicas cuantificables debido a la compra de pasajes que no pueden ser utilizados. A nivel regulatorio, la exposición de datos sensibles sin mecanismos de protección o trazabilidad expone a la compañía a auditorías fallidas y posibles sanciones legales bajo la Ley N° 19.628 (Protección de la Vida Privada en Chile).

**Propuesta de Valor (SGP-Minero)** 

Para mitigar estos riesgos de raíz, el proyecto propone el desarrollo del "Sistema de Gestión de Pasajes" (SGP-Minero). Esta solución tecnológica B2B estandarizará la ingesta de las planillas mediante una interfaz de mapeo dinámico (Mapper UI), delegando al software la verificación matemática de los documentos y la coincidencia de identidad contra una base maestra. Finalmente, el sistema blindará la información PII mediante cifrado criptográfico simétrico (AES), almacenándola de forma segura en un esquema de base de datos relacional con soporte flexible (JSONB).

## 

## 

## 2\. Visión del Proyecto y los 4 Pilares Estratégicos {#2.-visión-del-proyecto-y-los-4-pilares-estratégicos}

**Visión del Producto** 

Convertir a "SGP-Minero" en la plataforma web corporativa estándar para la ingesta masiva, validación algorítmica y resguardo criptográfico de solicitudes de pasajes en el sector minero. El sistema busca erradicar las pérdidas económicas derivadas de errores de identidad, transformando un proceso manual, inseguro y variable en un flujo de trabajo automatizado, trazable y estrictamente alineado con las normativas chilenas de protección de datos.

Para sostener esta visión y asegurar que el Producto Mínimo Viable (MVP) resuelva el problema sin desviarse de su alcance, la arquitectura y el desarrollo se fundamentan en **4 Pilares Estratégicos**:

**Pilar 1: Privacidad y Seguridad por Diseño (Privacy by Design)** 

La seguridad no es un módulo adicional, sino el núcleo del sistema. En estricto cumplimiento con la Ley N° 19.628 sobre Protección de la Vida Privada, toda Información de Identificación Personal (PII), como el RUT y el Nombre Completo, es sometida a un proceso de cifrado simétrico (estándar AES) antes de ser persistida en la base de datos. Además, para evitar fugas de información, la validación de identidad se realiza de forma 100% interna contra una tabla maestra aislada, prohibiendo categóricamente la integración con APIs gubernamentales o servicios de terceros.

**Pilar 2: Flexibilidad Estructural Híbrida** 

Para resolver el "dolor" principal de los formatos variables y columnas dinámicas en las planillas Excel, la infraestructura de datos rechaza la rigidez tradicional. El sistema emplea una arquitectura de base de datos híbrida sobre PostgreSQL: utiliza esquemas estrictamente relacionales (SQL) para la gestión de acceso y control de maestros, mientras que adopta el almacenamiento documental mediante el tipo de dato nativo JSONB para albergar la carga dinámica de las filas procesadas, logrando flexibilidad sin sacrificar la integridad referencial.

**Pilar 3: Experiencia de Usuario (UX) Preventiva y Corporativa** 

La interfaz de usuario está diseñada bajo un enfoque B2B que prioriza la productividad operativa sobre el diseño visual innecesario o el sobrediseño (como herramientas complejas de drag-and-drop para mapeo de datos). A través del "Mapper UI", el sistema guía al usuario "Cargador" mediante un asistente estructurado que bloquea algorítmicamente el envío de información si no se han emparejado las columnas obligatorias. El objetivo es frenar la "basura de datos" (GIGO \- Garbage In, Garbage Out) directamente en el frontend antes de que alcance los procesos del servidor.

**Pilar 4: Trazabilidad Operativa y Accountability** 

Dado que el sistema procesa datos logísticos sensibles, SGP-Minero implementa un robusto Control de Acceso Basado en Roles (RBAC) gestionado a través de JSON Web Tokens (JWT). Este pilar garantiza que cada interacción en el sistema sea auditable. El modelo de datos registra de manera inalterable la identidad del usuario que ejecuta una carga, la fecha de la transacción y el estado del archivo procesado, asegurando que la empresa minera mantenga el control y la responsabilidad (Accountability) total sobre las operaciones.

## 3\. Mapa de Actores (Stakeholders) {#3.-mapa-de-actores-(stakeholders)}

El ecosistema de "SGP-Minero" está diseñado bajo un estricto Control de Acceso Basado en Roles (RBAC). Este enfoque garantiza que la interacción con la plataforma esté delimitada por el principio de "mínimo privilegio", asignando permisos y vistas específicas según las responsabilidades de cada usuario dentro de la operación logística de la minera.

A continuación, se detallan los tres actores principales que interactuarán con el sistema:

**1\. Cargador (Operativo de Logística / Loader)**

* **Nivel de Acceso:** Perfil operativo con permisos de escritura limitados a la ingesta temporal de archivos y lectura de sus propias cargas.  
* **Responsabilidad:** Es el usuario de "primera línea", encargado de recibir las solicitudes de pasajes desde los contratistas o distintas áreas y subirlas al sistema.  
* **Dolor Principal (Pain Point):** Invierte una gran cantidad de horas-hombre manipulando planillas Excel con columnas dinámicas, formatos de fecha heterogéneos y celdas combinadas para intentar unificarlas, enfrentándose a constantes rebotes por errores tipográficos en los nombres o RUTs inválidos.  
* **Beneficio Esperado (Solución):** Se le provee una interfaz de usuario asistida (Mapper UI) que le permite subir el archivo en su formato original y emparejar visualmente las columnas. El sistema le devuelve un reporte detallado (fila por fila) con los motivos exactos de rechazo, eliminando la necesidad de buscar errores "a mano".

**2\. Administrador (Soporte TI / Gerencia de Operaciones)**

* **Nivel de Acceso:** Acceso total (Full Access).  
* **Responsabilidad:** Mantener la operatividad paramétrica del sistema, gestionar a los usuarios (creación y asignación de roles) y, de manera crítica, asegurar que la base de datos maestra esté actualizada.  
* **Dolor Principal (Pain Point):** La desactualización de la base de trabajadores autorizados para viajar, la cual, al no contar con una integración directa a un sistema ERP (como SAP o Buk), requeriría un ingreso manual, lento y propenso a errores registro por registro.  
* **Beneficio Esperado (Solución):** Se le entrega un "Mantenedor Ágil", un módulo exclusivo de carga masiva que le permite subir archivos estandarizados (CSV o Excel) para actualizar o registrar cientos de trabajadores en la tabla Maestro\_Personas en cuestión de segundos, asegurando la fiabilidad del motor de validación.

**3\. Consultor (Auditor / Jefatura / Cliente Interno)**

* **Nivel de Acceso:** Perfil estrictamente de solo lectura (Read-Only). No tiene permisos para cargar archivos, modificar usuarios ni alterar configuraciones.  
* **Responsabilidad:** Supervisar la correcta ejecución de los presupuestos, auditar los pasajes validados y extraer métricas para la toma de decisiones gerenciales.  
* **Dolor Principal (Pain Point):** Falta de visibilidad consolidada y en tiempo real sobre los datos logísticos validados, lo que dificulta la generación de reportes y la trazabilidad de la información.  
* **Beneficio Esperado (Solución):** Acceso a un panel de control corporativo (Dashboard) con tablas de datos estructuradas e inalterables, provistas de filtros dinámicos (por fecha, centro de costo, etc.) que permiten inspeccionar y exportar la información procesada de manera transparente y segura.

## 4\. Squad y Responsabilidades (Estructura del Equipo) {#4.-squad-y-responsabilidades-(estructura-del-equipo)}

El equipo de desarrollo (Squad) operará bajo el marco de trabajo ágil **Scrum**. Dada la restricción académica de contar con exactamente tres integrantes, el equipo ha adoptado una estructura de trabajo multifuncional y colaborativa.

A nivel técnico, **los tres miembros actuarán como Desarrolladores Full-Stack**, asegurando una participación comprobable y equitativa en la programación, configuración de bases de datos y documentación del sistema. No obstante, para garantizar el orden metodológico, la trazabilidad del proyecto y el cumplimiento de las ceremonias ágiles, se han distribuido las responsabilidades de gestión y los focos técnicos principales de la siguiente manera:

| Integrante | Rol Ágil (Scrum) | Foco Técnico Principal | Responsabilidades Específicas |
| :---- | :---- | :---- | :---- |
| **Bernardo Erich Burisch Diaz** | **Scrum Master** | Backend & Infraestructura (DevOps) | **Gestión:** Liderar las ceremonias Scrum (Sprint Planning, Review y Dailys asíncronas), remover impedimentos técnicos del equipo y asegurar la actualización del tablero Jira y el repositorio GitHub.**Técnico:** Orquestación de contenedores (Docker), despliegue de la API REST en Python/Django, y programación del motor de ingesta masiva de archivos utilizando la librería pandas. |
| **Ángel Nicolás Frei Cepeda** | **Product Owner** | Frontend & Experiencia de Usuario (UI/UX) | **Gestión:** Maximizar el valor del producto, gestionar y priorizar el Product Backlog, y asegurar que la solución resuelva el problema del negocio sin caer en sobrediseños que arriesguen el MVP.**Técnico:** Desarrollo de la interfaz B2B en React (Vite), consumo de la API, gestión del estado global (JWT) y construcción de la interfaz dinámica paso a paso ("Mapper UI"). |
| **Andrés Sebastián Salcedo Morales** | **QA & Security Lead** | Base de Datos, Criptografía y Calidad | **Gestión:** Asegurar que los entregables cumplan con la *Definition of Done* (DoD), liderar las métricas de calidad (ISO 25010\) y auditar el cumplimiento de la Ley 19.628 sobre protección de datos PII.**Técnico:** Modelado de la base de datos híbrida en PostgreSQL (tablas relacionales y columnas JSONB), implementación del cifrado criptográfico simétrico (AES) y desarrollo de las pruebas automatizadas (unitarias, integración y seguridad). |

**Dinámica de Trabajo y Herramientas** Para sostener esta distribución de roles, el equipo utilizará **Jira Software** como la herramienta central para la planificación de Sprints y la documentación de historias de usuario. A su vez, la trazabilidad del código se auditará mediante **GitHub**, donde será obligatorio el uso de *Smart Commits* (ej. SGP-15: \[mensaje\]) para vincular el trabajo técnico de Bernardo, Ángel y Andrés directamente con las tareas de gestión documentadas en Jira.

## 5\. Mapa Mental (Estructura de la Solución) {#5.-mapa-mental-(estructura-de-la-solución)}

El siguiente mapa mental representa la arquitectura conceptual y funcional de **SGP-Minero**, desglosando la plataforma en sus cinco pilares tecnológicos y operativos fundamentales para cumplir con el Producto Mínimo Viable (MVP):

* **SGP-MINERO (Core del Sistema)**  
  * **1\. Actores y Accesos (RBAC)**  
    * **Administrador:** Gestión paramétrica y carga masiva (CSV).  
    * **Cargador:** Operador logístico, ingesta de Excel y mapeo.  
    * **Consultor:** Auditoría, lectura de Dashboards y exportación.

  * **2\. Capa de Presentación (Frontend \- React.js / Vite)**  
    * **Seguridad UI:** Login y manejo del estado global mediante JSON Web Tokens (JWT).  
    * **Flujo de Ingesta:** Zona *Drag & Drop* con validación estricta de extensiones .xlsx.  
    * **Mapper UI:** Interfaz dinámica de menús desplegables para emparejar columnas del Excel con los campos obligatorios (RUT y Nombre).  
    * **Visualización:** Dashboards corporativos y tablas de retroalimentación de errores.

  * **3\. Capa Lógica y Procesamiento (Backend \- Python / Django)**  
    * **Procesamiento de Archivos:** Integración con la librería pandas para extracción de encabezados e iteración de filas.  
    * **Motor de Validación:** Algoritmo matemático Módulo 11 (RUT) y normalización de cadenas de texto para coincidencia de identidad.  
    * **Motor Criptográfico:** Cifrado simétrico AES (librería cryptography) aplicado exclusivamente a los datos sensibles PII antes del guardado.  
    * **Mantenedor Masivo:** Controlador (Endpoint) especializado para actualizar la base maestra vía archivos estandarizados.

  * **4\. Capa de Persistencia (Base de Datos \- PostgreSQL / Neon)**  
    * **Esquema Relacional Estricto:** Tablas de Usuario, Rol, Usuario\_Rol y Maestro\_Personas.  
    * **Esquema Híbrido (Documental):** Tabla Registro\_Viaje utilizando la columna nativa JSONB para almacenar el contenido variable de los Excel procesados y cifrados.

  * **5\. DevSecOps e Infraestructura (Entorno de Trabajo)**  
    * **Contenedores:** Archivos Dockerfile separados y orquestación local con docker-compose.yml.  
    * **Gestión de Secretos:** Aislamiento de llaves de cifrado y credenciales mediante archivos .env ignorados en el repositorio.  
    * **Control de Versiones:** Repositorio en GitHub con README.md estructurado y uso de *Smart Commits* integrados a Jira.

## 6\. Impact Mapping (Alineación Estratégica) {#6.-impact-mapping-(alineación-estratégica)}

El siguiente mapa de impacto conecta los objetivos de negocio de la empresa minera con los actores involucrados, el cambio de comportamiento esperado y las funcionalidades técnicas específicas (entregables) que el equipo desarrollará en el MVP de **SGP-Minero** para lograr dichos objetivos.

| Objetivo de Negocio (¿Por qué?) | Actor (¿Quién?) | Impacto / Cambio de Comportamiento (¿Cómo?) | Entregable Técnico (¿Qué?) |
| :---- | :---- | :---- | :---- |
| **1\. Erradicar pérdidas económicas por compra de pasajes inválidos.** | **Cargador** (Operativo) | Deja de revisar manualmente los formatos variables del Excel y delega la verificación de identidad al sistema. | **1\.** Interfaz "Mapper UI" para estandarizar la entrada de columnas dinámicas.**2\.** Motor Backend con algoritmo de validación (Módulo 11\) y cruce de nombres contra la base maestra. |
| **2\. Garantizar cumplimiento legal y privacidad de datos (Ley N° 19.628).** | **Sistema** (Backend / DB) | Protege de manera automatizada la información PII (RUT, Nombre) contra accesos no autorizados o filtraciones. | **1\.** Implementación de Criptografía simétrica (AES) mediante la librería cryptography.**2\.** Almacenamiento seguro de filas procesadas en una columna nativa JSONB. |
| **3\. Agilizar la actualización de la información de los trabajadores.** | **Administrador** (Gerencia) | Mantiene la tabla oficial de trabajadores siempre actualizada sin depender de ingresos manuales ni de costosas integraciones con ERPs. | **1\.** Módulo "Mantenedor Ágil" con endpoint exclusivo para la carga masiva mediante archivos estandarizados (CSV/Excel). |
| **4\. Proveer trazabilidad y visibilidad operativa en tiempo real.** | **Consultor** (Auditor) | Obtiene acceso inmediato y seguro a los registros validados para ejecutar auditorías y toma de decisiones. | **1\.** Panel de visualización (Dashboard corporativo) de solo lectura con filtros dinámicos integrados. |

## 7\. User Story Mapping (Viajes de Usuario por Rol) {#7.-user-story-mapping-(viajes-de-usuario-por-rol)}

El siguiente mapeo describe los flujos de valor longitudinales del Producto Mínimo Viable (MVP). Se desglosa el viaje secuencial que realiza cada actor del sistema, detallando las interacciones tecnológicas entre la capa de presentación (React), la lógica de negocio (Django) y la persistencia de datos (PostgreSQL), garantizando el cumplimiento de la Ley N° 19.628.

### A. Viaje del Usuario: Rol Cargador (Flujo Operativo de Ingesta) {#a.-viaje-del-usuario:-rol-cargador-(flujo-operativo-de-ingesta)}

El "Cargador" es el usuario operativo de primera línea. Su flujo es el corazón transaccional del sistema, diseñado para transformar la ingesta manual y propensa a errores en un proceso estandarizado, guiado y algorítmicamente seguro.

**Fase 1: Autenticación y Autorización (Onboarding Seguro)**

* **Interacción del Usuario:** El Cargador ingresa sus credenciales corporativas en la interfaz de Login inicial.  
* **Respuesta del Frontend (React):** Envía la petición a la API. Al recibir una respuesta exitosa, almacena el *Access Token* de corta duración exclusivamente en la memoria temporal del cliente (ej. Zustand o Context API), mitigando riesgos de ataques XSS (prohibición de uso de localStorage).  
* **Lógica de Enrutamiento (RBAC):** El frontend decodifica el *payload* del JWT para identificar el rol ("Cargador"). Automáticamente, el enrutador (React Router) redirige al usuario a la vista de "Zona de Carga", bloqueando algorítmicamente cualquier intento de navegación hacia paneles administrativos o dashboards gerenciales.

**Fase 2: Pre-análisis y Subida del Archivo (Upload & Parsing)**

* **Interacción del Usuario:** El Cargador navega a la zona de *Drag & Drop* y arrastra un archivo que contiene las solicitudes de pasajes.  
* **Respuesta del Frontend (React):** Ejecuta una validación primaria en el navegador, aceptando estricta y únicamente archivos con la extensión .xlsx. Muestra un indicador de carga (spinner) mientras se comunica con el servidor.  
* **Respuesta del Backend (Django/Pandas):** El servidor recibe el archivo en memoria temporal. Utilizando la librería pandas, implementa bloques try-catch para capturar posibles corrupciones del archivo. El motor lee **exclusivamente la primera fila** para extraer los encabezados (headers) y devuelve al frontend un array JSON con los nombres exactos de las columnas detectadas (ej. \["ID\_Trabajador", "Nombre\_Completo", "Fecha"\]).

**Fase 3: Mapeo Dinámico y Prevención de Errores (Mapper UI)**

* **Interacción del Usuario:** El Cargador visualiza en pantalla un formulario dinámico (Mapper UI). Su tarea es utilizar menús desplegables para emparejar las columnas variables de su Excel con los campos obligatorios requeridos por el sistema (RUT y Nombre).  
* **Respuesta del Frontend (React):** Aplica el principio de *Usabilidad Preventiva*. La interfaz bloquea el botón de "Procesar Documento" y evita la petición HTTP hasta que el Cargador haya mapeado exitosamente todos los campos críticos.  
* **Generación de Payload:** Una vez completado, el frontend genera un objeto JSON de mapeo (ej. {"map\_rut": "ID\_Trabajador", "map\_nombre": "Nombre\_Completo"}) y lo envía al backend junto con el archivo.

**Fase 4: Motor de Validación y Criptografía (Core Processing)**

* **Interacción del Usuario:** El Cargador espera el procesamiento visualizando una alerta de "Procesando lote".  
* **Lógica de Validación (Backend):** Utilizando pandas, el sistema itera sobre cada fila aplicando tres barreras de seguridad:  
  1. **Limpieza:** Normaliza formatos de fecha y descarta filas vacías para evitar excepciones no controladas.  
  2. **Validación Matemática:** Ejecuta el algoritmo Módulo 11 sobre el campo mapeado como RUT, rechazando inmediatamente la fila si el dígito verificador es incorrecto.  
  3. **Cruce de Identidad Interno:** Normaliza las cadenas de texto (convierte a minúsculas, elimina tildes y espacios sobrantes) y compara el nombre del Excel contra el registro oficial en la tabla Maestro\_Personas.  
* **Lógica Criptográfica y Persistencia:** Si la fila es declarada válida, el backend extrae la Información de Identificación Personal (PII). Utilizando la librería cryptography (módulo AES/Fernet) y una llave maestra oculta en el .env, cifra el RUT y el Nombre. Finalmente, re-empaqueta el diccionario completo de la fila y lo inserta en la columna JSONB de la tabla Registro\_Viaje en PostgreSQL.

**Fase 5: Retroalimentación Estructurada (Feedback Visual)**

* **Interacción del Usuario:** El Cargador visualiza el resultado final de su gestión sin que el proceso se haya visto interrumpido por errores aislados (Tolerancia a Fallos).  
* **Respuesta del Sistema:** El backend devuelve un JSON consolidado. El frontend renderiza una notificación emergente (*Toast*) indicando el fin del proceso, y despliega una tabla de datos limpia y estructurada que muestra:  
  * Total de filas procesadas con éxito.  
  * Detalle exacto de los rechazos (Ej: Fila 45 | Motivo: El RUT ingresado es inválido matemáticamente).  
* Esta retroalimentación le permite al Cargador abrir su Excel original, corregir los datos puntuales señalados por el sistema y volver a procesar, eliminando las horas de revisión manual a ciegas.

### B. Viaje del Usuario: Rol Administrador (Flujo de Mantenimiento B2B) {#b.-viaje-del-usuario:-rol-administrador-(flujo-de-mantenimiento-b2b)}

El "Administrador" es un perfil gerencial o de Soporte TI. Su viaje de usuario está diseñado para resolver la necesidad crítica de mantener la base de datos de trabajadores actualizada de forma masiva, rápida y autónoma, mitigando la restricción técnica de no contar con integraciones automatizadas hacia sistemas ERP externos (como SAP o Buk).

**Fase 1: Autenticación Privilegiada y Enrutamiento (RBAC)**

* **Interacción del Usuario:** El Administrador ingresa sus credenciales en el portal de inicio de sesión.  
* **Lógica de Enrutamiento (React):** El sistema procesa la autenticación y almacena el JWT en memoria. Al decodificar el *payload*, el frontend identifica el rol privilegiado de "Administrador".  
* **Renderizado Condicional:** Gracias a este rol, React renderiza dinámicamente elementos ocultos en el menú de navegación (Sidebar), habilitando el acceso a la vista exclusiva denominada "Mantenedor Ágil del Maestro".

**Fase 2: Preparación y Carga Masiva (Data Ingestion)**

* **Interacción del Usuario:** El Administrador recibe desde el departamento de Recursos Humanos una nómina actualizada de trabajadores autorizados (propios o subcontratistas) y la arrastra hacia la zona de carga del Mantenedor.  
* **Validación de Interfaz (Frontend):** El sistema verifica que el documento cumpla con el formato estandarizado exigido para cargas paramétricas (archivo CSV o Excel previamente normalizado). Una vez validado, se envía la petición POST protegida por el token de autorización hacia el servidor.

**Fase 3: Procesamiento Transaccional y Sincronización (Backend UPSERT)**

* **Interacción del Usuario:** Visualiza un indicador de procesamiento mientras el servidor sincroniza los datos.  
* **Lógica Transaccional (Django/Pandas):** El backend recibe el archivo y utiliza la librería pandas para recorrer la nómina completa. A diferencia de la tabla híbrida JSONB usada por el Cargador, el Administrador interactúa directamente con la tabla estrictamente relacional Maestro\_Personas en PostgreSQL.  
* **Algoritmo de Actualización:** El servidor ejecuta una operación lógica tipo *UPSERT* (Update or Insert):  
  1. Si el RUT extraído del archivo **no existe** en la base de datos, inserta el nuevo registro (RUT, Nombre Completo, Centro de Costo, Estado Activo).  
  2. Si el RUT **ya existe**, actualiza sus campos dependientes (por ejemplo, actualizando su centro de costo o cambiando su estado booleano a inactivo si fue desvinculado).

**Fase 4: Confirmación y Trazabilidad (Feedback Ejecutivo)**

* **Interacción del Usuario:** El Administrador recibe la confirmación visual de que la base maestra ha sido sincronizada.  
* **Respuesta del Sistema (Frontend):** La UI renderiza notificaciones emergentes (Toasts) informando el éxito de la transacción. A continuación, despliega un panel de métricas consolidado que indica:  
  * Cantidad de nuevos trabajadores ingresados al sistema.  
  * Cantidad de perfiles existentes actualizados.  
  * Errores de formato encontrados en la plantilla (si los hubiese).  
* **Impacto Operativo:** A partir de este instante, cualquier nueva carga realizada por el rol "Cargador" será validada algorítmicamente contra este maestro recién actualizado, garantizando que el motor de ingesta opere con la "fuente de verdad" más reciente de la minera.

### C. Viaje del Usuario: Rol Consultor (Flujo de Auditoría y Control) {#c.-viaje-del-usuario:-rol-consultor-(flujo-de-auditoría-y-control)}

El "Consultor" representa a las jefaturas, gerencia de operaciones, o auditores internos. Su viaje de usuario está diseñado para proveer visibilidad total y en tiempo real sobre los datos logísticos procesados, garantizando la trazabilidad corporativa sin comprometer la integridad de la información, operando bajo un esquema estricto de "Solo Lectura" (Read-Only).

**Fase 1: Autenticación y Cierre Perimetral (RBAC Estricto)**

* **Interacción del Usuario:** El Consultor inicia sesión en la plataforma con sus credenciales institucionales.  
* **Lógica de Enrutamiento (React):** Al decodificar el *Access Token* (JWT) almacenado en memoria, el frontend identifica el perfil de auditoría. El sistema lo redirige inmediatamente a la vista principal del Dashboard corporativo.  
* **Protección de API y Vistas (Seguridad):** A nivel de interfaz, los botones de "Subir Archivo" o "Mantenedor" simplemente no se renderizan en el DOM. A nivel de servidor, los controladores de Django REST Framework (DRF) rechazarán automáticamente con un error HTTP 403 (Forbidden) cualquier intento del Consultor por forzar una petición POST/PUT/DELETE hacia los endpoints transaccionales, blindando el sistema.

**Fase 2: Exploración de Datos y Filtrado Dinámico (Data Visualization)**

* **Interacción del Usuario:** El Consultor interactúa con un panel de control (Dashboard) limpio y estructurado, equipado con herramientas de búsqueda y menús desplegables de filtrado.  
* **Lógica de Consulta (Backend/PostgreSQL):** El usuario aplica filtros específicos (ej. "Búsqueda por rango de fechas de vuelo" o "Filtrar por Centro de Costo"). El backend procesa esta solicitud ejecutando consultas optimizadas sobre la base de datos PostgreSQL. Al extraer información desde la columna dinámica JSONB de la tabla Registro\_Viaje, el servidor desempaqueta los datos pertinentes y los envía al frontend de forma segura y estructurada.

**Fase 3: Auditoría y Trazabilidad (Accountability)**

* **Interacción del Usuario:** Visualiza el historial completo de solicitudes de pasajes validadas a través de una tabla interactiva.  
* **Visualización de la Trazabilidad:** El sistema le permite auditar el ciclo de vida del dato. El Consultor puede visualizar inalterablemente qué usuario "Cargador" subió cada registro, a qué hora exacta se procesó y si fue cruzado exitosamente contra el maestro. Esto da cumplimiento directo a la métrica de *Accountability* exigida por la normativa de seguridad de la información (ISO 25010).

**Fase 4: Exportación Segura (Reporting)**

* **Interacción del Usuario:** El Consultor presiona el botón de exportación para llevarse los datos filtrados hacia su propio entorno de trabajo.  
* **Respuesta del Sistema:** El frontend formatea la tabla visible y genera un archivo plano (CSV/Excel) de solo lectura con los registros auditados. El Consultor culmina su flujo obteniendo la inteligencia de negocios que necesitaba sin haber alterado un solo byte en la base de datos oficial, garantizando la seguridad en reposo de la plataforma.

## 

## 8\. Épicas del Proyecto (Roadmap de Desarrollo) {#8.-épicas-del-proyecto-(roadmap-de-desarrollo)}

Para estructurar el trabajo en el Product Backlog y organizar las tareas dentro del marco de trabajo Scrum, el proyecto "SGP-Minero" se ha dividido en 7 Épicas fundamentales. Estas Épicas representan los grandes contenedores de valor técnico y funcional que el equipo desarrollará a lo largo de las 18 semanas de la asignatura, y se encuentran configuradas y priorizadas en el tablero oficial de **Jira Software**.

**EPIC 1: Infraestructura Base y Entorno DevSecOps**

* **Objetivo:** Establecer los cimientos del proyecto configurando un ecosistema de desarrollo estandarizado y seguro.  
* **Alcance:** Incluye la configuración del repositorio central en GitHub, la creación de los archivos Dockerfile optimizados para Frontend (React) y Backend (Django), y la orquestación del entorno local mediante docker-compose.yml. Garantiza el aislamiento de credenciales mediante el uso estricto de variables de entorno (.env).

**EPIC 2: Autenticación y Autorización (Control de Acceso RBAC)**

* **Objetivo:** Construir la barrera de seguridad perimetral de la plataforma.  
* **Alcance:** Abarca el diseño y migración de las tablas relacionales de seguridad en PostgreSQL (Usuario, Rol, Usuario\_Rol), la generación de JSON Web Tokens (JWT) en el backend y la configuración de rutas privadas en React para restringir el acceso según los perfiles operativos de la minera (Administrador, Cargador, Consultor).

**EPIC 3: Pre-procesamiento de Archivos y Mapper UI**

* **Objetivo:** Desarrollar la experiencia de usuario (UX) corporativa para la ingesta segura de planillas Excel variables.  
* **Alcance:** Desarrollo del componente *Drag & Drop* validando extensiones .xlsx, y construcción de la interfaz dinámica de mapeo (Mapper UI). Incluye la lógica preventiva en React que bloquea el envío del formulario si el usuario no ha emparejado las columnas obligatorias del sistema.

**EPIC 4: Motor de Validación y Reglas de Negocio**

* **Objetivo:** Desarrollar el "cerebro" del sistema, encargado de evitar la ingesta de datos logísticos corruptos o inválidos.  
* **Alcance:** Programación de la lógica en Python utilizando la librería pandas para recorrer masivamente el archivo. Incluye el desarrollo del algoritmo matemático de verificación del dígito verificador (Módulo 11\) y la normalización de cadenas de texto para comparar y validar la identidad contra la base maestra interna.

**EPIC 5: Criptografía de Datos PII y Persistencia JSONB**

* **Objetivo:** Dar cumplimiento íntegro a la Ley N° 19.628 sobre Protección de la Vida Privada, resguardando la información sensible de los trabajadores.  
* **Alcance:** Implementación de la librería cryptography (módulo AES/Fernet) para cifrar dinámicamente el RUT y Nombre de los registros validados, y su posterior persistencia segura dentro de la columna flexible JSONB de la tabla Registro\_Viaje en la base de datos.

**EPIC 6: Operatividad B2B (Mantenedor Ágil y Dashboards)**

* **Objetivo:** Desarrollar las herramientas satélites necesarias para la gerencia y auditoría, mitigando la restricción de no contar con conexión a ERPs externos.  
* **Alcance:** Construcción del endpoint de carga masiva (CSV) para actualizar rápidamente la tabla relacional Maestro\_Personas (Rol Administrador), y el desarrollo de vistas analíticas de solo lectura con filtros dinámicos (Rol Consultor).

**EPIC 7: QA, NFRs (Requisitos No Funcionales) y Despliegue en Producción**

* **Objetivo:** Cumplir con las métricas de calidad (ISO 25010\) exigidas por la rúbrica y realizar el paso a producción.  
* **Alcance:** Redacción y ejecución de pruebas automatizadas unitarias, de integración, de seguridad (RBAC/Cifrado) y de rendimiento (procesamiento de 5.000 filas). Culmina con el despliegue de los servicios en plataformas Cloud de capa gratuita (Vercel para Frontend, Render para Backend, y Neon para PostgreSQL con conexión forzada SSL).

## 9\. Historias de Usuario (Product Backlog Inicial Completo) {#9.-historias-de-usuario-(product-backlog-inicial-completo)}

Las Historias de Usuario de "SGP-Minero" conforman el Product Backlog inicial necesario para liberar el Producto Mínimo Viable (MVP) en las 18 semanas de desarrollo. Están redactadas siguiendo el estándar ágil (Modelo INVEST) y estimadas utilizando la secuencia de Fibonacci en Story Points (SP).

La numeración de los *tickets* en Jira (Código Jira) refleja la secuencia real de creación: los identificadores **SGP-1 al SGP-7** fueron asignados a las 7 Épicas del proyecto, por lo que las Historias de Usuario inician su correlativo a partir de **SGP-8**.

| ID Lógico | Código Jira | Épica Asociada | Historia de Usuario | Criterios de Aceptación (Definition of Done) | SP |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **US-01** | **SGP-8** | EP 2: Autenticación | **Como** usuario del sistema, **quiero** iniciar sesión con mis credenciales, **para** acceder a mi panel operativo de forma segura. | 1\. Backend debe generar *Access* y *Refresh Token* (JWT). 2\. Contraseñas deben estar hasheadas en base de datos. 3\. Denegar acceso tras 3 intentos fallidos. | 5 |
| **US-02** | **SGP-9** | EP 2: Autenticación | **Como** sistema frontend, **quiero** leer el rol del usuario autenticado, **para** bloquear el acceso a menús y rutas no autorizadas (RBAC). | 1\. Extraer rol desde el payload del JWT en memoria. 2\. Redirigir a pantalla "Acceso Denegado" si un Cargador intenta entrar a rutas de Administrador. | 3 |
| **US-03** | **SGP-10** | EP 3: Mapper UI | **Como** Cargador, **quiero** arrastrar mi archivo a una zona de carga, **para** iniciar el proceso de validación de pasajes. | 1\. UI con zona *Drag & Drop* funcional. 2\. Frontend debe rechazar archivos que no sean .xlsx. 3\. Mostrar indicador de carga (spinner) al enviar. | 2 |
| **US-04** | **SGP-11** | EP 3: Mapper UI | **Como** motor de ingesta, **quiero** leer solo la primera fila del Excel subido, **para** extraer los encabezados originales sin saturar la memoria. | 1\. Implementar pandas en el backend. 2\. Prevenir caídas (try-catch) si el archivo está corrupto. 3\. Retornar un array JSON con los nombres de las columnas. | 3 |
| **US-05** | **SGP-12** | EP 3: Mapper UI | **Como** Cargador, **quiero** emparejar las columnas de mi archivo con las del sistema mediante un asistente, **para** que el motor de validación sepa dónde buscar el RUT y el Nombre. | 1\. UI con menús desplegables para cada campo obligatorio. 2\. Bloquear botón "Procesar" si faltan mapeos críticos. 3\. Generar y enviar JSON de mapeo al backend. | 5 |
| **US-06** | **SGP-13** | EP 4: Validación | **Como** sistema de validación, **quiero** comprobar matemáticamente el RUT ingresado, **para** descartar filas que contengan RUTs falsos o mal digitados. | 1\. Limpiar string (quitar guiones y puntos). 2\. Ejecutar algoritmo Módulo 11 en el backend. 3\. Marcar fila como error si el dígito verificador falla. | 5 |
| **US-07** | **SGP-14** | EP 4: Validación | **Como** sistema de validación, **quiero** cruzar el nombre del Excel con la base de datos oficial, **para** garantizar que el pasaje se compre para un trabajador habilitado. | 1\. Consultar existencia del RUT en tabla Maestro\_Personas. 2\. Normalizar texto (quitar tildes, pasar a minúsculas) antes de comparar nombres. 3\. Rechazar fila si no hay coincidencia exacta. | 5 |
| **US-08** | **SGP-15** | EP 5: Criptografía | **Como** encargado de seguridad, **quiero** que los datos PII válidos se cifren antes de guardarse, **para** cumplir con la Ley 19.628 de protección de datos. | 1\. Implementar AES vía librería cryptography. 2\. Inyectar llave maestra desde variables de entorno .env. 3\. Cifrar RUT y Nombre antes de ejecutar el INSERT. | 8 |
| **US-09** | **SGP-16** | EP 5: Criptografía | **Como** arquitecto de datos, **quiero** guardar las filas validadas en un formato flexible, **para** soportar columnas adicionales del Excel sin romper el modelo relacional. | 1\. Configurar columna JSONB en tabla Registro\_Viaje (PostgreSQL). 2\. Insertar el diccionario completo (ya cifrado) mediante ORM de Django. | 3 |
| **US-10** | **SGP-17** | EP 4: Feedback | **Como** Cargador, **quiero** ver un resumen claro de los errores encontrados tras el proceso, **para** saber exactamente qué filas de mi Excel debo corregir. | 1\. Tolerancia a fallos: procesar lote completo sin detenerse ante un error. 2\. Retornar JSON con filas exitosas y detalle de errores. 3\. Renderizar tabla de retroalimentación en la UI. | 5 |
| **US-11** | **SGP-18** | EP 6: Operatividad | **Como** Administrador, **quiero** subir un archivo estandarizado con la nómina de RRHH, **para** actualizar masivamente a los trabajadores activos en el sistema. | 1\. Endpoint acepta archivo CSV o Excel normado. 2\. Ejecutar Upsert (Actualizar o Insertar) en Maestro\_Personas. 3\. Retornar recuento total de registros afectados al frontend. | 5 |
| **US-12** | **SGP-19** | EP 6: Operatividad | **Como** Consultor, **quiero** visualizar y filtrar las solicitudes de pasajes aprobadas, **para** auditar los procesos logísticos sin riesgo de alterar los datos. | 1\. Crear Dashboard de solo lectura (Read-Only). 2\. Implementar filtros dinámicos (fecha, centro de costo). 3\. Permitir exportación de la tabla filtrada. | 8 |

## 10\. Product Backlog Priorizado {#10.-product-backlog-priorizado}

El Product Backlog de SGP-Minero se estructura utilizando la matriz de priorización **MoSCoW**, asegurando que el desarrollo técnico se alinee con las necesidades críticas del negocio y garantice la entrega del Producto Mínimo Viable (MVP) dentro de las 18 semanas establecidas. Esta estrategia mitiga los riesgos arquitectónicos de forma temprana.

### Must Have (Críticos \- Sprints 1 y 2\) {#must-have-(críticos---sprints-1-y-2)}

Son los requerimientos innegociables para resolver la ingesta de Excel y cumplir la Ley 19.628 de protección de datos PII.

* **SGP-8 & SGP-9:** Autenticación segura vía JWT y bloqueo de rutas mediante control de acceso por roles.  
* **SGP-10 al SGP-12:** Componente de carga de archivos, extracción de encabezados con Pandas y Mapper UI preventivo.  
* **SGP-13 & SGP-14:** Motor lógico para el cálculo matemático del Módulo 11 y la validación de identidad interna.  
* **SGP-15 & SGP-16:** Cifrado criptográfico AES de datos sensibles y almacenamiento en la columna híbrida JSONB.

### Should y Could Have (Valor B2B \- Sprint 3\) {#should-y-could-have-(valor-b2b---sprint-3)}

Funcionalidades de alto valor para la operatividad logística, programadas una vez estabilizado el flujo central de seguridad.

* **SGP-17:** Tabla estructurada de retroalimentación de errores para orientar la gestión del Cargador.  
* **SGP-18:** Endpoint de actualización masiva (CSV) para el Administrador del maestro de personas.  
* **SGP-19:** Dashboard corporativo de solo lectura con filtros dinámicos para auditorías del Consultor.  
* **Mejoras Adicionales:** Ejecución de pruebas automatizadas de rendimiento simulando 5.000 filas concurrentes.

### Won't Have (Fuera de Alcance Estricto) {#won't-have-(fuera-de-alcance-estricto)}

Límites operativos definidos para asegurar la factibilidad técnica y evitar desviaciones del MVP.

* Conexiones automatizadas o integraciones con sistemas ERP externos corporativos (como SAP o Buk).  
* Verificación de identidad mediante APIs gubernamentales o de servicios de terceros para evitar la fuga de datos PII.


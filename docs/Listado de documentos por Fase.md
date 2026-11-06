# Listado de Documentos y Evidencias Exigidas por Fase (Capstone Duoc UC 2026)

La siguiente matriz resume los artefactos metodológicos y de ingeniería exigidos a lo largo de las 3 Fases académicas de la asignatura Capstone ([`Instructivo CAPSTONE 2026.md`](Instructivo%20CAPSTONE%202026.md)), seguida del estado real de cada entregable en el repositorio **SGP-Minero** al **`2026-11-06`**.

| **Listado de documentos** | **FASE 1** | **FASE 2** | **FASE 3** |
| :--- | :---: | :---: | :---: |
| Análisis del Caso | X | | |
| Squad y responsabilidades | X | | |
| Mapa Mental | X | | |
| Mapa de Actores | X | | |
| Visión del Proyecto + 4 pilares | X | | |
| Épicas | X | | |
| Historias de Usuario (con criterios de aceptación y estimación) | X | | |
| Impact Mapping | X | | |
| Product Backlog Priorizado | X | | |
| User Story Mapping | X | | |
| **Para los Sprints (Estos documentos se desarrollan en cada uno de los Sprints)** | | | |
| Sprint Planning | | X | X |
| Sprint Backlog | | X | X |
| Scrumboard | | X | X |
| Burndown Chart | | X | X |
| Daily Meeting | | X | X |
| Registro de impedimentos - Impediment log | | X | X |
| Release | | X | X |
| Review | | X | X |
| Retrospective | | X | X |
| Retrospectiva del proyecto | | | X |
| **Evidencias técnicas de ingeniería de software (según contexto del proyecto)** | | | |
| Diagrama de Arquitectura (Diagrama de Despliegue y Diagrama de Componentes) | Bosquejo | X | X |
| Modelo Relacional normalizado (+ justificación columna híbrida `JSONB`) | Bosquejo | X | X |
| Diagramas UML: Diagrama de Clases y Diagramas de Secuencia de las 2 funcionalidades principales | | X | X |
| Plan de Pruebas | | X | X |
| Ejecución y evidencia de pruebas: unitarias, caja negra, integración, rendimiento (5.000 filas) y seguridad | | X | X |

---

## Estado y Ubicación Actual en el Proyecto (`2026-11-06`)

| Bloque Documental | Estado Actual | Ubicación / Observación Operativa |
| :--- | :---: | :--- |
| **Artefactos Ágiles de Fase 1** (*Análisis, Squad, Mapa Mental, Actores, Visión, Épicas, US, Impact Mapping, MoSCoW, Story Mapping*) | **Completado** | Entregable histórico inmutable en `Fase 1/Evidencias Grupales/DOCUMENTACIÓN ÁGIL - FASE 1_ SGP-MINERO.docx` y versión viva actualizada en [`DOCUMENTACIÓN ÁGIL - FASE 1_ SGP-MINERO.md`](DOCUMENTACIÓN%20ÁGIL%20-%20FASE%201_%20SGP-MINERO.md). |
| **Daily Meeting e Impediment Log (Sprints 1 a 4)** | **En curso** | Gestionado en [`Daily Scrum.xlsx`](Daily%20Scrum.xlsx) (`Sprint 1` completo; `Sprint 2` Semanas 9–10 completas y Semanas 11–12 por completar; `Sprint 3` y `Sprint 4` con estructura lista). |
| **Ceremonias Scrum (*Planning, Review, Retrospective, Backlog/Release*)** | **En curso (Externo)** | Llevadas en **documento maestro en Word** tras el reemplazo operativo de Jira; pendiente adjuntar copia consolidada para cierre de Fase 2 / Fase 3, apoyándose en las métricas de Story Points de [`INFORME_REVISION_Y_AVANCE_SGP_MINERO.md`](INFORME_REVISION_Y_AVANCE_SGP_MINERO.md). |
| **Diagrama de Arquitectura y Modelo Relacional (6 entidades + `JSONB`)** | **Parcial** | Bosquejos originales embebidos en [`DOCUMENTACIÓN ÁGIL - FASE 1_ SGP-MINERO.md`](DOCUMENTACIÓN%20ÁGIL%20-%20FASE%201_%20SGP-MINERO.md) y modelo físico de 6 tablas documentado en [`../database/README.md`](../database/README.md); pendiente generar las láminas gráficas definitivas actualizadas para Fase 2 Final / Fase 3. |
| **Diagramas UML (*Clases y 2 Secuencias Principales*)** | **Pendiente** | Por elaborar para cierre de Fase 2 / Fase 3 (Secuencia 1: Autenticación JWT + Cookie `HttpOnly` + Bloqueo; Secuencia 2: Ingesta Excel -> Módulo 11 -> `Maestro_Personas` -> `Fernet` -> `JSONB`). |
| **Plan de Pruebas y Evidencias QA** | **Parcial** | **34 pruebas automatizadas** activas en `backend/core/` + GitHub Actions CI ([`../backend/README.md`](../backend/README.md)); pendiente documento formal de Plan de Pruebas y evidencia del benchmark de 5.000 filas + captura SQL (`US-14 / SGP-26`). |

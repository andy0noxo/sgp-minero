# Set de 5 Archivos Excel de Prueba para el Rol Cargador (`SGP-Minero`)

Este directorio contiene **5 planillas Excel (`.xlsx`)** diseñadas para probar de extremo a extremo el **Asistente de Carga de Nóminas de Pasajes (`/cargar`)** y la vista **Mis Cargas (`/historial`)** del rol **Cargador**.

Cada archivo fue generado contra los **75 trabajadores oficiales** precargados en `Maestro_Personas` por el comando `python manage.py seed_demo_data`, de modo que las filas válidas cruzan exitosamente e inyectan automáticamente **`Estado de Habilitación`**, **`Faena Minera`** y **`Centro de Costo`**, mientras que las filas con errores controlados activan las reglas de negocio del motor validador (`INVALID_RUT`, `PERSON_INACTIVE`, `IDENTITY_MISMATCH` y `PERSON_NOT_FOUND`).

---

## Resumen de los 5 Archivos de Prueba

| # | Archivo `.xlsx` | Total Filas | Filas Aprobadas | Filas Rechazadas | Modalidad de Fecha de Vuelo | Columnas Auto-Detectadas (Nombre Estándar) | Columnas para Asignar Manualmente | Columnas Estándar en Blanco (`—`) | Columnas Extra → `JSONB` |
| :- | :--- | :-: | :-: | :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | `01_Nomina_Estandar_10_filas.xlsx` | **10** | **8** | **2** (`1 INVALID_RUT`, `1 PERSON_INACTIVE`) | **Solicitud de emisión (Solo fecha)** (`YYYY-MM-DD`) | `RUT_Pasajero`, `Nombre_Completo`, `Fecha_Vuelo`, `Origen`, `Destino`, `Aerolínea`, `Turno`, `Telefono_Contacto`, `Anotaciones` (**9 de 9**) | Ninguna (todas coinciden con el estándar) | Ninguna | Ninguna |
| **2** | `02_Contratista_Manual_Sin_Ruta_25_filas.xlsx` | **25** | **20** | **5** (`2 INVALID_RUT`, `2 PERSON_INACTIVE`, `1 IDENTITY_MISMATCH`) | **Vuelo comercial/chárter (Fecha y hora)** (`YYYY-MM-DD HH:MM`) | Ninguna (**0 de 9**) | `RUN_Operario` → RUT<br>`Trabajador_Nombre` → Nombre<br>`Fec_Traslado_Hora` → Fecha Vuelo<br>`Aerolinea_Operadora` → Aerolínea<br>`Ciclo_Turno` → Turno<br>`Observaciones_Contrato` → Anotaciones | `Origen`, `Destino`, `Teléfono` (quedan en blanco `—` en la tabla) | Ninguna |
| **3** | `03_Mixto_Charter_Tramo_AM_PM_50_filas.xlsx` | **50** | **42** | **8** (`2 INVALID_RUT`, `2 PERSON_INACTIVE`, `2 IDENTITY_MISMATCH`, `2 PERSON_NOT_FOUND`) | **Solicitud por tramo horario (AM/PM)** y **Vuelo Chárter / Comercial asignado** | `RUT_Pasajero`, `Origen`, `Destino`, `Turno` (**4 auto-detectadas**) | `Nom_Trabajador_Minero` → Nombre<br>`Fecha_Tramo_Viaje` → Fecha Vuelo<br>`Fono_Movil` → Teléfono | `Aerolínea`, `Anotaciones` (quedan en blanco `—` en la tabla) | `Codigo_Reserva_PNR`, `Campamento_Pabellon` |
| **4** | `04_Operacion_Completa_Ciclo_JSONB_100_filas.xlsx` | **100** | **85** | **15** (`4 INVALID_RUT`, `4 PERSON_INACTIVE`, `4 IDENTITY_MISMATCH`, `3 PERSON_NOT_FOUND`) | **Ciclo Ida y Regreso (Turno)** (`15/11/2026 al 22/11/2026`) y fechas chilenas (`DD/MM/YYYY`) | Ninguna (**0 auto-detectadas**) | `Doc_Identidad` → RUT<br>`Pasajero_Minero` → Nombre<br>`Ciclo_Fechas_Vuelo` → Fecha Vuelo<br>`Ciudad_Origen` → Origen<br>`Faena_Destino_Aerodromo` → Destino<br>`Linea_Aerea` → Aerolínea<br>`Regimen_Turno` → Turno<br>`Celular_Emergencia` → Teléfono<br>`Glosa_Imputacion` → Anotaciones | Ninguna (las 9 asignadas manualmente) | `Nro_Ticket_ETKT`, `Peso_Equipaje_Kg`, `EPP_Especial` |
| **5** | `05_Masivo_Multiformato_500_filas.xlsx` | **500** | **420** | **80** (`20` de cada código de rechazo) | **Multiformato (las 5 modalidades mineras combinadas)** | `RUT`, `Nombre_Completo`, `Origen`, `Destino`, `Aerolínea`, `Turno` (**6 auto-detectadas**) | `Fec_Programada_Vuelo` → Fecha Vuelo<br>`Celular_Pasajero` → Teléfono<br>`Notas_Embarque` → Anotaciones | Ninguna | `Contrato_Marco`, `Autorizado_Por` |

---

## Regeneración Automática del Set de Prueba

Si en cualquier momento deseas regenerar los 5 archivos Excel de prueba desde el código fuente, ejecuta:

```bash
docker compose exec backend python manage.py generate_sample_excels --output-dir /app/_archivos_prueba
```

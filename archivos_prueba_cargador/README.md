# Set de Archivos Excel de Prueba (`Administrador` + `Cargador`) — `SGP-Minero`

Este directorio contiene tanto la **planilla maestra de trabajadores (`Maestro_Personas`) para el rol Administrador** como las **5 planillas Excel (`.xlsx`) de nóminas de pasajes para el rol Cargador**.

---

## 1. Archivo para el Rol `Administrador` (`Mantenedor Masivo de Personas` en `/carga`)

| Archivo | Formato | Filas | Columnas Oficiales | Uso y Resultado Esperado |
| :--- | :-: | :-: | :--- | :--- |
| **`00_Maestro_Personas_Administrador_75_trabajadores.xlsx`**<br>**`00_Maestro_Personas_Administrador_75_trabajadores.csv`** | `.xlsx` / `.csv` | **75** | `rut`, `nombre_completo`, `faena`, `centro_costo`, `estado_habilitacion` | Contiene exactamente a los **75 trabajadores** (`56 Habilitados` y `19 Inhabilitados`, repartidos en `Faena Cordillera`, `Faena Norte` y `Faena Central` y centros de costo `MINA-01`..`MINA-05`) contra los cuales se validan los 5 archivos Excel del rol **Cargador**.<br>• Si la tabla `Maestro_Personas` estaba vacía (`SEED_DEMO_MASTER_DATA=False` o en Producción): crea **`75 Nuevos Creados · 0 Actualizados · 0 Rechazados`**.<br>• Si ya tenía el seed local activo (`SEED_DEMO_MASTER_DATA=True`): ejecuta `UPSERT` mostrando **`0 Nuevos Creados · 75 Actualizados · 0 Rechazados`**. |

---

## 2. Los 5 Archivos para el Rol `Cargador` (`Asistente de Carga de Pasajes` en `/carga`)

Cada uno de estos 5 archivos cruza contra los 75 trabajadores de `00_Maestro_Personas_Administrador_75_trabajadores.xlsx`, de modo que las filas válidas inyectan automáticamente **`Estado de Habilitación`**, **`Faena Minera`** y **`Centro de Costo`**, y las filas con errores controlados activan las reglas de validación (`INVALID_RUT`, `PERSON_INACTIVE`, `IDENTITY_MISMATCH` y `PERSON_NOT_FOUND`).

| # | Archivo `.xlsx` | Total Filas | Filas Aprobadas | Filas Rechazadas | Modalidad de Fecha de Vuelo | Columnas Auto-Detectadas (Nombre Estándar) | Columnas para Asignar Manualmente | Columnas Estándar en Blanco (`—`) | Columnas Extra → `JSONB` |
| :- | :--- | :-: | :-: | :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | `01_Nomina_Estandar_10_filas.xlsx` | **10** | **8** | **2** (`1 INVALID_RUT`, `1 PERSON_INACTIVE`) | **Solicitud de emisión (Solo fecha)** (`YYYY-MM-DD`) | `RUT_Pasajero`, `Nombre_Completo`, `Fecha_Vuelo`, `Origen`, `Destino`, `Aerolínea`, `Turno`, `Telefono_Contacto`, `Anotaciones` (**9 de 9**) | Ninguna (todas coinciden con el estándar) | Ninguna | Ninguna |
| **2** | `02_Contratista_Manual_Sin_Ruta_25_filas.xlsx` | **25** | **20** | **5** (`2 INVALID_RUT`, `2 PERSON_INACTIVE`, `1 IDENTITY_MISMATCH`) | **Vuelo comercial/chárter (Fecha y hora)** (`YYYY-MM-DD HH:MM`) | Ninguna (**0 de 9**) | `RUN_Operario` → RUT<br>`Trabajador_Nombre` → Nombre<br>`Fec_Traslado_Hora` → Fecha Vuelo<br>`Aerolinea_Operadora` → Aerolínea<br>`Ciclo_Turno` → Turno<br>`Observaciones_Contrato` → Anotaciones | `Origen`, `Destino`, `Teléfono` (quedan en blanco `—` en la tabla) | Ninguna |
| **3** | `03_Mixto_Charter_Tramo_AM_PM_50_filas.xlsx` | **50** | **42** | **8** (`2 INVALID_RUT`, `2 PERSON_INACTIVE`, `2 IDENTITY_MISMATCH`, `2 PERSON_NOT_FOUND`) | **Solicitud por tramo horario (AM/PM)** y **Vuelo Chárter / Comercial asignado** | `RUT_Pasajero`, `Origen`, `Destino`, `Turno` (**4 auto-detectadas**) | `Nom_Trabajador_Minero` → Nombre<br>`Fecha_Tramo_Viaje` → Fecha Vuelo<br>`Fono_Movil` → Teléfono | `Aerolínea`, `Anotaciones` (quedan en blanco `—` en la tabla) | `Codigo_Reserva_PNR`, `Campamento_Pabellon` |
| **4** | `04_Operacion_Completa_Ciclo_JSONB_100_filas.xlsx` | **100** | **85** | **15** (`4 INVALID_RUT`, `4 PERSON_INACTIVE`, `4 IDENTITY_MISMATCH`, `3 PERSON_NOT_FOUND`) | **Ciclo Ida y Regreso (Turno)** (`15/11/2026 al 22/11/2026`) y fechas chilenas (`DD/MM/YYYY`) | Ninguna (**0 auto-detectadas**) | `Doc_Identidad` → RUT<br>`Pasajero_Minero` → Nombre<br>`Ciclo_Fechas_Vuelo` → Fecha Vuelo<br>`Ciudad_Origen` → Origen<br>`Faena_Destino_Aerodromo` → Destino<br>`Linea_Aerea` → Aerolínea<br>`Regimen_Turno` → Turno<br>`Celular_Emergencia` → Teléfono<br>`Glosa_Imputacion` → Anotaciones | Ninguna (las 9 asignadas manualmente) | `Nro_Ticket_ETKT`, `Peso_Equipaje_Kg`, `EPP_Especial` |
| **5** | `05_Masivo_Multiformato_500_filas.xlsx` | **500** | **420** | **80** (`20` de cada código de rechazo) | **Multiformato (las 5 modalidades mineras combinadas)** | `RUT`, `Nombre_Completo`, `Origen`, `Destino`, `Aerolínea`, `Turno` (**6 auto-detectadas**) | `Fec_Programada_Vuelo` → Fecha Vuelo<br>`Celular_Pasajero` → Teléfono<br>`Notas_Embarque` → Anotaciones | Ninguna | `Contrato_Marco`, `Autorizado_Por` |

---

## Regeneración Automática del Set de Prueba

Si en cualquier momento deseas regenerar todos los archivos desde el código fuente, ejecuta:

```bash
docker compose exec backend python manage.py generate_sample_excels --output-dir /app/_archivos_prueba
```

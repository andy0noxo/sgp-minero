from pathlib import Path

import pandas as pd
from django.core.management.base import BaseCommand

from core.management.commands.seed_demo_data import (
    DEMO_COST_CENTERS,
    DEMO_FAENAS,
    DEMO_MASTER_ROW_COUNT,
    DEMO_NAMES,
    _rut_for_number,
)


def _get_seeded_workers():
    """Return list of dicts matching the 75 seeded Maestro_Personas records."""
    workers = []
    for index in range(DEMO_MASTER_ROW_COUNT):
        rut = _rut_for_number(20000000 + index)
        nombre = f"{DEMO_NAMES[index % len(DEMO_NAMES)]} Demo {index + 1}"
        faena = DEMO_FAENAS[index % len(DEMO_FAENAS)]
        centro_costo = DEMO_COST_CENTERS[index % len(DEMO_COST_CENTERS)]
        habilitado = index % 4 != 0
        workers.append(
            {
                "index": index,
                "rut": rut,
                "nombre": nombre,
                "faena": faena,
                "centro_costo": centro_costo,
                "habilitado": habilitado,
            }
        )
    return workers


def _broken_dv_rut(valid_rut):
    number, dv = valid_rut.split("-")
    wrong_dv = "1" if dv != "1" else "2"
    return f"{number}-{wrong_dv}"


class Command(BaseCommand):
    help = (
        "Genera 5 archivos Excel (.xlsx) de prueba para el rol Cargador "
        "con 10, 25, 50, 100 y 500 filas y distintos escenarios de mapeo."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--output-dir",
            default=None,
            help="Directorio de salida para los 5 archivos .xlsx",
        )

    def handle(self, *args, **options):
        output_dir = options.get("output_dir")
        if output_dir:
            target_dir = Path(output_dir)
        else:
            repo_root = Path(__file__).resolve().parents[4]
            target_dir = repo_root / "docs" / "archivos_prueba_cargador"

        target_dir.mkdir(parents=True, exist_ok=True)
        workers = _get_seeded_workers()
        enabled_workers = [w for w in workers if w["habilitado"]]
        disabled_workers = [w for w in workers if not w["habilitado"]]

        files_created = []

        # ------------------------------------------------------------------
        # ARCHIVO 0 (ADMINISTRADOR): Maestro_Personas (75 trabajadores)
        # Columnas oficiales: rut, nombre_completo, faena, centro_costo,
        # estado_habilitacion. Permite poblar o sincronizar la tabla maestra
        # desde el rol Administrador y garantiza que los 5 Excel del Cargador
        # entreguen exactamente los mismos resultados esperados.
        # ------------------------------------------------------------------
        rows_maestro = [
            {
                "rut": w["rut"],
                "nombre_completo": w["nombre"],
                "faena": w["faena"],
                "centro_costo": w["centro_costo"],
                "estado_habilitacion": (
                    "Habilitado" if w["habilitado"] else "Inhabilitado"
                ),
            }
            for w in workers
        ]
        df_maestro = pd.DataFrame(rows_maestro)
        path_0_xlsx = (
            target_dir / "00_Maestro_Personas_Administrador_75_trabajadores.xlsx"
        )
        path_0_csv = (
            target_dir / "00_Maestro_Personas_Administrador_75_trabajadores.csv"
        )
        df_maestro.to_excel(path_0_xlsx, index=False)
        df_maestro.to_csv(path_0_csv, index=False, encoding="utf-8-sig")
        files_created.append((path_0_xlsx.name, len(rows_maestro)))
        files_created.append((path_0_csv.name, len(rows_maestro)))

        # ------------------------------------------------------------------
        # ARCHIVO 1: 10 filas - Nombres estándar (Auto-detectados 9/9)
        # Modalidad fecha: Solicitud de emisión (Solo fecha)
        # 8 válidas + 2 errores (1 INVALID_RUT, 1 PERSON_INACTIVE)
        # ------------------------------------------------------------------
        rows_10 = []
        origenes = ["SCL", "IQQ", "CCP", "LSC"]
        destinos = ["CJC", "ANF", "CPO"]
        aerolineas = ["LATAM", "SKY Airline", "JetSMART"]
        turnos = ["7x7", "14x14", "4x3"]

        for i in range(8):
            w = enabled_workers[i % len(enabled_workers)]
            rows_10.append(
                {
                    "RUT_Pasajero": w["rut"],
                    "Nombre_Completo": w["nombre"],
                    "Fecha_Vuelo": f"2026-11-{15 + i:02d}",
                    "Origen": origenes[i % len(origenes)],
                    "Destino": destinos[i % len(destinos)],
                    "Aerolínea": aerolineas[i % len(aerolineas)],
                    "Turno": turnos[i % len(turnos)],
                    "Telefono_Contacto": f"+5698410{100 + i:03d}",
                    "Anotaciones": "Emisión estándar turno minero",
                }
            )
        # Fila 9: RUT con dígito verificador inválido (INVALID_RUT)
        rows_10.append(
            {
                "RUT_Pasajero": _broken_dv_rut(enabled_workers[0]["rut"]),
                "Nombre_Completo": enabled_workers[0]["nombre"],
                "Fecha_Vuelo": "2026-11-25",
                "Origen": "SCL",
                "Destino": "CJC",
                "Aerolínea": "LATAM",
                "Turno": "7x7",
                "Telefono_Contacto": "+5698410991",
                "Anotaciones": "Caso prueba: DV inválido Módulo 11",
            }
        )
        # Fila 10: Trabajador inhabilitado en Maestro_Personas (PERSON_INACTIVE)
        rows_10.append(
            {
                "RUT_Pasajero": disabled_workers[0]["rut"],
                "Nombre_Completo": disabled_workers[0]["nombre"],
                "Fecha_Vuelo": "2026-11-26",
                "Origen": "SCL",
                "Destino": "ANF",
                "Aerolínea": "SKY Airline",
                "Turno": "14x14",
                "Telefono_Contacto": "+5698410992",
                "Anotaciones": "Caso prueba: Persona inhabilitada en Maestro",
            }
        )
        path_1 = target_dir / "01_Nomina_Estandar_10_filas.xlsx"
        pd.DataFrame(rows_10).to_excel(path_1, index=False)
        files_created.append((path_1.name, len(rows_10)))

        # ------------------------------------------------------------------
        # ARCHIVO 2: 25 filas - Nombres manuales de contratista y SIN Origen,
        # Destino ni Teléfono (quedan en blanco "—" en la estructura de tabla)
        # Modalidad fecha: Vuelo comercial/chárter (Fecha y hora)
        # 20 válidas + 5 errores
        # ------------------------------------------------------------------
        rows_25 = []
        horas = ["06:45", "08:30", "11:15", "15:20", "19:50"]
        for i in range(20):
            w = enabled_workers[i % len(enabled_workers)]
            day_num = (i % 15) + 10
            hora_str = horas[i % len(horas)]
            rows_25.append(
                {
                    "RUN_Operario": w["rut"],
                    "Trabajador_Nombre": w["nombre"],
                    "Fec_Traslado_Hora": f"2026-11-{day_num:02d} {hora_str}",
                    "Aerolinea_Operadora": aerolineas[i % len(aerolineas)],
                    "Ciclo_Turno": turnos[i % len(turnos)],
                    "Observaciones_Contrato": f"Subcontrato Mantención #{i + 1}",
                }
            )
        # 5 filas con error (2 INVALID_RUT, 2 PERSON_INACTIVE, 1 IDENTITY_MISMATCH)
        for i in range(2):
            rows_25.append(
                {
                    "RUN_Operario": _broken_dv_rut(enabled_workers[i + 2]["rut"]),
                    "Trabajador_Nombre": enabled_workers[i + 2]["nombre"],
                    "Fec_Traslado_Hora": "2026-11-28 08:30",
                    "Aerolinea_Operadora": "LATAM",
                    "Ciclo_Turno": "7x7",
                    "Observaciones_Contrato": "Error esperado: INVALID_RUT",
                }
            )
        for i in range(2):
            dw = disabled_workers[i + 1]
            rows_25.append(
                {
                    "RUN_Operario": dw["rut"],
                    "Trabajador_Nombre": dw["nombre"],
                    "Fec_Traslado_Hora": "2026-11-28 11:15",
                    "Aerolinea_Operadora": "SKY Airline",
                    "Ciclo_Turno": "14x14",
                    "Observaciones_Contrato": "Error esperado: PERSON_INACTIVE",
                }
            )
        rows_25.append(
            {
                "RUN_Operario": enabled_workers[5]["rut"],
                "Trabajador_Nombre": "Trabajador Nombre No Coincide",
                "Fec_Traslado_Hora": "2026-11-29 15:20",
                "Aerolinea_Operadora": "LATAM",
                "Ciclo_Turno": "7x7",
                "Observaciones_Contrato": "Error esperado: IDENTITY_MISMATCH",
            }
        )
        path_2 = target_dir / "02_Contratista_Manual_Sin_Ruta_25_filas.xlsx"
        pd.DataFrame(rows_25).to_excel(path_2, index=False)
        files_created.append((path_2.name, len(rows_25)))

        # ------------------------------------------------------------------
        # ARCHIVO 3: 50 filas - Mixto (algunas estándar auto-detectadas y
        # otras manuales) + sin Aerolínea ni Anotaciones + 2 columnas extra JSONB
        # Modalidad fecha: Tramo horario AM/PM y Vuelo Chárter asignado
        # 42 válidas + 8 errores
        # ------------------------------------------------------------------
        rows_50 = []
        tramos_y_charters = [
            "2026-11-20 AM (Mañana)",
            "2026-11-20 PM (Tarde)",
            "2026-11-21 Charter LA-901 07:15",
            "2026-11-22 Vuelo SKY-810 18:40",
            "2026-11-23 Tramo Diurno AM",
        ]
        for i in range(42):
            w = enabled_workers[i % len(enabled_workers)]
            rows_50.append(
                {
                    "RUT_Pasajero": w["rut"],  # Estándar (auto-detectada)
                    "Nom_Trabajador_Minero": w["nombre"],  # Manual
                    "Fecha_Tramo_Viaje": tramos_y_charters[
                        i % len(tramos_y_charters)
                    ],  # Manual
                    "Origen": origenes[i % len(origenes)],  # Estándar (auto-detectada)
                    "Destino": destinos[i % len(destinos)],  # Estándar (auto-detectada)
                    "Turno": turnos[i % len(turnos)],  # Estándar (auto-detectada)
                    "Fono_Movil": f"+5697520{100 + i:03d}",  # Manual
                    "Codigo_Reserva_PNR": f"PNR-MIN-{300 + i}",  # Extra -> JSONB
                    "Campamento_Pabellon": f"Pabellón {(i % 6) + 1}",  # Extra -> JSONB
                }
            )
        # 8 filas con error (INVALID_RUT, PERSON_INACTIVE, MISMATCH, NOT_FOUND)
        for i in range(2):
            rows_50.append(
                {
                    "RUT_Pasajero": _broken_dv_rut(enabled_workers[i + 4]["rut"]),
                    "Nom_Trabajador_Minero": enabled_workers[i + 4]["nombre"],
                    "Fecha_Tramo_Viaje": "2026-11-24 AM (Mañana)",
                    "Origen": "SCL",
                    "Destino": "CJC",
                    "Turno": "7x7",
                    "Fono_Movil": "+5697520901",
                    "Codigo_Reserva_PNR": f"PNR-ERR-0{i + 1}",
                    "Campamento_Pabellon": "Pabellón 1",
                }
            )
        for i in range(2):
            dw = disabled_workers[i + 3]
            rows_50.append(
                {
                    "RUT_Pasajero": dw["rut"],
                    "Nom_Trabajador_Minero": dw["nombre"],
                    "Fecha_Tramo_Viaje": "2026-11-24 PM (Tarde)",
                    "Origen": "SCL",
                    "Destino": "ANF",
                    "Turno": "14x14",
                    "Fono_Movil": "+5697520902",
                    "Codigo_Reserva_PNR": f"PNR-ERR-1{i + 1}",
                    "Campamento_Pabellon": "Pabellón 2",
                }
            )
        for i in range(2):
            w = enabled_workers[i + 8]
            rows_50.append(
                {
                    "RUT_Pasajero": w["rut"],
                    "Nom_Trabajador_Minero": f"Nombre Discrepante {i + 1}",
                    "Fecha_Tramo_Viaje": "2026-11-25 Charter LA-901 07:15",
                    "Origen": "IQQ",
                    "Destino": "CJC",
                    "Turno": "7x7",
                    "Fono_Movil": "+5697520903",
                    "Codigo_Reserva_PNR": f"PNR-ERR-2{i + 1}",
                    "Campamento_Pabellon": "Pabellón 3",
                }
            )
        for i in range(2):
            unregistered_rut = _rut_for_number(25000000 + i)
            rows_50.append(
                {
                    "RUT_Pasajero": unregistered_rut,
                    "Nom_Trabajador_Minero": f"Externo No Enrolado {i + 1}",
                    "Fecha_Tramo_Viaje": "2026-11-25 PM (Tarde)",
                    "Origen": "SCL",
                    "Destino": "CJC",
                    "Turno": "4x3",
                    "Fono_Movil": "+5697520904",
                    "Codigo_Reserva_PNR": f"PNR-ERR-3{i + 1}",
                    "Campamento_Pabellon": "Pabellón 4",
                }
            )
        path_3 = target_dir / "03_Mixto_Charter_Tramo_AM_PM_50_filas.xlsx"
        pd.DataFrame(rows_50).to_excel(path_3, index=False)
        files_created.append((path_3.name, len(rows_50)))

        # ------------------------------------------------------------------
        # ARCHIVO 4: 100 filas - Todas las 9 columnas con nombres personalizados
        # + 3 columnas extra JSONB (Nro_Ticket_ETKT, Peso_Equipaje_Kg, EPP_Especial)
        # Modalidad fecha: Ciclo Ida y Regreso (Turno) y Fechas DD/MM/YYYY
        # 85 válidas + 15 errores
        # ------------------------------------------------------------------
        rows_100 = []
        ciclos = [
            "15/11/2026 al 22/11/2026",
            "18/11/2026 al 02/12/2026",
            "Ida 20/11/2026 - Regreso 27/11/2026",
            "25/11/2026",
            "26/11/2026 07:40",
        ]
        epps = [
            "Casco + Autorrescatador",
            "Arnes Altura + Geólogo",
            "Estándar Mina",
            "Dieléctrico",
        ]
        for i in range(85):
            w = enabled_workers[i % len(enabled_workers)]
            rows_100.append(
                {
                    "Doc_Identidad": w["rut"],
                    "Pasajero_Minero": w["nombre"],
                    "Ciclo_Fechas_Vuelo": ciclos[i % len(ciclos)],
                    "Ciudad_Origen": origenes[i % len(origenes)],
                    "Faena_Destino_Aerodromo": destinos[i % len(destinos)],
                    "Linea_Aerea": aerolineas[i % len(aerolineas)],
                    "Regimen_Turno": turnos[i % len(turnos)],
                    "Celular_Emergencia": f"+5696300{100 + i:03d}",
                    "Glosa_Imputacion": f"Cambio de guardia cuadrilla #{(i % 5) + 1}",
                    "Nro_Ticket_ETKT": f"045-2900{1000 + i}",
                    "Peso_Equipaje_Kg": 23 if i % 2 == 0 else 15,
                    "EPP_Especial": epps[i % len(epps)],
                }
            )
        # 15 errores (4 INVALID_RUT, 4 INACTIVE, 4 MISMATCH, 3 NOT_FOUND)
        for i in range(15):
            if i < 4:
                rut_val = _broken_dv_rut(enabled_workers[i]["rut"])
                nom_val = enabled_workers[i]["nombre"]
                nota = "Error prueba: INVALID_RUT"
            elif i < 8:
                dw = disabled_workers[i % len(disabled_workers)]
                rut_val = dw["rut"]
                nom_val = dw["nombre"]
                nota = "Error prueba: PERSON_INACTIVE"
            elif i < 12:
                w = enabled_workers[i]
                rut_val = w["rut"]
                nom_val = f"Identidad No Coincide {i}"
                nota = "Error prueba: IDENTITY_MISMATCH"
            else:
                rut_val = _rut_for_number(26000000 + i)
                nom_val = f"Subcontratista Sin Enrolar {i}"
                nota = "Error prueba: PERSON_NOT_FOUND"

            rows_100.append(
                {
                    "Doc_Identidad": rut_val,
                    "Pasajero_Minero": nom_val,
                    "Ciclo_Fechas_Vuelo": "15/11/2026 al 22/11/2026",
                    "Ciudad_Origen": "SCL",
                    "Faena_Destino_Aerodromo": "CJC",
                    "Linea_Aerea": "LATAM",
                    "Regimen_Turno": "7x7",
                    "Celular_Emergencia": "+5696300999",
                    "Glosa_Imputacion": nota,
                    "Nro_Ticket_ETKT": f"045-ERR-{i:03d}",
                    "Peso_Equipaje_Kg": 20,
                    "EPP_Especial": "Estándar Mina",
                }
            )
        path_4 = target_dir / "04_Operacion_Completa_Ciclo_JSONB_100_filas.xlsx"
        pd.DataFrame(rows_100).to_excel(path_4, index=False)
        files_created.append((path_4.name, len(rows_100)))

        # ------------------------------------------------------------------
        # ARCHIVO 5: 500 filas - Masivo Multiformato (Estándar + Manual + JSONB)
        # Incluye los 5 formatos de fecha de vuelo mineros
        # 420 válidas + 80 errores
        # ------------------------------------------------------------------
        rows_500 = []
        multiformatos_fecha = [
            "2026-12-01",
            "2026-12-02 08:15",
            "2026-12-03 AM (Mañana)",
            "2026-12-04 Charter LA-905 06:50",
            "05/12/2026 al 12/12/2026",
        ]
        for i in range(420):
            w = enabled_workers[i % len(enabled_workers)]
            rows_500.append(
                {
                    "RUT": w["rut"],  # Estándar
                    "Nombre_Completo": w["nombre"],  # Estándar
                    "Fec_Programada_Vuelo": multiformatos_fecha[
                        i % len(multiformatos_fecha)
                    ],  # Manual
                    "Origen": origenes[i % len(origenes)],  # Estándar
                    "Destino": destinos[i % len(destinos)],  # Estándar
                    "Aerolínea": aerolineas[i % len(aerolineas)],  # Estándar
                    "Turno": turnos[i % len(turnos)],  # Estándar
                    "Celular_Pasajero": f"+5695100{1000 + i:04d}",  # Manual
                    "Notas_Embarque": f"Operación masiva lote #{(i % 10) + 1}",
                    "Contrato_Marco": f"CM-2026-{(i % 8) + 1:02d}",
                    "Autorizado_Por": "Jefatura Turno Operaciones",
                }
            )
        for i in range(80):
            mod = i % 4
            if mod == 0:
                rut_val = _broken_dv_rut(
                    enabled_workers[i % len(enabled_workers)]["rut"]
                )
                nom_val = enabled_workers[i % len(enabled_workers)]["nombre"]
                nota = "Rechazo esperado: INVALID_RUT"
            elif mod == 1:
                dw = disabled_workers[i % len(disabled_workers)]
                rut_val = dw["rut"]
                nom_val = dw["nombre"]
                nota = "Rechazo esperado: PERSON_INACTIVE"
            elif mod == 2:
                w = enabled_workers[i % len(enabled_workers)]
                rut_val = w["rut"]
                nom_val = f"Nombre Incorrecto Masivo {i}"
                nota = "Rechazo esperado: IDENTITY_MISMATCH"
            else:
                rut_val = _rut_for_number(27000000 + i)
                nom_val = f"Pasajero No Registrado {i}"
                nota = "Rechazo esperado: PERSON_NOT_FOUND"

            rows_500.append(
                {
                    "RUT": rut_val,
                    "Nombre_Completo": nom_val,
                    "Fec_Programada_Vuelo": multiformatos_fecha[
                        i % len(multiformatos_fecha)
                    ],
                    "Origen": "SCL",
                    "Destino": "CJC",
                    "Aerolínea": "LATAM",
                    "Turno": "7x7",
                    "Celular_Pasajero": "+56951009999",
                    "Notas_Embarque": nota,
                    "Contrato_Marco": "CM-2026-OBS",
                    "Autorizado_Por": "Auditoría Control",
                }
            )
        path_5 = target_dir / "05_Masivo_Multiformato_500_filas.xlsx"
        pd.DataFrame(rows_500).to_excel(path_5, index=False)
        files_created.append((path_5.name, len(rows_500)))

        for fname, count in files_created:
            self.stdout.write(
                self.style.SUCCESS(f"Generado: {fname} ({count} filas) en {target_dir}")
            )

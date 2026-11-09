import math
import uuid
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

from django.db import transaction
from django.utils import timezone

from core.models import LoteCarga, Maestro_Personas, RegistroAuditoria, RegistroViaje
from core.services.encryption import encrypt_pii
from core.services.excel_reader import FileProcessingError, read_rows
from core.services.identity_matcher import find_matching_person
from core.services.mapper import MapperValidationError, validate_mapper
from core.services.rut_validator import RutValidationError, validate_rut


def _json_value(value):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    if isinstance(value, datetime):
        if (
            value.hour == 0
            and value.minute == 0
            and value.second == 0
            and value.microsecond == 0
        ):
            return value.date().isoformat()
        return value.isoformat(sep=" ")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, float):
        return int(value) if value.is_integer() else value
    if isinstance(value, Decimal):
        return int(value) if value == int(value) else float(value)
    if isinstance(value, str):
        text = value.strip()
        if len(text) == 19 and (
            text.endswith(" 00:00:00") or text.endswith("T00:00:00")
        ):
            return text[:10]
        return text
    return value


def process_travel_file(uploaded_file, mapping, user):
    if Path(uploaded_file.name).suffix.lower() != ".xlsx":
        raise FileProcessingError("La carga de viajes solo acepta archivos .xlsx.")
    try:
        dataframe = read_rows(uploaded_file)
        mapping = validate_mapper(
            mapping, [str(column) for column in dataframe.columns]
        )
    except (FileProcessingError, MapperValidationError):
        raise

    errors = []
    processed = 0
    rows = list(dataframe.to_dict(orient="records"))

    filas_leidas_excel = len(rows)
    filas_vacias_ignoradas = 0
    aprobadas_modulo11 = 0
    rechazadas_modulo11 = 0
    aprobadas_maestro_y_faena = 0
    rechazadas_maestro = 0
    sample_token = ""

    # Precarga masiva de personas en O(1) para evitar el problema N+1 SQL
    # en lotes grandes (US-14 / SGP-26)
    candidate_ruts = set()
    for row in rows:
        rut_value = row.get(mapping["map_rut"])
        if rut_value is not None:
            try:
                candidate_ruts.add(validate_rut(rut_value))
            except RutValidationError:
                pass

    people_dict = {
        p.rut: p for p in Maestro_Personas.objects.filter(rut__in=candidate_ruts)
    }

    records_to_create = []

    with transaction.atomic():
        batch = LoteCarga.objects.create(
            cargador=user,
            nombre_archivo_origen=uploaded_file.name,
            total_filas=len(rows),
        )

        for row_number, row in enumerate(rows, start=2):
            rut_value = row.get(mapping["map_rut"])
            name_value = row.get(mapping["map_nombre"])
            if (
                rut_value is None
                or name_value is None
                or (isinstance(name_value, float) and math.isnan(name_value))
            ):
                filas_vacias_ignoradas += 1
                errors.append(
                    {
                        "fila": row_number,
                        "code": "EMPTY_REQUIRED_VALUE",
                        "message": "La fila no contiene RUT y nombre completos.",
                    }
                )
                continue

            try:
                normalized_rut = validate_rut(rut_value)
                aprobadas_modulo11 += 1
            except RutValidationError as exc:
                rechazadas_modulo11 += 1
                errors.append(
                    {
                        "fila": row_number,
                        "code": "INVALID_RUT",
                        "message": str(exc),
                    }
                )
                continue

            person, identity_error = find_matching_person(
                normalized_rut, name_value, people_dict=people_dict
            )
            if identity_error:
                rechazadas_maestro += 1
                code = (
                    "PERSON_NOT_FOUND"
                    if "no existe" in identity_error
                    else (
                        "PERSON_INACTIVE"
                        if "habilitada" in identity_error
                        else "IDENTITY_MISMATCH"
                    )
                )
                errors.append(
                    {
                        "fila": row_number,
                        "code": code,
                        "message": identity_error,
                    }
                )
                continue

            aprobadas_maestro_y_faena += 1

            payload = {str(key): _json_value(value) for key, value in row.items()}
            payload.pop(mapping["map_rut"], None)
            payload.pop(mapping["map_nombre"], None)

            mapped_fecha_col = mapping.get("map_fecha_vuelo")
            if mapped_fecha_col:
                fecha_vuelo_val = _json_value(row.get(mapped_fecha_col))
                payload.pop(mapped_fecha_col, None)
                payload["fecha_vuelo"] = fecha_vuelo_val

            cifrado_rut = encrypt_pii(normalized_rut)
            cifrado_nombre = encrypt_pii(person.nombre_completo)
            if not sample_token and cifrado_rut:
                sample_token = f"{cifrado_rut[:12]}..."

            payload.update(
                {
                    "rut_cifrado": cifrado_rut,
                    "nombre_cifrado": cifrado_nombre,
                    "faena": person.faena,
                }
            )
            records_to_create.append(
                RegistroViaje(
                    id=uuid.uuid4(),
                    lote=batch,
                    cargador=user,
                    nombre_archivo_origen=uploaded_file.name,
                    fila_origen=row_number,
                    estado_validacion=RegistroViaje.EstadoValidacion.APROBADO,
                    payload_datos=payload,
                )
            )
            processed += 1

        if records_to_create:
            RegistroViaje.objects.bulk_create(records_to_create, batch_size=1000)

        mapped_columns_set = {
            col
            for col in (
                mapping.get("map_rut"),
                mapping.get("map_nombre"),
                mapping.get("map_fecha_vuelo"),
            )
            if col
        }
        dynamic_cols = [
            str(col) for col in dataframe.columns if col not in mapped_columns_set
        ]

        pipeline_trace = {
            "filas_leidas_excel": filas_leidas_excel,
            "filas_vacias_ignoradas": filas_vacias_ignoradas,
            "aprobadas_modulo11": aprobadas_modulo11,
            "rechazadas_modulo11": rechazadas_modulo11,
            "aprobadas_maestro_y_faena": aprobadas_maestro_y_faena,
            "rechazadas_maestro": rechazadas_maestro,
            "campos_pii_cifrados_fernet": processed * 2,
            "columnas_dinamicas_jsonb": dynamic_cols,
            "ejemplo_token_cifrado": sample_token or "gAAAAAB...",
        }

        batch.filas_procesadas = processed
        batch.filas_rechazadas = len(errors)
        batch.estado = (
            LoteCarga.Estado.COMPLETADO_CON_ERRORES
            if errors
            else LoteCarga.Estado.COMPLETADO
        )
        batch.detalle_errores = errors
        batch.fecha_termino = timezone.now()
        batch.save(
            update_fields=(
                "filas_procesadas",
                "filas_rechazadas",
                "detalle_errores",
                "estado",
                "fecha_termino",
            )
        )
        RegistroAuditoria.objects.create(
            usuario=user,
            accion="PROCESAR_CARGA_VIAJES",
            modulo="INGESTA",
            resultado=RegistroAuditoria.Resultado.EXITOSO,
            metadata={
                "lote_id": str(batch.id),
                "total_procesados": processed,
                "total_errores": len(errors),
                "pipeline_trace": pipeline_trace,
            },
        )

    return {
        "lote_id": str(batch.id),
        "total_filas": len(rows),
        "total_procesados": processed,
        "total_errores": len(errors),
        "detalle_errores": errors,
        "pipeline_trace": pipeline_trace,
    }

import math
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

from django.db import transaction

from core.models import LoteCarga, RegistroAuditoria, RegistroViaje
from core.services.encryption import encrypt_pii
from core.services.excel_reader import FileProcessingError, read_rows
from core.services.identity_matcher import find_matching_person
from core.services.mapper import MapperValidationError, validate_mapper
from core.services.rut_validator import RutValidationError, validate_rut


def _json_value(value):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def process_travel_file(uploaded_file, mapping, user):
    if Path(uploaded_file.name).suffix.lower() != '.xlsx':
        raise FileProcessingError('La carga de viajes solo acepta archivos .xlsx.')
    try:
        dataframe = read_rows(uploaded_file)
        mapping = validate_mapper(mapping, [str(column) for column in dataframe.columns])
    except (FileProcessingError, MapperValidationError):
        raise

    errors = []
    processed = 0
    rows = list(dataframe.to_dict(orient='records'))

    with transaction.atomic():
        batch = LoteCarga.objects.create(
            cargador=user,
            nombre_archivo_origen=uploaded_file.name,
            total_filas=len(rows),
        )

        for row_number, row in enumerate(rows, start=2):
            rut_value = row.get(mapping['map_rut'])
            name_value = row.get(mapping['map_nombre'])
            if rut_value is None or name_value is None or (
                isinstance(name_value, float) and math.isnan(name_value)
            ):
                errors.append({
                    'fila': row_number,
                    'code': 'EMPTY_REQUIRED_VALUE',
                    'message': 'La fila no contiene RUT y nombre completos.',
                })
                continue

            try:
                normalized_rut = validate_rut(rut_value)
            except RutValidationError as exc:
                errors.append({
                    'fila': row_number,
                    'code': 'INVALID_RUT',
                    'message': str(exc),
                })
                continue

            person, identity_error = find_matching_person(normalized_rut, name_value)
            if identity_error:
                code = 'PERSON_NOT_FOUND' if 'no existe' in identity_error else (
                    'PERSON_INACTIVE' if 'habilitada' in identity_error else 'IDENTITY_MISMATCH'
                )
                errors.append({
                    'fila': row_number,
                    'code': code,
                    'message': identity_error,
                })
                continue

            payload = {str(key): _json_value(value) for key, value in row.items()}
            payload.pop(mapping['map_rut'], None)
            payload.pop(mapping['map_nombre'], None)
            payload.update({
                'rut_cifrado': encrypt_pii(normalized_rut),
                'nombre_cifrado': encrypt_pii(person.nombre_completo),
            })
            RegistroViaje.objects.create(
                lote=batch,
                cargador=user,
                nombre_archivo_origen=uploaded_file.name,
                fila_origen=row_number,
                estado_validacion=RegistroViaje.EstadoValidacion.APROBADO,
                payload_datos=payload,
            )
            processed += 1

        batch.filas_procesadas = processed
        batch.filas_rechazadas = len(errors)
        batch.estado = (
            LoteCarga.Estado.COMPLETADO_CON_ERRORES
            if errors else LoteCarga.Estado.COMPLETADO
        )
        batch.save(update_fields=('filas_procesadas', 'filas_rechazadas', 'estado'))
        RegistroAuditoria.objects.create(
            usuario=user,
            accion='PROCESAR_CARGA_VIAJES',
            modulo='INGESTA',
            resultado=RegistroAuditoria.Resultado.EXITOSO,
            metadata={
                'lote_id': str(batch.id),
                'total_procesados': processed,
                'total_errores': len(errors),
            },
        )

    return {
        'lote_id': str(batch.id),
        'total_filas': len(rows),
        'total_procesados': processed,
        'total_errores': len(errors),
        'detalle_errores': errors,
    }

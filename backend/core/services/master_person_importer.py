import math

from django.db import transaction

from core.models import Maestro_Personas, RegistroAuditoria
from core.services.excel_reader import FileProcessingError, read_rows
from core.services.rut_validator import RutValidationError, validate_rut

REQUIRED_MASTER_COLUMNS = ('rut', 'nombre_completo', 'faena', 'centro_costo')
OPTIONAL_MASTER_COLUMNS = ('estado_habilitacion',)


class MasterImportError(ValueError):
    """Raised when the master-person file cannot be imported."""


def _is_empty(value):
    return value is None or (isinstance(value, float) and math.isnan(value))


def _parse_enabled(value):
    if _is_empty(value):
        return True
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().casefold()
    if normalized in {'1', 'true', 'si', 'sí', 'activo', 'habilitado', 'yes'}:
        return True
    if normalized in {'0', 'false', 'no', 'inactivo', 'inhabilitado'}:
        return False
    raise MasterImportError('estado_habilitacion debe ser booleano o un valor equivalente.')


def import_master_people(uploaded_file, user):
    try:
        dataframe = read_rows(uploaded_file)
    except FileProcessingError:
        raise

    columns = [str(column).strip().casefold() for column in dataframe.columns]
    if not len(dataframe) or not set(REQUIRED_MASTER_COLUMNS).issubset(columns):
        missing = [column for column in REQUIRED_MASTER_COLUMNS if column not in columns]
        raise MasterImportError(
            f'El archivo debe contener las columnas: {", ".join(REQUIRED_MASTER_COLUMNS)}.'
            if missing else 'El archivo no contiene filas.'
        )

    source_columns = dict(zip(columns, dataframe.columns))
    rows = dataframe.to_dict(orient='records')
    created = 0
    updated = 0
    errors = []

    with transaction.atomic():
        for row_number, row in enumerate(rows, start=2):
            try:
                rut_value = row.get(source_columns['rut'])
                name_value = row.get(source_columns['nombre_completo'])
                faena_value = row.get(source_columns['faena'])
                cost_center = row.get(source_columns['centro_costo'])
                if (
                    _is_empty(rut_value)
                    or _is_empty(name_value)
                    or _is_empty(faena_value)
                    or _is_empty(cost_center)
                ):
                    raise MasterImportError(
                        'RUT, nombre_completo, faena y centro_costo son obligatorios.'
                    )

                rut = validate_rut(rut_value)
                name = str(name_value).strip()
                operation = str(faena_value).strip()
                center = str(cost_center).strip()
                enabled = _parse_enabled(
                    row.get(source_columns.get('estado_habilitacion'))
                    if 'estado_habilitacion' in source_columns else True
                )
                person, was_created = Maestro_Personas.objects.update_or_create(
                    rut=rut,
                    defaults={
                        'nombre_completo': name,
                        'faena': operation,
                        'centro_costo': center,
                        'estado_habilitacion': enabled,
                    },
                )
                if was_created:
                    created += 1
                else:
                    updated += 1
            except (MasterImportError, RutValidationError, TypeError, ValueError) as exc:
                errors.append({
                    'fila': row_number,
                    'code': 'INVALID_MASTER_ROW',
                    'message': str(exc),
                })

        RegistroAuditoria.objects.create(
            usuario=user,
            accion='IMPORTAR_MAESTRO_PERSONAS',
            modulo='MAESTRO_PERSONAS',
            resultado=RegistroAuditoria.Resultado.EXITOSO if not errors else RegistroAuditoria.Resultado.FALLIDO,
            metadata={
                'nombre_archivo': uploaded_file.name,
                'total_filas': len(rows),
                'total_creados': created,
                'total_actualizados': updated,
                'total_errores': len(errors),
            },
        )

    return {
        'total_filas': len(rows),
        'total_creados': created,
        'total_actualizados': updated,
        'total_errores': len(errors),
        'detalle_errores': errors,
    }

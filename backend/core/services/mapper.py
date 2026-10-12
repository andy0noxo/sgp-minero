REQUIRED_MAPPER_FIELDS = ('map_rut', 'map_nombre')


class MapperValidationError(ValueError):
    pass


def validate_mapper(mapping, available_columns):
    if not isinstance(mapping, dict):
        raise MapperValidationError('El mapeo debe ser un objeto JSON.')
    missing = [field for field in REQUIRED_MAPPER_FIELDS if not mapping.get(field)]
    if missing:
        raise MapperValidationError(f'Faltan campos obligatorios: {", ".join(missing)}.')
    unknown = [mapping[field] for field in REQUIRED_MAPPER_FIELDS if mapping[field] not in available_columns]
    if unknown:
        raise MapperValidationError(f'Las columnas no existen: {", ".join(unknown)}.')
    if mapping['map_rut'] == mapping['map_nombre']:
        raise MapperValidationError('RUT y nombre deben usar columnas distintas.')
    return {field: str(mapping[field]).strip() for field in REQUIRED_MAPPER_FIELDS}

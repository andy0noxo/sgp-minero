REQUIRED_MAPPER_FIELDS = ("map_rut", "map_nombre")
OPTIONAL_MAPPER_FIELDS = ("map_fecha_vuelo",)


class MapperValidationError(ValueError):
    pass


def validate_mapper(mapping, available_columns):
    if not isinstance(mapping, dict):
        raise MapperValidationError("El mapeo debe ser un objeto JSON.")
    missing = [field for field in REQUIRED_MAPPER_FIELDS if not mapping.get(field)]
    if missing:
        raise MapperValidationError(
            f'Faltan campos obligatorios: {", ".join(missing)}.'
        )

    active_fields = list(REQUIRED_MAPPER_FIELDS)
    for opt_field in OPTIONAL_MAPPER_FIELDS:
        val = mapping.get(opt_field)
        if val is not None and str(val).strip():
            active_fields.append(opt_field)

    unknown = [
        str(mapping[field]).strip()
        for field in active_fields
        if str(mapping[field]).strip() not in available_columns
    ]
    if unknown:
        raise MapperValidationError(f'Las columnas no existen: {", ".join(unknown)}.')

    if mapping["map_rut"] == mapping["map_nombre"]:
        raise MapperValidationError("RUT y nombre deben usar columnas distintas.")

    selected_cols = [str(mapping[field]).strip() for field in active_fields]
    if len(selected_cols) != len(set(selected_cols)):
        raise MapperValidationError(
            "RUT, nombre y fecha de vuelo deben usar columnas distintas."
        )

    return {field: str(mapping[field]).strip() for field in active_fields}

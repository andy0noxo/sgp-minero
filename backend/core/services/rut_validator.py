import math
import re


class RutValidationError(ValueError):
    pass


def normalize_rut(value):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        raise RutValidationError("El RUT es obligatorio.")
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    raw_str = str(value).strip()
    if re.fullmatch(r"\d+\.0", raw_str):
        raw_str = raw_str[:-2]
    normalized = re.sub(r"[\s.-]", "", raw_str).upper()
    if not re.fullmatch(r"\d{7,8}[0-9K]", normalized):
        raise RutValidationError("El formato del RUT no es válido.")
    return f"{normalized[:-1]}-{normalized[-1]}"


def is_valid_rut(value):
    try:
        normalized = normalize_rut(value)
    except RutValidationError:
        return False
    digits, verifier = normalized.replace("-", "")[:-1], normalized[-1]
    total = 0
    multiplier = 2
    for digit in reversed(digits):
        total += int(digit) * multiplier
        multiplier = 2 if multiplier == 7 else multiplier + 1
    remainder = 11 - (total % 11)
    expected = "K" if remainder == 10 else "0" if remainder == 11 else str(remainder)
    return verifier == expected


def validate_rut(value):
    normalized = normalize_rut(value)
    if not is_valid_rut(normalized):
        raise RutValidationError("El dígito verificador del RUT no es válido.")
    return normalized

from datetime import date, datetime
import math
from pathlib import Path
import re
from zipfile import BadZipFile

import pandas as pd


class FileProcessingError(ValueError):
    pass


MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024


def format_cell_preview(val):
    if val is None or pd.isna(val):
        return ""
    if isinstance(val, datetime):
        if (
            val.hour == 0
            and val.minute == 0
            and val.second == 0
            and val.microsecond == 0
        ):
            return val.date().isoformat()
        return val.strftime("%Y-%m-%d %H:%M")
    if isinstance(val, date):
        return val.isoformat()
    if isinstance(val, float):
        if math.isnan(val):
            return ""
        if val.is_integer():
            return str(int(val))
    text = str(val).strip()
    if len(text) == 19 and (text.endswith(" 00:00:00") or text.endswith("T00:00:00")):
        return text[:10]
    return text


def classify_flight_date(val):
    """
    Normaliza y clasifica el formato de fecha de vuelo según los casos reales
    de uso en logística minera (solicitud de emisión, vuelo comercial/chárter
    con hora asignada, tramo horario AM/PM o ciclo ida/regreso).
    """
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return "", "Sin fecha informada"
    try:
        if pd.isna(val):
            return "", "Sin fecha informada"
    except (TypeError, ValueError):
        pass

    if isinstance(val, datetime):
        if (
            val.hour == 0
            and val.minute == 0
            and val.second == 0
            and val.microsecond == 0
        ):
            return val.date().isoformat(), "Solicitud de emisión (Solo fecha)"
        return (
            val.strftime("%Y-%m-%d %H:%M"),
            "Vuelo comercial/chárter (Fecha y hora)",
        )
    if isinstance(val, date):
        return val.isoformat(), "Solicitud de emisión (Solo fecha)"

    text = str(val).strip()
    if not text:
        return "", "Sin fecha informada"

    if len(text) == 19 and (text.endswith(" 00:00:00") or text.endswith("T00:00:00")):
        return text[:10], "Solicitud de emisión (Solo fecha)"

    lower = text.lower()

    # Caso 1: Ciclo de turno Ida y Regreso (ej. "2026-11-15 al 2026-11-22")
    if " al " in lower or (" - " in lower and len(text) >= 21):
        return text, "Ciclo Ida y Regreso (Turno)"

    # Caso 2: Vuelo Chárter o Comercial con código de vuelo identificado
    if any(
        kw in lower
        for kw in (
            "charter",
            "chárter",
            "vuelo",
            "la-",
            "la ",
            "sky",
            "jetsmart",
            "bus",
        )
    ):
        return text, "Vuelo Chárter / Comercial asignado"

    # Caso 3: Reserva por tramo horario (AM / PM / Mañana / Tarde / Noche)
    if any(
        kw in lower
        for kw in (" am", " pm", "(am)", "(pm)", "mañana", "manana", "tarde", "noche")
    ):
        return text, "Solicitud por tramo horario (AM/PM)"

    # Caso 4: Fecha con hora explícita HH:MM (ej. "2026-11-15 08:30")
    dt_match = re.match(
        r"^(\d{4})[-/](\d{2})[-/](\d{2})[T\s]+(\d{2}:\d{2})(?::\d{2})?$", text
    )
    if dt_match:
        y, m, d, hm = dt_match.groups()
        if hm == "00:00":
            return f"{y}-{m}-{d}", "Solicitud de emisión (Solo fecha)"
        return f"{y}-{m}-{d} {hm}", "Vuelo comercial/chárter (Fecha y hora)"

    dt_cl_match = re.match(
        r"^(\d{2})[-/](\d{2})[-/](\d{4})\s+(\d{2}:\d{2})(?::\d{2})?$", text
    )
    if dt_cl_match:
        d, m, y, hm = dt_cl_match.groups()
        if hm == "00:00":
            return f"{y}-{m}-{d}", "Solicitud de emisión (Solo fecha)"
        return f"{y}-{m}-{d} {hm}", "Vuelo comercial/chárter (Fecha y hora)"

    # Caso 5: Solo fecha en formato ISO (YYYY-MM-DD) o Chileno (DD/MM/YYYY o DD-MM-YYYY)
    iso_match = re.match(r"^(\d{4})[-/](\d{2})[-/](\d{2})$", text)
    if iso_match:
        y, m, d = iso_match.groups()
        return f"{y}-{m}-{d}", "Solicitud de emisión (Solo fecha)"

    cl_match = re.match(r"^(\d{2})[-/](\d{2})[-/](\d{4})$", text)
    if cl_match:
        d, m, y = cl_match.groups()
        return f"{y}-{m}-{d}", "Solicitud de emisión (Solo fecha)"

    return text, "Formato de fecha de contratista"


def _validate_file(uploaded_file, allowed_extensions):
    extension = Path(uploaded_file.name).suffix.lower()
    if extension not in allowed_extensions:
        raise FileProcessingError("Formato de archivo no permitido.")
    if uploaded_file.size > MAX_UPLOAD_SIZE_BYTES:
        raise FileProcessingError("El archivo supera el límite de 10 MB.")
    if uploaded_file.size == 0:
        raise FileProcessingError("El archivo está vacío.")
    return extension


def read_headers(uploaded_file):
    _validate_file(uploaded_file, {".xlsx"})
    try:
        uploaded_file.seek(0)
        dataframe = pd.read_excel(uploaded_file, nrows=0, engine="openpyxl")
    except (BadZipFile, OSError, ValueError, TypeError) as exc:
        raise FileProcessingError("El archivo Excel no se puede leer.") from exc
    columns = [str(column).strip() for column in dataframe.columns]
    if not columns or any(not column for column in columns):
        raise FileProcessingError("El archivo no contiene encabezados válidos.")
    if len(columns) != len(set(columns)):
        raise FileProcessingError("El archivo contiene encabezados duplicados.")
    return columns


def inspect_excel(uploaded_file):
    _validate_file(uploaded_file, {".xlsx"})
    try:
        uploaded_file.seek(0)
        dataframe = pd.read_excel(uploaded_file, engine="openpyxl", dtype=object)
    except (BadZipFile, OSError, ValueError, TypeError) as exc:
        raise FileProcessingError("El archivo Excel no se puede leer.") from exc

    columns = [str(column).strip() for column in dataframe.columns]
    if not columns or any(not column for column in columns):
        raise FileProcessingError("El archivo no contiene encabezados válidos.")
    if len(columns) != len(set(columns)):
        raise FileProcessingError("El archivo contiene encabezados duplicados.")

    column_samples = {}
    for col in columns:
        samples = []
        series = dataframe[col].dropna()
        for val in series:
            val_str = format_cell_preview(val)
            if val_str and val_str not in samples:
                samples.append(val_str)
            if len(samples) >= 3:
                break
        column_samples[col] = samples

    preview_rows = []
    for idx, (_, row) in enumerate(dataframe.head(15).iterrows()):
        row_dict = {}
        for col in columns:
            val = row.get(col)
            row_dict[col] = format_cell_preview(val)
        preview_rows.append({"fila": idx + 2, "data": row_dict})

    non_empty_rows_count = int((~dataframe.isna().all(axis=1)).sum())

    return {
        "filename": uploaded_file.name,
        "size_bytes": uploaded_file.size,
        "headers": columns,
        "file_summary": {
            "total_rows": len(dataframe),
            "non_empty_rows": non_empty_rows_count,
            "total_columns": len(columns),
        },
        "column_samples": column_samples,
        "preview_rows": preview_rows,
    }


def read_rows(uploaded_file):
    extension = _validate_file(uploaded_file, {".csv", ".xlsx"})
    try:
        uploaded_file.seek(0)
        return (
            pd.read_csv(uploaded_file, dtype=object)
            if extension == ".csv"
            else pd.read_excel(uploaded_file, engine="openpyxl", dtype=object)
        )
    except (BadZipFile, OSError, ValueError, TypeError, UnicodeDecodeError) as exc:
        raise FileProcessingError("El archivo no se puede leer.") from exc

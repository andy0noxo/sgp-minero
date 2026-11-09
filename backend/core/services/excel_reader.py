from datetime import date, datetime
import math
from pathlib import Path
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
        return val.isoformat(sep=" ")
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

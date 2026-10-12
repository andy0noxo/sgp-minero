from pathlib import Path
from zipfile import BadZipFile

import pandas as pd


class FileProcessingError(ValueError):
    pass


MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024


def _validate_file(uploaded_file, allowed_extensions):
    extension = Path(uploaded_file.name).suffix.lower()
    if extension not in allowed_extensions:
        raise FileProcessingError('Formato de archivo no permitido.')
    if uploaded_file.size > MAX_UPLOAD_SIZE_BYTES:
        raise FileProcessingError('El archivo supera el límite de 10 MB.')
    if uploaded_file.size == 0:
        raise FileProcessingError('El archivo está vacío.')
    return extension


def read_headers(uploaded_file):
    _validate_file(uploaded_file, {'.xlsx'})
    try:
        uploaded_file.seek(0)
        dataframe = pd.read_excel(uploaded_file, nrows=0, engine='openpyxl')
    except (BadZipFile, OSError, ValueError, TypeError) as exc:
        raise FileProcessingError('El archivo Excel no se puede leer.') from exc
    columns = [str(column).strip() for column in dataframe.columns]
    if not columns or any(not column for column in columns):
        raise FileProcessingError('El archivo no contiene encabezados válidos.')
    if len(columns) != len(set(columns)):
        raise FileProcessingError('El archivo contiene encabezados duplicados.')
    return columns


def read_rows(uploaded_file):
    extension = _validate_file(uploaded_file, {'.csv', '.xlsx'})
    try:
        uploaded_file.seek(0)
        return (
            pd.read_csv(uploaded_file)
            if extension == '.csv'
            else pd.read_excel(uploaded_file, engine='openpyxl')
        )
    except (BadZipFile, OSError, ValueError, TypeError, UnicodeDecodeError) as exc:
        raise FileProcessingError('El archivo no se puede leer.') from exc

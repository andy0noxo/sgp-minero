from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


class EncryptionConfigurationError(RuntimeError):
    pass


def _fernet():
    key = getattr(settings, 'AES_SECRET_KEY', '')
    if not key:
        raise EncryptionConfigurationError('AES_SECRET_KEY no está configurada.')
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except (TypeError, ValueError) as exc:
        raise EncryptionConfigurationError('AES_SECRET_KEY no es válida.') from exc


def encrypt_pii(value):
    if value is None:
        return None
    return _fernet().encrypt(str(value).encode()).decode()


def decrypt_pii(token):
    if token is None:
        return None
    try:
        return _fernet().decrypt(str(token).encode()).decode()
    except InvalidToken as exc:
        raise EncryptionConfigurationError('El token PII no es válido.') from exc

import unicodedata

from core.models import Maestro_Personas


def normalize_name(value):
    if value is None:
        return ''
    decomposed = unicodedata.normalize('NFKD', str(value))
    plain = ''.join(char for char in decomposed if not unicodedata.combining(char))
    return ' '.join(plain.casefold().split())


def find_matching_person(rut, name, queryset=None):
    people = queryset if queryset is not None else Maestro_Personas.objects
    person = people.filter(rut=rut).first()
    if person is None:
        return None, 'El RUT no existe en el maestro de personas.'
    if not person.estado_habilitacion:
        return None, 'La persona no está habilitada para viajar.'
    if normalize_name(person.nombre_completo) != normalize_name(name):
        return None, 'El nombre no coincide con el maestro de personas.'
    return person, None

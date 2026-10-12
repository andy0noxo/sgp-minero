from django.core.paginator import EmptyPage, Paginator

from core.models import RegistroViaje
from core.services.encryption import decrypt_pii


def _plain_payload(payload):
    data = dict(payload or {})
    if 'rut_cifrado' in data:
        data['rut'] = decrypt_pii(data.pop('rut_cifrado'))
    if 'nombre_cifrado' in data:
        data['nombre_completo'] = decrypt_pii(data.pop('nombre_cifrado'))
    return data


def get_dashboard_records(filters):
    records = RegistroViaje.objects.select_related('lote').all()
    start_date = filters.get('from')
    end_date = filters.get('to')
    cost_center = filters.get('centro_costo')

    if start_date:
        records = records.filter(fecha_procesamiento__date__gte=start_date)
    if end_date:
        records = records.filter(fecha_procesamiento__date__lte=end_date)
    if filters.get('estado'):
        records = records.filter(estado_validacion=filters['estado'])
    if cost_center:
        records = [
            record for record in records
            if cost_center.casefold() in str(record.payload_datos).casefold()
        ]

    page_number = filters.get('page', 1)
    page_size = min(filters.get('page_size', 25), 100)
    paginator = Paginator(records, page_size)
    try:
        page = paginator.page(page_number)
    except EmptyPage:
        page = paginator.page(paginator.num_pages or 1)

    return {
        'results': [
            {
                'id': str(record.id),
                'lote_id': str(record.lote_id),
                'fila_origen': record.fila_origen,
                'fecha_procesamiento': record.fecha_procesamiento.isoformat(),
                'estado_validacion': record.estado_validacion,
                'motivo_rechazo': record.motivo_rechazo,
                'datos': _plain_payload(record.payload_datos),
            }
            for record in page.object_list
        ],
        'pagination': {
            'page': page.number,
            'page_size': page.paginator.per_page,
            'total': paginator.count,
            'pages': paginator.num_pages,
        },
    }

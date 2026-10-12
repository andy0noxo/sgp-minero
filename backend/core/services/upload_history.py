from django.core.paginator import EmptyPage, Paginator

from core.models import LoteCarga


def _batch_summary(batch):
    return {
        'id': str(batch.id),
        'nombre_archivo_origen': batch.nombre_archivo_origen,
        'estado': batch.estado,
        'total_filas': batch.total_filas,
        'filas_procesadas': batch.filas_procesadas,
        'filas_rechazadas': batch.filas_rechazadas,
        'fecha_inicio': batch.fecha_inicio.isoformat(),
        'fecha_termino': (
            batch.fecha_termino.isoformat() if batch.fecha_termino else None
        ),
    }


def get_upload_history(user, page=1, page_size=25):
    batches = LoteCarga.objects.filter(cargador=user)
    paginator = Paginator(batches, min(page_size, 100))
    try:
        current_page = paginator.page(page)
    except EmptyPage:
        current_page = paginator.page(paginator.num_pages or 1)

    return {
        'results': [_batch_summary(batch) for batch in current_page.object_list],
        'pagination': {
            'page': current_page.number,
            'page_size': paginator.per_page,
            'total': paginator.count,
            'pages': paginator.num_pages,
        },
    }


def get_upload_detail(user, batch_id):
    batch = LoteCarga.objects.filter(cargador=user, id=batch_id).first()
    if batch is None:
        return None

    data = _batch_summary(batch)
    data['detalle_errores'] = batch.detalle_errores or []
    data['registros_aprobados'] = [
        {
            'id': str(record.id),
            'fila_origen': record.fila_origen,
            'fecha_procesamiento': record.fecha_procesamiento.isoformat(),
            'estado_validacion': record.estado_validacion,
        }
        for record in batch.registros.all()
    ]
    return data

from django.core.paginator import EmptyPage, Paginator
from django.db.models import Sum

from core.models import LoteCarga, RegistroAuditoria
from core.services.excel_reader import classify_flight_date

RESERVED_PAYLOAD_KEYS = {
    "rut_cifrado",
    "nombre_cifrado",
    "faena",
    "centro_costo",
    "estado_habilitacion",
    "fecha_vuelo",
    "tipo_fecha_vuelo",
    "origen",
    "destino",
    "aerolinea",
    "turno",
    "telefono_contacto",
    "anotaciones",
}


def _batch_summary(batch):
    total = batch.total_filas or 0
    procesadas = batch.filas_procesadas or 0
    rechazadas = batch.filas_rechazadas or 0
    tasa_aprobacion = round((procesadas / total) * 100, 1) if total > 0 else 0.0
    return {
        "id": str(batch.id),
        "nombre_archivo_origen": batch.nombre_archivo_origen,
        "estado": batch.estado,
        "total_filas": total,
        "filas_procesadas": procesadas,
        "filas_rechazadas": rechazadas,
        "tasa_aprobacion": tasa_aprobacion,
        "fecha_inicio": batch.fecha_inicio.isoformat(),
        "fecha_termino": (
            batch.fecha_termino.isoformat() if batch.fecha_termino else None
        ),
    }


def get_upload_history(user, page=1, page_size=25):
    batches = LoteCarga.objects.filter(cargador=user)
    aggregates = batches.aggregate(
        total_filas_historico=Sum("total_filas"),
        total_aprobadas_historico=Sum("filas_procesadas"),
        total_rechazadas_historico=Sum("filas_rechazadas"),
    )
    paginator = Paginator(batches, min(page_size, 100))
    try:
        current_page = paginator.page(page)
    except EmptyPage:
        current_page = paginator.page(paginator.num_pages or 1)

    return {
        "results": [_batch_summary(batch) for batch in current_page.object_list],
        "pagination": {
            "page": current_page.number,
            "page_size": paginator.per_page,
            "total": paginator.count,
            "pages": paginator.num_pages,
        },
        "summary_kpis": {
            "total_lotes": paginator.count,
            "total_filas_historico": aggregates["total_filas_historico"] or 0,
            "total_aprobadas_historico": aggregates["total_aprobadas_historico"] or 0,
            "total_rechazadas_historico": (
                aggregates["total_rechazadas_historico"] or 0
            ),
        },
    }


def _clean_display_val(val):
    if (
        isinstance(val, str)
        and len(val) == 19
        and (val.endswith(" 00:00:00") or val.endswith("T00:00:00"))
    ):
        return val[:10]
    if isinstance(val, float) and val.is_integer():
        return int(val)
    return val


def get_upload_detail(user, batch_id):
    batch = LoteCarga.objects.filter(cargador=user, id=batch_id).first()
    if batch is None:
        return None

    data = _batch_summary(batch)
    errors_list = batch.detalle_errores or []
    data["detalle_errores"] = errors_list

    approved_qs = list(batch.registros.all().order_by("fila_origen"))
    dynamic_cols = []
    seen_cols = set()
    sample_token = ""
    registros_aprobados = []

    for record in approved_qs:
        payload = record.payload_datos or {}
        rut_token = str(payload.get("rut_cifrado") or "")
        nombre_token = str(payload.get("nombre_cifrado") or "")
        if not sample_token and rut_token:
            sample_token = f"{rut_token[:12]}..."

        fecha_vuelo = payload.get("fecha_vuelo")
        tipo_fecha_vuelo = payload.get("tipo_fecha_vuelo")
        datos_dinamicos = {}
        for key, val in payload.items():
            if key not in RESERVED_PAYLOAD_KEYS:
                cleaned_val = _clean_display_val(val)
                if fecha_vuelo is None and key.strip().lower() in (
                    "fecha_vuelo",
                    "fecha vuelo",
                    "fecha_viaje",
                    "fecha viaje",
                    "fecha",
                ):
                    fecha_vuelo = cleaned_val
                datos_dinamicos[key] = cleaned_val
                if key not in seen_cols:
                    seen_cols.add(key)
                    dynamic_cols.append(key)

        cleaned_fecha = _clean_display_val(fecha_vuelo) or "—"
        if not tipo_fecha_vuelo and cleaned_fecha != "—":
            _, tipo_fecha_vuelo = classify_flight_date(cleaned_fecha)

        registros_aprobados.append(
            {
                "id": str(record.id),
                "fila_origen": record.fila_origen,
                "fecha_procesamiento": record.fecha_procesamiento.isoformat(),
                "estado_validacion": record.estado_validacion,
                "faena": payload.get("faena") or "Sin asignar",
                "centro_costo": payload.get("centro_costo") or "General",
                "estado_habilitacion": payload.get("estado_habilitacion")
                or "Habilitado",
                "fecha_vuelo": cleaned_fecha,
                "tipo_fecha_vuelo": tipo_fecha_vuelo or "No informada",
                "origen": _clean_display_val(payload.get("origen")) or "—",
                "destino": _clean_display_val(payload.get("destino")) or "—",
                "aerolinea": _clean_display_val(payload.get("aerolinea")) or "—",
                "turno": _clean_display_val(payload.get("turno")) or "—",
                "telefono_contacto": _clean_display_val(
                    payload.get("telefono_contacto")
                )
                or "—",
                "anotaciones": _clean_display_val(payload.get("anotaciones")) or "—",
                "rut_cifrado_preview": (
                    f"{rut_token[:14]}..." if rut_token else "gAAAAAB..."
                ),
                "nombre_cifrado_preview": (
                    f"{nombre_token[:14]}..." if nombre_token else "gAAAAAB..."
                ),
                "datos_dinamicos": datos_dinamicos,
            }
        )

    audit_event = (
        RegistroAuditoria.objects.filter(
            usuario=user,
            accion="PROCESAR_CARGA_VIAJES",
            metadata__lote_id=str(batch.id),
        )
        .order_by("-creado_en")
        .first()
    )
    stored_trace = (
        audit_event.metadata.get("pipeline_trace")
        if audit_event and isinstance(audit_event.metadata, dict)
        else None
    )
    if stored_trace:
        pipeline_trace = stored_trace
        if not dynamic_cols and stored_trace.get("columnas_dinamicas_jsonb"):
            dynamic_cols = list(stored_trace["columnas_dinamicas_jsonb"])
    else:
        vacias = sum(1 for e in errors_list if e.get("code") == "EMPTY_REQUIRED_VALUE")
        mal_rut = sum(1 for e in errors_list if e.get("code") == "INVALID_RUT")
        mal_maestro = sum(
            1
            for e in errors_list
            if e.get("code")
            in ("PERSON_NOT_FOUND", "PERSON_INACTIVE", "IDENTITY_MISMATCH")
        )
        pipeline_trace = {
            "filas_leidas_excel": batch.total_filas or 0,
            "filas_vacias_ignoradas": vacias,
            "aprobadas_modulo11": (batch.filas_procesadas or 0) + mal_maestro,
            "rechazadas_modulo11": mal_rut,
            "aprobadas_maestro_y_faena": batch.filas_procesadas or 0,
            "rechazadas_maestro": mal_maestro,
            "campos_pii_cifrados_fernet": (batch.filas_procesadas or 0) * 2,
            "columnas_dinamicas_jsonb": dynamic_cols,
            "ejemplo_token_cifrado": sample_token or "gAAAAAB...",
        }

    filas_tabla = []
    for item in registros_aprobados:
        filas_tabla.append(
            {
                "fila": item["fila_origen"],
                "estado_fila": "APROBADO",
                "faena": item["faena"],
                "centro_costo": item["centro_costo"],
                "estado_habilitacion": item["estado_habilitacion"],
                "fecha_vuelo": item["fecha_vuelo"],
                "tipo_fecha_vuelo": item["tipo_fecha_vuelo"],
                "origen": item["origen"],
                "destino": item["destino"],
                "aerolinea": item["aerolinea"],
                "turno": item["turno"],
                "telefono_contacto": item["telefono_contacto"],
                "anotaciones": item["anotaciones"],
                "rut_cifrado_preview": item["rut_cifrado_preview"],
                "nombre_cifrado_preview": item["nombre_cifrado_preview"],
                "datos_dinamicos": item["datos_dinamicos"],
                "code": "OK",
                "message": (
                    "Identidad validada en Maestro y PII cifrada con "
                    "Fernet AES-128 en JSONB."
                ),
            }
        )
    for err in errors_list:
        filas_tabla.append(
            {
                "fila": err.get("fila", 0),
                "estado_fila": "RECHAZADO",
                "faena": "—",
                "centro_costo": "—",
                "estado_habilitacion": (
                    "Inhabilitado" if err.get("code") == "PERSON_INACTIVE" else "—"
                ),
                "fecha_vuelo": "—",
                "tipo_fecha_vuelo": "—",
                "origen": "—",
                "destino": "—",
                "aerolinea": "—",
                "turno": "—",
                "telefono_contacto": "—",
                "anotaciones": "—",
                "rut_cifrado_preview": "No persistido",
                "nombre_cifrado_preview": "No persistido",
                "datos_dinamicos": {},
                "code": err.get("code", "ERROR"),
                "message": err.get("message", "Fila rechazada en validación."),
            }
        )
    filas_tabla.sort(
        key=lambda r: (
            r["fila"] or 0,
            0 if r["estado_fila"] == "APROBADO" else 1,
        )
    )

    data["registros_aprobados"] = registros_aprobados
    data["columnas_dinamicas"] = dynamic_cols
    data["pipeline_trace"] = pipeline_trace
    data["filas_tabla"] = filas_tabla
    return data

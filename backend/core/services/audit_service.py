import csv
import io
import uuid
from datetime import datetime, time
from django.core.paginator import Paginator
from django.db.models import Q
from django.utils import timezone

from core.models import RegistroAuditoria


def list_audit_logs(filters=None):
    filters = filters or {}
    queryset = (
        RegistroAuditoria.objects.select_related("usuario", "usuario__rol")
        .all()
        .order_by("-creado_en")
    )

    # Filtro de búsqueda
    search = (filters.get("search") or "").strip()
    if search:
        search_q = (
            Q(accion__icontains=search)
            | Q(modulo__icontains=search)
            | Q(usuario__email_corporativo__icontains=search)
            | Q(usuario__rut__icontains=search)
            | Q(metadata__ip__icontains=search)
            | Q(metadata__nombre_archivo__icontains=search)
        )
        try:
            uuid.UUID(search)
            search_q |= Q(id=search)
        except (ValueError, AttributeError):
            pass
        queryset = queryset.filter(search_q)

    # Filtro por módulo
    modulo = (filters.get("modulo") or filters.get("module") or "").strip()
    if modulo and modulo.casefold() not in {"all", "todos"}:
        norm = modulo.casefold()
        if "autentica" in norm:
            queryset = queryset.filter(modulo__iexact="AUTENTICACION")
        elif any(k in norm for k in ("carga", "nomina", "viaje", "ingesta")):
            queryset = queryset.filter(modulo__in=["INGESTA", "CARGA_VIAJES"])
        elif any(k in norm for k in ("maestro", "persona")):
            queryset = queryset.filter(modulo__iexact="MAESTRO_PERSONAS")
        elif "usuario" in norm:
            queryset = queryset.filter(modulo__iexact="USUARIOS")
        elif "auditoria" in norm:
            queryset = queryset.filter(modulo__iexact="AUDITORIA")
        else:
            queryset = queryset.filter(modulo__icontains=modulo)

    # Filtro por resultado / estado
    status_filter = (
        (filters.get("status") or filters.get("resultado") or "").strip().casefold()
    )
    if status_filter and status_filter not in {"all", "todos"}:
        if status_filter in {"success", "exito", "exitoso", "conforme"}:
            queryset = queryset.filter(resultado="EXITOSO")
        elif status_filter in {"danger", "critico", "fallido"}:
            queryset = queryset.filter(resultado="FALLIDO")
        elif status_filter in {"warning", "alerta"}:
            queryset = queryset.filter(
                Q(metadata__total_errores__gt=0) | Q(metadata__total_rechazados__gt=0)
            )

    # Filtro por rango de fechas
    from_date_str = filters.get("from") or filters.get("fecha_desde")
    if from_date_str:
        try:
            from_dt = datetime.strptime(str(from_date_str).strip(), "%Y-%m-%d")
            start_dt = timezone.make_aware(datetime.combine(from_dt.date(), time.min))
            queryset = queryset.filter(creado_en__gte=start_dt)
        except (ValueError, TypeError):
            pass

    to_date_str = filters.get("to") or filters.get("fecha_hasta")
    if to_date_str:
        try:
            to_dt = datetime.strptime(str(to_date_str).strip(), "%Y-%m-%d")
            end_dt = timezone.make_aware(datetime.combine(to_dt.date(), time.max))
            queryset = queryset.filter(creado_en__lte=end_dt)
        except (ValueError, TypeError):
            pass

    # Conteos globales para KPI cards
    all_events = RegistroAuditoria.objects.all()
    count_total = all_events.count()
    count_exitosas = all_events.filter(resultado="EXITOSO").count()
    count_fallidos = all_events.filter(resultado="FALLIDO").count()
    count_seguridad = all_events.filter(
        modulo="AUTENTICACION", resultado="FALLIDO"
    ).count()
    count_advertencias = all_events.filter(
        Q(metadata__total_errores__gt=0) | Q(metadata__total_rechazados__gt=0)
    ).count()

    # Paginación
    try:
        page = max(1, int(filters.get("page", 1)))
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = min(100, max(1, int(filters.get("page_size", 25))))
    except (ValueError, TypeError):
        page_size = 25

    paginator = Paginator(queryset, page_size)
    total_pages = paginator.num_pages
    current_page = paginator.get_page(page)

    return {
        "results": list(current_page.object_list),
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": paginator.count,
            "pages": total_pages,
        },
        "counts": {
            "total": count_total,
            "exitosas": count_exitosas,
            "fallidos": count_fallidos,
            "seguridad": count_seguridad,
            "advertencias": count_advertencias,
        },
    }


def build_audit_csv(events_data):
    """
    Genera un archivo CSV codificado con UTF-8 BOM (\ufeff) conteniendo
    los eventos de auditoría operativa sin exponer PII de pasajeros.
    """
    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)
    headers = [
        "ID Evento",
        "Fecha / Hora",
        "Usuario Responsable",
        "RUT",
        "IP Origen",
        "Módulo",
        "Acción",
        "Resultado",
        "Detalles Operativos",
        "Firma Criptográfica",
    ]
    writer.writerow(headers)

    for item in events_data:
        writer.writerow(
            [
                item.get("id"),
                item.get("timestamp"),
                item.get("user"),
                item.get("rut"),
                item.get("ip"),
                item.get("module"),
                item.get("action"),
                item.get("resultado"),
                item.get("details"),
                item.get("hash"),
            ]
        )
    return output.getvalue()

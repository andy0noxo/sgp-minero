import json
from datetime import date

from django.conf import settings
from django.db import OperationalError, connection
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from .models import RegistroViaje
from .authentication import LoginSerializer
from .permissions import IsAdministrador, IsCargador, IsConsultor
from .serializers import AuthUserSerializer
from .services.api_errors import UploadValidationError
from .services.excel_reader import FileProcessingError, read_headers
from .services.mapper import MapperValidationError
from .services.master_person_importer import MasterImportError, import_master_people
from .services.travel_processor import process_travel_file
from .services.dashboard import get_dashboard_records
from .services.upload_history import get_upload_detail, get_upload_history


class LoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        response = Response(
            {
                'data': {
                    'access': data['access'],
                    'user': data['user'],
                },
                'message': 'Autenticación exitosa.',
            },
            status=status.HTTP_200_OK,
        )
        response.set_cookie(
            settings.REFRESH_TOKEN_COOKIE_NAME,
            data['refresh'],
            httponly=True,
            secure=settings.REFRESH_TOKEN_COOKIE_SECURE,
            samesite=settings.REFRESH_TOKEN_COOKIE_SAMESITE,
            path=settings.REFRESH_TOKEN_COOKIE_PATH,
            max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
        )
        return response


class RefreshTokenView(TokenRefreshView):
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data={
            'refresh': request.COOKIES.get(settings.REFRESH_TOKEN_COOKIE_NAME),
        })
        serializer.is_valid(raise_exception=True)
        return Response(
            {'data': {'access': serializer.validated_data['access']}},
            status=status.HTTP_200_OK,
        )


class CurrentUserView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(
            {'data': AuthUserSerializer(request.user).data},
            status=status.HTTP_200_OK,
        )


class HealthView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        try:
            connection.ensure_connection()
        except OperationalError:
            return Response(
                {'status': 'unhealthy', 'database': 'unavailable'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            {'status': 'ok', 'database': 'ok'},
            status=status.HTTP_200_OK,
        )


class UploadHeadersView(APIView):
    permission_classes = (IsCargador,)

    def post(self, request):
        uploaded_file = request.FILES.get('file')
        if uploaded_file is None:
            raise UploadValidationError('INVALID_FILE', 'Debe enviar un archivo en el campo file.')
        try:
            headers = read_headers(uploaded_file)
        except FileProcessingError as exc:
            raise UploadValidationError('INVALID_FILE', str(exc)) from exc
        return Response(
            {'data': {'filename': uploaded_file.name, 'headers': headers}},
            status=status.HTTP_200_OK,
        )


class UploadProcessView(APIView):
    permission_classes = (IsCargador,)

    def post(self, request):
        uploaded_file = request.FILES.get('file')
        if uploaded_file is None:
            raise UploadValidationError('INVALID_FILE', 'Debe enviar un archivo en el campo file.')
        raw_mapping = request.data.get('mapping')
        if not raw_mapping:
            raise UploadValidationError('MISSING_MAPPER', 'Debe enviar el mapeo de columnas.')
        try:
            mapping = json.loads(raw_mapping) if isinstance(raw_mapping, str) else raw_mapping
            result = process_travel_file(uploaded_file, mapping, request.user)
        except (json.JSONDecodeError, FileProcessingError, MapperValidationError) as exc:
            raise UploadValidationError('INVALID_UPLOAD', str(exc)) from exc
        response_status = status.HTTP_207_MULTI_STATUS if result['total_errores'] else status.HTTP_200_OK
        return Response({'data': result}, status=response_status)


class UploadHistoryView(APIView):
    permission_classes = (IsCargador,)

    def get(self, request):
        try:
            page = max(int(request.query_params.get('page', 1)), 1)
            page_size = max(int(request.query_params.get('page_size', 25)), 1)
        except ValueError as exc:
            raise UploadValidationError(
                'INVALID_PAGINATION',
                'page y page_size deben ser números enteros.',
            ) from exc
        return Response(
            {'data': get_upload_history(request.user, page, page_size)},
            status=status.HTTP_200_OK,
        )


class UploadDetailView(APIView):
    permission_classes = (IsCargador,)

    def get(self, request, batch_id):
        data = get_upload_detail(request.user, batch_id)
        if data is None:
            raise NotFound('La carga solicitada no existe.')
        return Response({'data': data}, status=status.HTTP_200_OK)


class MasterPersonImportView(APIView):
    permission_classes = (IsAdministrador,)

    def post(self, request):
        uploaded_file = request.FILES.get('file')
        if uploaded_file is None:
            raise UploadValidationError(
                'INVALID_FILE',
                'Debe enviar un archivo en el campo file.',
            )
        try:
            result = import_master_people(uploaded_file, request.user)
        except (FileProcessingError, MasterImportError) as exc:
            raise UploadValidationError('INVALID_MASTER_FILE', str(exc)) from exc
        response_status = (
            status.HTTP_207_MULTI_STATUS
            if result['total_errores']
            else status.HTTP_200_OK
        )
        return Response({'data': result}, status=response_status)


class DashboardRecordsView(APIView):
    permission_classes = (IsConsultor,)

    def get(self, request):
        filters = {
            'from': request.query_params.get('from'),
            'to': request.query_params.get('to'),
            'centro_costo': request.query_params.get('centro_costo'),
            'estado': request.query_params.get('estado'),
        }
        try:
            filters['page'] = max(int(request.query_params.get('page', 1)), 1)
            filters['page_size'] = max(
                int(request.query_params.get('page_size', 25)), 1
            )
        except ValueError as exc:
            raise UploadValidationError(
                'INVALID_FILTER',
                'page y page_size deben ser números enteros.',
            ) from exc
        if filters['from'] and filters['to'] and filters['from'] > filters['to']:
            raise UploadValidationError(
                'INVALID_FILTER',
                'La fecha inicial no puede ser posterior a la fecha final.',
            )
        for key in ('from', 'to'):
            if filters[key]:
                try:
                    date.fromisoformat(filters[key])
                except ValueError as exc:
                    raise UploadValidationError(
                        'INVALID_FILTER',
                        f'{key} debe usar el formato YYYY-MM-DD.',
                    ) from exc
        if filters['estado'] and filters['estado'] not in {
            choice.value for choice in RegistroViaje.EstadoValidacion
        }:
            raise UploadValidationError(
                'INVALID_FILTER',
                'estado debe ser APROBADO o RECHAZADO.',
            )
        try:
            data = get_dashboard_records(filters)
        except ValueError as exc:
            raise UploadValidationError('INVALID_FILTER', str(exc)) from exc
        return Response({'data': data}, status=status.HTTP_200_OK)

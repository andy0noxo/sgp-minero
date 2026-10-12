from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return response

    payload = response.data
    detail = payload.get('detail') if isinstance(payload, dict) else None
    if isinstance(payload, dict) and 'code' in payload and 'message' in payload:
        code = payload['code']
        message = payload['message']
        details = payload.get('details')
    elif isinstance(detail, dict):
        code = detail.get('code', 'API_ERROR')
        message = detail.get('message', 'La solicitud no pudo ser procesada.')
        details = None
    else:
        code = 'VALIDATION_ERROR' if response.status_code == 400 else 'API_ERROR'
        message = detail or 'La solicitud no pudo ser procesada.'
        details = payload if response.status_code == 400 else None

    error = {'code': code, 'message': message}
    if details:
        error['details'] = details
    response.data = {'error': error}
    return response

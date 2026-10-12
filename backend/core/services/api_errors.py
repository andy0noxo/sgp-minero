from rest_framework.exceptions import APIException


class UploadValidationError(APIException):
    status_code = 400
    default_code = 'upload_validation_error'

    def __init__(self, code, message, details=None):
        self.detail = {'code': code, 'message': message}
        if details:
            self.detail['details'] = details

"""Application constant definitions."""

class HTTPStatus:
    OK = 200
    CREATED = 201
    ACCEPTED = 202
    NO_CONTENT = 204
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    CONFLICT = 409
    UNPROCESSABLE_ENTITY = 422
    INTERNAL_SERVER_ERROR = 500


class ResponseMessages:
    SUCCESS = "Operation completed successfully."
    INTERNAL_ERROR = "An internal server error occurred."
    NOT_FOUND = "Resource not found."
    UNAUTHORIZED = "Authentication required."
    FORBIDDEN = "Permission denied."

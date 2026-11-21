from fastapi import HTTPException, status
from typing import Optional, Any, Dict

class ReconXException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            status_code=status_code,
            detail={
                "code": code,
                "message": message,
                "details": details or {}
            }
        )

class AuthenticationError(ReconXException):
    def __init__(self, message: str = "Invalid credentials or unauthenticated"):
        super().__init__(status.HTTP_401_UNAUTHORIZED, "AUTHENTICATION_FAILED", message)

class PermissionDeniedError(ReconXException):
    def __init__(self, message: str = "Permission denied for this resource"):
        super().__init__(status.HTTP_403_FORBIDDEN, "PERMISSION_DENIED", message)

class NotFoundError(ReconXException):
    def __init__(self, message: str = "Requested resource not found"):
        super().__init__(status.HTTP_404_NOT_FOUND, "NOT_FOUND", message)

class ConflictError(ReconXException):
    def __init__(self, message: str = "Resource conflict"):
        super().__init__(status.HTTP_409_CONFLICT, "CONFLICT", message)

class PolicyViolationError(ReconXException):
    def __init__(self, code: str, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(status.HTTP_400_BAD_REQUEST, code, message, details)

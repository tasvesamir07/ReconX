import secrets
import hashlib
import hmac
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from datetime import datetime, timedelta, timezone

ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)

def hash_password(password: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    return ph.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    """Verifies a plaintext password against an Argon2id hash."""
    if not hashed:
        return False
    try:
        return ph.verify(hashed, password)
    except (VerifyMismatchError, InvalidHashError):
        return False

def generate_secure_token(nbytes: int = 32) -> str:
    """Generates a cryptographically secure hex token."""
    return secrets.token_hex(nbytes)

def hash_token(token: str) -> str:
    """Hashes an opaque token or OTP using SHA-256."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def generate_otp_code(digits: int = 6) -> str:
    """Generates a cryptographically secure numeric OTP."""
    # e.g., 6 digits between 100000 and 999999
    lower = 10 ** (digits - 1)
    upper = (10 ** digits) - 1
    return str(secrets.randbelow(upper - lower + 1) + lower)

def constant_time_compare(val1: str, val2: str) -> bool:
    """Compares two strings in constant time."""
    return hmac.compare_digest(val1.encode("utf-8"), val2.encode("utf-8"))

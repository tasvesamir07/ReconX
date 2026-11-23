"""
Secure file upload service for authorization documents.
Handles MIME validation, size limits, SHA-256 hashing, and secure storage.
"""
import hashlib
import logging
import os
import uuid
from pathlib import Path
from typing import BinaryIO, Tuple

from fastapi import HTTPException, UploadFile, status

from app.config import settings
from app.schemas.authorization import (
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    MAX_FILENAME_LENGTH,
)

logger = logging.getLogger("reconx.documents")


class DocumentService:
    """Secure document handling with validation and integrity verification."""

    @staticmethod
    def validate_file(file: UploadFile) -> Tuple[str, str]:
        """
        Validates uploaded file: MIME type, size, filename.
        Returns (detected_mime_type, safe_filename).
        """
        # Validate filename length
        if file.filename and len(file.filename) > MAX_FILENAME_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "FILENAME_TOO_LONG",
                    "message": f"Filename exceeds maximum length of {MAX_FILENAME_LENGTH} characters.",
                },
            )

        # Validate content type (from client - may be spoofed)
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_FILE_TYPE",
                    "message": f"File type '{file.content_type}' not allowed. Allowed types: {', '.join(sorted(ALLOWED_MIME_TYPES))}",
                },
            )

        # Read file content to validate size and compute hash
        content = file.file.read()
        file_size = len(content)

        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "EMPTY_FILE",
                    "message": "Uploaded file is empty.",
                },
            )

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "FILE_TOO_LARGE",
                    "message": f"File size {file_size} bytes exceeds maximum of {MAX_FILE_SIZE} bytes ({MAX_FILE_SIZE // (1024*1024)} MB).",
                },
            )

        # Detect actual MIME type from content (magic bytes)
        detected_mime = DocumentService._detect_mime_type(content)
        if detected_mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_FILE_CONTENT",
                    "message": f"File content type '{detected_mime}' does not match allowed types. File may be corrupted or mislabeled.",
                },
            )

        # Reset file pointer for later use
        file.file.seek(0)

        return detected_mime, file.filename or "unknown"

    @staticmethod
    def _detect_mime_type(content: bytes) -> str:
        """Detects MIME type from file magic bytes."""
        # PDF
        if content.startswith(b"%PDF"):
            return "application/pdf"
        # PNG
        if content.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        # JPEG
        if content.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        # GIF
        if content.startswith(b"GIF87a") or content.startswith(b"GIF89a"):
            return "image/gif"
        # WebP
        if content.startswith(b"RIFF") and b"WEBP" in content[:12]:
            return "image/webp"
        # Plain text (UTF-8)
        try:
            content[:1024].decode("utf-8")
            return "text/plain"
        except UnicodeDecodeError:
            pass
        # DOCX (ZIP-based)
        if content.startswith(b"PK\x03\x04") and b"word/" in content[:1024]:
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        # DOC (OLE)
        if content.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
            return "application/msword"

        return "application/octet-stream"

    @staticmethod
    def compute_sha256(file: BinaryIO) -> str:
        """Computes SHA-256 hash of file content."""
        hasher = hashlib.sha256()
        for chunk in iter(lambda: file.read(8192), b""):
            hasher.update(chunk)
        file.seek(0)
        return hasher.hexdigest()

    @staticmethod
    def generate_storage_path(authorization_request_id: uuid.UUID, original_filename: str) -> str:
        """Generates a secure, randomized storage path."""
        # Use UUID for directory and filename to prevent path traversal and enumeration
        dir_name = str(authorization_request_id)
        file_ext = Path(original_filename).suffix.lower()
        # Sanitize extension
        safe_ext = file_ext if file_ext in [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt", ".doc", ".docx"] else ""
        random_filename = f"{uuid.uuid4().hex}{safe_ext}"
        
        storage_dir = Path(settings.STORAGE_DIR) / "documents" / dir_name
        storage_dir.mkdir(parents=True, exist_ok=True)
        
        return str(storage_dir / random_filename)

    @staticmethod
    def save_file(file: UploadFile, storage_path: str) -> int:
        """Saves uploaded file to storage path. Returns file size."""
        file.file.seek(0)
        with open(storage_path, "wb") as f:
            content = file.file.read()
            f.write(content)
        return len(content)

    @staticmethod
    def delete_file(storage_path: str) -> bool:
        """Deletes file from storage. Returns True if deleted."""
        try:
            if os.path.exists(storage_path):
                os.remove(storage_path)
                # Clean up empty directories
                dir_path = Path(storage_path).parent
                try:
                    dir_path.rmdir()  # Only removes if empty
                except OSError:
                    pass
                return True
        except Exception as e:
            logger.warning(f"Failed to delete file {storage_path}: {e}")
        return False

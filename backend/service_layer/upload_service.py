from __future__ import annotations

import mimetypes
import secrets
from collections.abc import Awaitable, Callable
from pathlib import Path

from fastapi import HTTPException, Request, UploadFile

from config import Settings

ALLOWED_DOCUMENT_EXTENSIONS = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".csv": "text/csv",
}

ALLOWED_IMAGE_CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}

ALLOWED_VIDEO_CONTENT_TYPES = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    ".webm": "video/webm",
    ".m4v": "video/x-m4v",
    ".wmv": "video/x-ms-wmv",
    ".flv": "video/x-flv",
    ".ogv": "video/ogg",
    ".3gp": "video/3gpp",
}

RateLimitEnforcer = Callable[..., Awaitable[None]]


def detect_image_extension(content: bytes) -> str | None:
    if content.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if content.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return ".webp"
    return None


def detect_video_extension(content: bytes) -> str | None:
    # ISO Base Media (MP4/MOV/M4V) — ftyp box at offset 4
    if len(content) >= 12 and content[4:8] == b"ftyp":
        brand = content[8:12]
        return ".mov" if brand in (b"qt  ", b"moov") else ".mp4"
    # WebM / MKV — EBML header
    if content[:4] == b"\x1a\x45\xdf\xa3":
        return ".webm"
    # AVI — RIFF....AVI
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:11] == b"AVI":
        return ".avi"
    return None


def guess_document_extension(file: UploadFile) -> str | None:
    original_name = (file.filename or "").strip()
    suffix = Path(original_name).suffix.lower()
    if suffix in ALLOWED_DOCUMENT_EXTENSIONS:
        return suffix

    guessed_from_type = mimetypes.guess_extension(file.content_type or "")
    if guessed_from_type:
        normalized = guessed_from_type.lower()
        if normalized == ".jpeg":
            normalized = ".jpg"
        if normalized in ALLOWED_DOCUMENT_EXTENSIONS:
            return normalized

    return None


def guess_video_extension(file: UploadFile) -> str | None:
    original_name = (file.filename or "").strip()
    suffix = Path(original_name).suffix.lower()
    if suffix in ALLOWED_VIDEO_CONTENT_TYPES:
        return suffix

    guessed_from_type = mimetypes.guess_extension(file.content_type or "")
    if guessed_from_type and guessed_from_type.lower() in ALLOWED_VIDEO_CONTENT_TYPES:
        return guessed_from_type.lower()

    return None


def prepare_upload_target(
    cfg: Settings,
    *,
    category: str,
    filename: str,
) -> tuple[Path, str]:
    relative_dir = Path(category) / secrets.token_hex(2)
    target_dir = Path(cfg.upload_base_dir) / relative_dir
    target_dir.mkdir(parents=True, exist_ok=True)
    relative_url = f"/{relative_dir.as_posix()}/{filename}"
    return target_dir / filename, relative_url


async def save_uploaded_file(
    request: Request,
    *,
    file: UploadFile,
    allowed_kind: str,
    enforce_rate_limit_fn: RateLimitEnforcer,
) -> dict[str, str | int]:
    await enforce_rate_limit_fn(
        request,
        scope=f"{allowed_kind}-upload",
        limit=20,
        window_seconds=60,
    )

    cfg: Settings = request.app.state.settings
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > cfg.upload_max_file_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {cfg.upload_max_file_size_bytes} byte limit",
        )

    image_extension = detect_image_extension(content)
    video_extension = detect_video_extension(content)
    if allowed_kind == "images":
        if image_extension is None:
            raise HTTPException(
                status_code=400,
                detail="Only JPEG, PNG, GIF, and WebP images are allowed",
            )
        extension = image_extension
        category = "images"
        content_type = ALLOWED_IMAGE_CONTENT_TYPES[extension]
    else:
        extension = (
            image_extension
            or video_extension
            or guess_video_extension(file)
            or guess_document_extension(file)
        )
        if extension is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Allowed files: JPEG, PNG, GIF, WebP, MP4, MOV, AVI, MKV, WebM, "
                    "M4V, WMV, FLV, OGV, 3GP, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV"
                ),
            )
        if extension in ALLOWED_IMAGE_CONTENT_TYPES:
            category = "images"
        elif extension in ALLOWED_VIDEO_CONTENT_TYPES:
            category = "videos"
        else:
            category = "documents"
        content_type = (
            ALLOWED_IMAGE_CONTENT_TYPES.get(extension)
            or ALLOWED_VIDEO_CONTENT_TYPES.get(extension)
            or ALLOWED_DOCUMENT_EXTENSIONS.get(extension)
            or file.content_type
            or "application/octet-stream"
        )

    filename = f"{secrets.token_urlsafe(16).rstrip('=')}{extension}"
    target_path, relative_url = prepare_upload_target(cfg, category=category, filename=filename)
    target_path.write_bytes(content)

    return {
        "filename": filename,
        "content_type": content_type,
        "size": len(content),
        "url": f"{cfg.upload_public_base_url.rstrip('/')}{relative_url}",
        "path": relative_url,
    }

"""
QR Code generation service.
"""
import hashlib
import io
import base64
from typing import Optional

import qrcode
from qrcode.image.styledpil import StyledPilImage
from PIL import Image

from app.core.config import settings


def generate_package_qr(package_code: str, as_base64: bool = True) -> str:
    """
    Generate QR code for a package verification URL.
    Returns base64 PNG string by default.
    """
    url = f"{settings.NEXT_PUBLIC_APP_URL if hasattr(settings, 'NEXT_PUBLIC_APP_URL') else 'https://trustchain.app'}/verify/{package_code}"

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    if as_base64:
        return f"data:image/png;base64,{base64.b64encode(buffer.read()).decode()}"
    return buffer.read()


def generate_package_hash(package_code: str, batch_id: str, product_id: str) -> str:
    """Generate cryptographic hash of package identity."""
    payload = f"{package_code}:{batch_id}:{product_id}"
    return "0x" + hashlib.sha256(payload.encode()).hexdigest()


class NEXT_PUBLIC_APP_URL:
    pass

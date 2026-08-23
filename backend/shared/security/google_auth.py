"""Google Identity Services token verification utilities."""

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict

from backend.modules.authentication.exceptions import InvalidGoogleTokenException

logger = logging.getLogger(__name__)

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


def verify_google_token(token: str, expected_client_id: str) -> Dict[str, Any]:
    """Verify a Google OAuth ID Token (JWT) using Google's verification endpoint.

    Security checks enforced:
        1. Token validity and signature verified by Google Identity servers.
        2. Issuer (`iss`) must be `accounts.google.com` or `https://accounts.google.com`.
        3. Audience (`aud`) must match `expected_client_id`.
        4. Expiry (`exp`) timestamp verified (not expired).
        5. `email_verified` must be true.

    Args:
        token: Raw Google ID token string received from Google Identity Services.
        expected_client_id: Configured Google OAuth Web Client ID.

    Returns:
        Dictionary containing verified Google profile information:
            - sub: Google unique subject identifier string.
            - email: Normalized email address.
            - name: Full name (if provided).
            - picture: Profile picture URL (if provided).

    Raises:
        InvalidGoogleTokenException: If token is expired, signature fails, audience
                                     mismatches, or email is unverified.
    """
    if not token or not isinstance(token, str):
        raise InvalidGoogleTokenException("Missing or invalid Google token.")

    query_params = urllib.parse.urlencode({"id_token": token.strip()})
    url = f"{GOOGLE_TOKENINFO_URL}?{query_params}"

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "FoodBridge-Backend/1.0", "Accept": "application/json"},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            if response.status != 200:
                raise InvalidGoogleTokenException("Google token verification failed.")
            raw_body = response.read().decode("utf-8")
            data = json.loads(raw_body)

    except urllib.error.HTTPError as err:
        logger.warning("Google tokeninfo HTTP error: status=%s, reason=%s", err.code, err.reason)
        raise InvalidGoogleTokenException("Invalid, expired, or malformed Google token.")
    except urllib.error.URLError as err:
        logger.error("Network error communicating with Google tokeninfo: %s", err.reason)
        raise InvalidGoogleTokenException("Unable to contact Google Identity Services.")
    except Exception as err:
        logger.exception("Unexpected error verifying Google token: %s", err)
        raise InvalidGoogleTokenException("Failed to verify Google identity.")

    # 1. Validate Audience (aud)
    aud = data.get("aud")
    if expected_client_id and aud != expected_client_id:
        logger.warning(
            "Google token audience mismatch: received aud='%s', expected='%s'",
            aud,
            expected_client_id,
        )
        raise InvalidGoogleTokenException("Google token audience mismatch.")

    # 2. Validate Issuer (iss)
    iss = data.get("iss", "")
    if iss not in ("accounts.google.com", "https://accounts.google.com"):
        logger.warning("Invalid Google token issuer: '%s'", iss)
        raise InvalidGoogleTokenException("Invalid Google token issuer.")

    # 3. Validate Email and Email Verified
    email = data.get("email")
    if not email:
        raise InvalidGoogleTokenException("Google account has no associated email address.")

    email_verified = data.get("email_verified")
    # Google returns email_verified as string "true" or boolean True
    if str(email_verified).lower() != "true":
        logger.warning("Google account email is unverified: email='%s'", email)
        raise InvalidGoogleTokenException("Google account email address is not verified.")

    sub = data.get("sub")
    if not sub:
        raise InvalidGoogleTokenException("Google account has no subject identifier.")

    return {
        "sub": str(sub),
        "email": email.strip().lower(),
        "name": data.get("name", "").strip(),
        "picture": data.get("picture", ""),
    }

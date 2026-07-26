"""Reusable HTTP JSON response helpers for FoodBridge API."""

import math
from typing import Any, Dict, List, Optional
from flask import jsonify, Response


def success_response(
    data: Optional[Any] = None,
    message: str = "Operation successful",
    status_code: int = 200,
    headers: Optional[Dict[str, str]] = None,
) -> Response:
    """Build a standardized success JSON response.

    Format:
        {
            "success": true,
            "message": "...",
            "data": {}
        }
    """
    payload = {
        "success": True,
        "message": message,
        "data": data if data is not None else {},
    }
    response = jsonify(payload)
    response.status_code = status_code
    if headers:
        for key, value in headers.items():
            response.headers[key] = value
    return response


def error_response(
    message: str = "An error occurred",
    code: str = "ERROR",
    status_code: int = 400,
    details: Optional[Any] = None,
    headers: Optional[Dict[str, str]] = None,
) -> Response:
    """Build a standardized error JSON response.

    Format:
        {
            "success": false,
            "error": {
                "code": "...",
                "message": "...",
                "details": {}
            }
        }
    """
    payload = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details if details is not None else {},
        },
    }
    response = jsonify(payload)
    response.status_code = status_code
    if headers:
        for key, value in headers.items():
            response.headers[key] = value
    return response


def paginated_response(
    data: List[Any],
    page: int,
    per_page: int,
    total_items: int,
    message: str = "Operation successful",
    status_code: int = 200,
    headers: Optional[Dict[str, str]] = None,
) -> Response:
    """Build a standardized paginated JSON response.

    Format:
        {
            "success": true,
            "message": "...",
            "data": [...],
            "meta": { ... }
        }
    """
    total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0
    payload = {
        "success": True,
        "message": message,
        "data": data if data is not None else [],
        "meta": {
            "page": page,
            "per_page": per_page,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        },
    }
    response = jsonify(payload)
    response.status_code = status_code
    if headers:
        for key, value in headers.items():
            response.headers[key] = value
    return response

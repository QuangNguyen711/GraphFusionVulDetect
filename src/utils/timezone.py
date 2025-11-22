"""
Timezone utility module for handling timezone conversions consistently across the application.
This module provides functions to work with UTC and Vietnam timezone (UTC+7).
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

logger = logging.getLogger("GraphFusionVulDetect-Timezone")

# Define Vietnam timezone (UTC+7)
VIETNAM_TZ = timezone(timedelta(hours=7))
UTC_TZ = timezone.utc


def now_utc() -> datetime:
    """
    Get current datetime in UTC timezone.
    
    Returns:
        datetime: Current datetime in UTC
    """
    return datetime.now(UTC_TZ)


def now_vietnam() -> datetime:
    """
    Get current datetime in Vietnam timezone (UTC+7).
    
    Returns:
        datetime: Current datetime in Vietnam timezone
    """
    return datetime.now(VIETNAM_TZ)


def to_utc(dt: datetime) -> datetime:
    """
    Convert datetime to UTC timezone.
    
    Args:
        dt: datetime object (timezone-aware or naive)
        
    Returns:
        datetime: datetime in UTC timezone
    """
    if dt.tzinfo is None:
        # Assume naive datetime is in Vietnam timezone
        dt = dt.replace(tzinfo=VIETNAM_TZ)
    
    return dt.astimezone(UTC_TZ)


def to_vietnam(dt: Optional[datetime]) -> Optional[datetime]:
    """
    Convert datetime to Vietnam timezone (UTC+7).
    
    Args:
        dt: datetime object in any timezone (can be None)
        
    Returns:
        datetime: datetime in Vietnam timezone or None if input is None
    """
    if dt is None:
        return None
        
    if dt.tzinfo is None:
        # Assume naive datetime is in UTC
        dt = dt.replace(tzinfo=UTC_TZ)
    
    return dt.astimezone(VIETNAM_TZ)


def format_for_display(dt: Optional[datetime], format_str: str = "%d/%m/%Y %H:%M") -> str:
    """
    Format datetime for display in Vietnam timezone.
    
    Args:
        dt: datetime object (can be None)
        format_str: format string for strftime
        
    Returns:
        str: formatted datetime string in Vietnam timezone
    """
    if dt is None:
        return "Chưa cập nhật"
    
    try:
        vietnam_dt = to_vietnam(dt)
        if vietnam_dt is None:
            return "Không xác định"
        return vietnam_dt.strftime(format_str)
    except Exception as e:
        logger.warning(f"Error formatting datetime {dt}: {e}")
        return "Không xác định"


def ensure_utc_for_db(dt: Optional[datetime]) -> Optional[datetime]:
    """
    Ensure datetime is in UTC for database storage.
    
    Args:
        dt: datetime object (can be None)
        
    Returns:
        datetime: datetime in UTC or None if input is None
    """
    if dt is None:
        return None
    
    if dt.tzinfo is None:
        # Assume naive datetime is in Vietnam timezone and convert to UTC
        dt = dt.replace(tzinfo=VIETNAM_TZ)
    
    return to_utc(dt)


def parse_datetime_for_api(date_str: str, assume_vietnam: bool = True) -> datetime:
    """
    Parse datetime string for API input.
    
    Args:
        date_str: datetime string
        assume_vietnam: if True, assume naive datetime is in Vietnam timezone
        
    Returns:
        datetime: parsed datetime in UTC for storage
    """
    try:
        # Try parsing with timezone info first
        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return to_utc(dt)
        except ValueError:
            pass
        
        # Try parsing as naive datetime
        dt = datetime.fromisoformat(date_str)
        
        if assume_vietnam:
            # Assume it's in Vietnam timezone
            dt = dt.replace(tzinfo=VIETNAM_TZ)
        else:
            # Assume it's in UTC
            dt = dt.replace(tzinfo=UTC_TZ)
        
        return to_utc(dt)
    
    except Exception as e:
        logger.error(f"Error parsing datetime string '{date_str}': {e}")
        raise ValueError(f"Invalid datetime format: {date_str}")


# Constants for common format strings
DISPLAY_FORMAT_FULL = "%d/%m/%Y %H:%M:%S"
DISPLAY_FORMAT_SHORT = "%d/%m/%Y %H:%M"
DISPLAY_FORMAT_DATE_ONLY = "%d/%m/%Y"
DISPLAY_FORMAT_TIME_ONLY = "%H:%M"

API_FORMAT_ISO = "%Y-%m-%dT%H:%M:%S%z"

"""Enumerations for FoodBridge domain models, status lifecycles, and system states."""

import enum


class UserRole(str, enum.Enum):
    """User access control roles."""

    DONOR = "DONOR"
    NGO = "NGO"
    VOLUNTEER = "VOLUNTEER"
    ADMIN = "ADMIN"


class AccountStatus(str, enum.Enum):
    """User account operational states."""

    ACTIVE = "ACTIVE"
    PENDING = "PENDING"
    SUSPENDED = "SUSPENDED"
    INACTIVE = "INACTIVE"


class VerificationStatus(str, enum.Enum):
    """Profile verification states for Donors, NGOs, and Volunteers."""

    VERIFIED = "VERIFIED"
    PENDING = "PENDING"
    REJECTED = "REJECTED"


class OperationalStatus(str, enum.Enum):
    """Real-time availability status for volunteers."""

    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    OFFLINE = "OFFLINE"


class CapacityStatus(str, enum.Enum):
    """NGO daily operational capacity state."""

    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    FULL = "FULL"


class DayOfWeek(str, enum.Enum):
    """Days of the week for NGO daily capacity profiles."""

    MONDAY = "MONDAY"
    TUESDAY = "TUESDAY"
    WEDNESDAY = "WEDNESDAY"
    THURSDAY = "THURSDAY"
    FRIDAY = "FRIDAY"
    SATURDAY = "SATURDAY"
    SUNDAY = "SUNDAY"


class VehicleType(str, enum.Enum):
    """Transportation modes for volunteer logistics dispatch."""

    WALKING = "WALKING"
    BICYCLE = "BICYCLE"
    BIKE = "BIKE"
    SCOOTER = "SCOOTER"
    CAR = "CAR"
    VAN = "VAN"


class QuantityUnit(str, enum.Enum):
    """Measurement units for surplus food items."""

    KG = "KG"
    GRAM = "GRAM"
    LITRE = "LITRE"
    ML = "ML"
    BOX = "BOX"
    PACKET = "PACKET"
    PLATE = "PLATE"


class DeliveryPreference(str, enum.Enum):
    """Transportation delivery preference specified by food donor."""

    DONOR_DELIVERY = "DONOR_DELIVERY"
    PICKUP_REQUIRED = "PICKUP_REQUIRED"


class DonationStatus(str, enum.Enum):
    """Surplus food donation lifecycle states."""

    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    PENDING_NGO = "PENDING_NGO"
    NGO_ACCEPTED = "NGO_ACCEPTED"
    VOLUNTEER_PENDING = "VOLUNTEER_PENDING"
    PICKUP_IN_PROGRESS = "PICKUP_IN_PROGRESS"
    DELIVERED = "DELIVERED"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class ItemCategory(str, enum.Enum):
    """Food item category classifications."""

    RICE = "RICE"
    CURRY = "CURRY"
    BREAD = "BREAD"
    VEGETABLE = "VEGETABLE"
    FRUIT = "FRUIT"
    SNACK = "SNACK"
    BEVERAGE = "BEVERAGE"
    DESSERT = "DESSERT"
    OTHER = "OTHER"


class FoodType(str, enum.Enum):
    """Dietary classification for food items."""

    VEGETARIAN = "VEGETARIAN"
    NON_VEGETARIAN = "NON_VEGETARIAN"
    VEGAN = "VEGAN"


class ExecutionStatus(str, enum.Enum):
    """Technical execution outcome status for Decision Engine runs."""

    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    NO_CANDIDATES = "NO_CANDIDATES"
    TIMEOUT = "TIMEOUT"


class TriggerReason(str, enum.Enum):
    """Event trigger reasons for Decision Engine recommendation cycles."""

    NEW_DONATION = "NEW_DONATION"
    DONATION_UPDATED = "DONATION_UPDATED"
    MANUAL_RETRY = "MANUAL_RETRY"
    ADMIN_RETRY = "ADMIN_RETRY"


class RequestStatus(str, enum.Enum):
    """NGO recommendation request lifecycle states."""

    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    TIMED_OUT = "TIMED_OUT"
    AUTO_CANCELLED = "AUTO_CANCELLED"


class AssignmentStatus(str, enum.Enum):
    """Volunteer pickup/delivery assignment lifecycle states."""

    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    TIMED_OUT = "TIMED_OUT"
    AUTO_CANCELLED = "AUTO_CANCELLED"


class NotificationType(str, enum.Enum):
    """Platform notification event classifications."""

    DONATION_CREATED = "DONATION_CREATED"
    NGO_REQUEST = "NGO_REQUEST"
    VOLUNTEER_REQUEST = "VOLUNTEER_REQUEST"
    DONATION_ACCEPTED = "DONATION_ACCEPTED"
    DONATION_REJECTED = "DONATION_REJECTED"
    PICKUP_ASSIGNED = "PICKUP_ASSIGNED"
    DELIVERY_COMPLETED = "DELIVERY_COMPLETED"
    SYSTEM = "SYSTEM"


class DeliveryChannel(str, enum.Enum):
    """Notification dispatch channel modes."""

    IN_APP = "IN_APP"
    EMAIL = "EMAIL"
    SMS = "SMS"
    PUSH = "PUSH"

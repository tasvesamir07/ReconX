from enum import Enum

class PlatformRole(str, Enum):
    USER = "USER"
    MODERATOR = "MODERATOR"
    SUPER_ADMIN = "SUPER_ADMIN"
    DEVELOPER = "DEVELOPER"

class OrganizationRole(str, Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    ANALYST = "ANALYST"
    VIEWER = "VIEWER"

class ScanPreset(str, Enum):
    NORMAL = "normal"
    MODERATE = "moderate"
    ULTIMATE = "ultimate"

# Wall-clock budgets in seconds
PRESET_BUDGETS = {
    ScanPreset.NORMAL: 120,    # 2 minutes
    ScanPreset.MODERATE: 300,  # 5 minutes
    ScanPreset.ULTIMATE: 600,  # 10 minutes
}

# Concurrency limits per preset
PRESET_MAX_CONCURRENCY = {
    ScanPreset.NORMAL: 1,
    ScanPreset.MODERATE: 2,
    ScanPreset.ULTIMATE: 3,
}

# SSRF Prohibited CIDR blocks
PROHIBITED_IPV4_NETWORKS = [
    "0.0.0.0/8",       # "This" network
    "10.0.0.0/8",      # RFC 1918 Private
    "127.0.0.0/8",     # Loopback
    "169.254.0.0/16",  # Link Local / Cloud Metadata (169.254.169.254)
    "172.16.0.0/12",   # RFC 1918 Private
    "192.168.0.0/16",  # RFC 1918 Private
    "224.0.0.0/4",     # Multicast
    "240.0.0.0/4",     # Reserved / Future use
    "255.255.255.255/32" # Broadcast
]

PROHIBITED_IPV6_NETWORKS = [
    "::/128",          # Unspecified
    "::1/128",         # Loopback
    "fc00::/7",        # Unique Local Address (private)
    "fe80::/10",       # Link-Local Unicast
    "ff00::/8",        # Multicast
]

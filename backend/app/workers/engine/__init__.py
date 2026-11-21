"""
ReconX deterministic scan engine.

Standard-library only so the same code runs inside WSL Kali, a Docker
container, or a plain Python install. External tools (nmap, nuclei, dig,
openssl, whois) are used when present and reported as skipped when absent.
"""

ENGINE_VERSION = "4.0.0"

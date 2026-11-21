"""
Maps product names seen in banners / nmap output to NVD CPE identifiers.

Only products listed here are matched against NVD. An unknown product is
reported as inventory, never guessed at. Some products have more than one
NVD vendor (nginx moved from nginx:nginx to f5:nginx), so each entry is a list.
"""
import re
from typing import Dict, List, Optional, Tuple

CpeId = Tuple[str, str]  # (vendor, product)

# key: normalized product name -> (display name, [NVD (vendor, product)])
PRODUCTS: Dict[str, Tuple[str, List[CpeId]]] = {
    "apache_httpd": ("Apache HTTP Server", [("apache", "http_server")]),
    "nginx": ("nginx", [("f5", "nginx"), ("nginx", "nginx")]),
    "openssl": ("OpenSSL", [("openssl", "openssl")]),
    "php": ("PHP", [("php", "php")]),
    "iis": ("Microsoft IIS", [("microsoft", "internet_information_services")]),
    "openssh": ("OpenSSH", [("openbsd", "openssh")]),
    "tomcat": ("Apache Tomcat", [("apache", "tomcat")]),
    "lighttpd": ("lighttpd", [("lighttpd", "lighttpd")]),
    "litespeed": ("LiteSpeed Web Server", [("litespeedtech", "litespeed_web_server")]),
    "openresty": ("OpenResty", [("openresty", "openresty")]),
    "jetty": ("Eclipse Jetty", [("eclipse", "jetty")]),
    "caddy": ("Caddy", [("caddyserver", "caddy")]),
    "envoy": ("Envoy", [("envoyproxy", "envoy")]),
    "traefik": ("Traefik", [("traefik", "traefik")]),
    "haproxy": ("HAProxy", [("haproxy", "haproxy")]),
    "squid": ("Squid", [("squid-cache", "squid")]),
    "varnish": ("Varnish Cache", [("varnish-cache", "varnish_cache"), ("varnish-software", "varnish_cache")]),
    "werkzeug": ("Werkzeug", [("palletsprojects", "werkzeug")]),
    "gunicorn": ("Gunicorn", [("gunicorn", "gunicorn")]),
    "python": ("Python", [("python", "python")]),
    "wordpress": ("WordPress", [("wordpress", "wordpress")]),
    "drupal": ("Drupal", [("drupal", "drupal")]),
    "joomla": ("Joomla!", [("joomla", "joomla\\!")]),
    "exim": ("Exim", [("exim", "exim")]),
    "postfix": ("Postfix", [("postfix", "postfix")]),
    "vsftpd": ("vsftpd", [("beasts", "vsftpd")]),
    "proftpd": ("ProFTPD", [("proftpd", "proftpd")]),
    "pure_ftpd": ("Pure-FTPd", [("pureftpd", "pure-ftpd")]),
    "mysql": ("MySQL", [("oracle", "mysql")]),
    "mariadb": ("MariaDB", [("mariadb", "mariadb")]),
    "postgresql": ("PostgreSQL", [("postgresql", "postgresql")]),
    "redis": ("Redis", [("redis", "redis")]),
    "mongodb": ("MongoDB", [("mongodb", "mongodb")]),
    "elasticsearch": ("Elasticsearch", [("elastic", "elasticsearch")]),
    "dovecot": ("Dovecot", [("dovecot", "dovecot")]),
    "bind": ("ISC BIND", [("isc", "bind")]),
    "grafana": ("Grafana", [("grafana", "grafana")]),
    "jenkins": ("Jenkins", [("jenkins", "jenkins")]),
    "gitlab": ("GitLab", [("gitlab", "gitlab")]),
}

# Raw names (lowercase) as they appear in Server headers, generator tags and
# nmap product strings -> catalog key.
ALIASES: Dict[str, str] = {
    "apache": "apache_httpd",
    "apache httpd": "apache_httpd",
    "apache http server": "apache_httpd",
    "httpd": "apache_httpd",
    "nginx": "nginx",
    "openssl": "openssl",
    "php": "php",
    "microsoft-iis": "iis",
    "microsoft iis httpd": "iis",
    "iis": "iis",
    "openssh": "openssh",
    "apache tomcat": "tomcat",
    "tomcat": "tomcat",
    "apache-coyote": "tomcat",
    "lighttpd": "lighttpd",
    "litespeed": "litespeed",
    "openresty": "openresty",
    "jetty": "jetty",
    "caddy": "caddy",
    "envoy": "envoy",
    "traefik": "traefik",
    "haproxy": "haproxy",
    "squid": "squid",
    "varnish": "varnish",
    "werkzeug": "werkzeug",
    "gunicorn": "gunicorn",
    "python": "python",
    "cpython": "python",
    "wordpress": "wordpress",
    "drupal": "drupal",
    "joomla": "joomla",
    "joomla!": "joomla",
    "exim": "exim",
    "exim smtpd": "exim",
    "postfix": "postfix",
    "postfix smtpd": "postfix",
    "vsftpd": "vsftpd",
    "proftpd": "proftpd",
    "pure-ftpd": "pure_ftpd",
    "mysql": "mysql",
    "mariadb": "mariadb",
    "postgresql": "postgresql",
    "postgresql db": "postgresql",
    "redis": "redis",
    "redis key-value store": "redis",
    "mongodb": "mongodb",
    "elasticsearch": "elasticsearch",
    "elasticsearch rest api": "elasticsearch",
    "dovecot": "dovecot",
    "dovecot imapd": "dovecot",
    "dovecot pop3d": "dovecot",
    "isc bind": "bind",
    "bind": "bind",
    "grafana": "grafana",
    "jenkins": "jenkins",
    "gitlab": "gitlab",
}

# nmap reports some products under legacy CPE vendors.
CPE_VENDOR_ALIASES: Dict[CpeId, str] = {
    ("igor_sysoev", "nginx"): "nginx",
    ("nginx", "nginx"): "nginx",
    ("f5", "nginx"): "nginx",
    ("apache", "http_server"): "apache_httpd",
    ("openbsd", "openssh"): "openssh",
    ("php", "php"): "php",
    ("microsoft", "internet_information_services"): "iis",
    ("microsoft", "iis"): "iis",
    ("apache", "tomcat"): "tomcat",
    ("apache", "coyote_http_connector"): "tomcat",
    ("lighttpd", "lighttpd"): "lighttpd",
    ("openssl", "openssl"): "openssl",
    ("mysql", "mysql"): "mysql",
    ("oracle", "mysql"): "mysql",
    ("postgresql", "postgresql"): "postgresql",
    ("redis", "redis"): "redis",
    ("exim", "exim"): "exim",
    ("postfix", "postfix"): "postfix",
    ("beasts", "vsftpd"): "vsftpd",
    ("proftpd", "proftpd"): "proftpd",
}


def normalize_name(name: str) -> str:
    n = (name or "").strip().lower()
    n = re.sub(r"\s+", " ", n)
    return n


def lookup(name: str) -> Optional[str]:
    """Returns the catalog key for a raw product name, or None if unknown."""
    n = normalize_name(name)
    if n in ALIASES:
        return ALIASES[n]
    # Tolerate trailing qualifiers: "Apache httpd (Ubuntu)" -> "apache httpd"
    n2 = re.sub(r"\s*\(.*\)$", "", n).strip()
    return ALIASES.get(n2)


def lookup_cpe(cpe: str) -> Optional[str]:
    """Maps a CPE 2.2 (cpe:/a:vendor:product) or 2.3 string to a catalog key."""
    if not cpe:
        return None
    parts = cpe.replace("cpe:2.3:", "cpe:/").split(":")
    # cpe:/a:vendor:product[:version]
    if len(parts) < 4:
        return None
    vendor, product = parts[2].lower(), parts[3].lower()
    key = CPE_VENDOR_ALIASES.get((vendor, product))
    if key:
        return key
    for cat_key, (_, ids) in PRODUCTS.items():
        if (vendor, product) in ids:
            return cat_key
    return None


def nvd_ids(key: str) -> List[CpeId]:
    return PRODUCTS[key][1] if key in PRODUCTS else []


def display_name(key: str) -> str:
    return PRODUCTS[key][0] if key in PRODUCTS else key

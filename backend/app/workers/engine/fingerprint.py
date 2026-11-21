"""
Technology and version fingerprinting.

Every component carries the exact evidence line it was derived from. Nothing
is assumed: a product with no observed version is reported without one.
"""
import re
import xml.etree.ElementTree as ET
from collections import Counter
from typing import Dict, List, Optional, Tuple

DISTRO_MARKERS = ("ubuntu", "debian", "centos", "red hat", "rhel", "fedora", "amazon", "almalinux",
                  "rocky", "suse", "raspbian", "el7", "el8", "el9", "deb")

_VERSION_RE = re.compile(r"^v?(\d+(?:\.\d+){0,3}[a-z]?(?:[-.]?(?:rc|beta|alpha|b|a|p)\d*)?)", re.IGNORECASE)
_PRODUCT_TOKEN_RE = re.compile(r"([A-Za-z][A-Za-z0-9_\-\.!]*?)/(v?\d[\w\.\-+~]*)")

# Headers that name a product but are platforms, not software we can version.
_PLATFORM_SERVERS = {
    "cloudflare": "Cloudflare", "vercel": "Vercel", "akamaighost": "Akamai", "amazons3": "Amazon S3",
    "cloudfront": "Amazon CloudFront", "netlify": "Netlify", "google frontend": "Google Cloud",
    "gws": "Google", "github.com": "GitHub Pages", "awselb/2.0": "AWS Elastic Load Balancer",
}

CDN_HEADER_HINTS = [
    ("x-vercel-id", "Vercel"),
    ("cf-ray", "Cloudflare"),
    ("x-amz-cf-id", "Amazon CloudFront"),
    ("x-nf-request-id", "Netlify"),
    ("x-github-request-id", "GitHub Pages"),
    ("x-azure-ref", "Azure Front Door"),
    ("x-fastly-request-id", "Fastly"),
    ("x-akamai-transformed", "Akamai"),
]

CDNJS_TO_NPM = {
    "jquery": "jquery", "jqueryui": "jquery-ui", "jquery-ui": "jquery-ui", "jquery-migrate": "jquery-migrate",
    "lodash.js": "lodash", "lodash": "lodash", "twitter-bootstrap": "bootstrap", "bootstrap": "bootstrap",
    "angular.js": "angular", "angular": "angular", "moment.js": "moment", "moment": "moment", "vue": "vue",
    "react": "react", "react-dom": "react-dom", "underscore.js": "underscore", "underscore": "underscore",
    "backbone.js": "backbone", "handlebars.js": "handlebars", "handlebars": "handlebars", "knockout": "knockout",
    "dompurify": "dompurify", "axios": "axios", "Chart.js": "chart.js", "chart.js": "chart.js", "d3": "d3",
    "prism": "prismjs", "highlight.js": "highlight.js", "select2": "select2", "datatables": "datatables.net",
    "tinymce": "tinymce", "ckeditor": "ckeditor4", "summernote": "summernote", "swiper": "swiper",
    "popper.js": "popper.js", "jquery-validate": "jquery-validation", "jquery.form": "jquery-form",
}

LIB_URL_PATTERNS: List[Tuple[re.Pattern, str]] = [
    (re.compile(r"/ajax/libs/(?P<name>[A-Za-z0-9_.\-]+)/(?P<ver>\d+(?:\.\d+){1,3}(?:[-.](?:rc|beta|alpha)\.?\d*)?)/", re.I), "cdnjs"),
    (re.compile(r"/npm/(?P<name>@[a-z0-9_.\-]+/[a-z0-9_.\-]+|[a-z0-9_.\-]+)@(?P<ver>\d+(?:\.\d+){1,3}(?:-[\w.]+)?)", re.I), "jsdelivr"),
    (re.compile(r"unpkg\.com/(?P<name>@[a-z0-9_.\-]+/[a-z0-9_.\-]+|[a-z0-9_.\-]+)@(?P<ver>\d+(?:\.\d+){1,3}(?:-[\w.]+)?)", re.I), "unpkg"),
    (re.compile(r"code\.jquery\.com/(?P<name>jquery(?:-ui|-migrate)?)-(?P<ver>\d+\.\d+\.\d+)", re.I), "code.jquery.com"),
    (re.compile(r"/(?P<name>jquery(?:-ui|-migrate)?|bootstrap|lodash|moment|angular|vue|react|react-dom|handlebars|underscore|knockout|backbone|dompurify|axios)[.\-](?P<ver>\d+\.\d+\.\d+)(?:[.\-](?:min|slim|bundle|umd|production|development))*\.js", re.I), "filename"),
    (re.compile(r"/(?P<name>jquery|bootstrap)/(?P<ver>\d+\.\d+\.\d+)/", re.I), "path"),
    (re.compile(r"/(?P<name>jquery(?:-migrate)?)(?:\.min)?\.js\?ver=(?P<ver>\d+\.\d+\.\d+)", re.I), "query-ver"),
]

SCRIPT_BANNERS: List[Tuple[str, re.Pattern]] = [
    ("jquery", re.compile(r"jQuery (?:JavaScript Library )?v(\d+\.\d+\.\d+)")),
    ("jquery-ui", re.compile(r"jQuery UI - v(\d+\.\d+\.\d+)")),
    ("jquery-migrate", re.compile(r"jQuery Migrate - v(\d+\.\d+\.\d+)")),
    ("bootstrap", re.compile(r"Bootstrap v(\d+\.\d+\.\d+)")),
    ("angular", re.compile(r"AngularJS v(1\.\d+\.\d+)")),
    ("vue", re.compile(r"Vue\.js v(\d+\.\d+\.\d+)")),
    ("moment", re.compile(r"moment\.js\s*(?:\n\s*//!\s*)?version\s*:\s*(\d+\.\d+\.\d+)")),
    ("dompurify", re.compile(r"DOMPurify (\d+\.\d+\.\d+)")),
    ("axios", re.compile(r"[Aa]xios v(\d+\.\d+\.\d+)")),
    ("knockout", re.compile(r"Knockout JavaScript library v(\d+\.\d+\.\d+)")),
    ("underscore", re.compile(r"Underscore\.js (\d+\.\d+\.\d+)")),
    ("backbone", re.compile(r"Backbone\.js (\d+\.\d+\.\d+)")),
    ("chart.js", re.compile(r"Chart\.js v(\d+\.\d+\.\d+)")),
    ("handlebars", re.compile(r"@license handlebars v(\d+\.\d+\.\d+)")),
    ("tinymce", re.compile(r"TinyMCE version (\d+\.\d+\.\d+)")),
]

_GENERATOR_RE = [
    re.compile(r"<meta[^>]+name=[\"']generator[\"'][^>]*content=[\"']([^\"']+)[\"']", re.I),
    re.compile(r"<meta[^>]+content=[\"']([^\"']+)[\"'][^>]*name=[\"']generator[\"']", re.I),
]
_SCRIPT_SRC_RE = re.compile(r"<script[^>]+src=[\"']([^\"']+)[\"']", re.I)
_LINK_HREF_RE = re.compile(r"<link[^>]+href=[\"']([^\"']+)[\"']", re.I)
_NG_VERSION_RE = re.compile(r"ng-version=[\"'](\d+\.\d+\.\d+)[\"']")
_WP_CORE_VER_RE = re.compile(r"/wp-includes/(?:css/dist/block-library/style(?:\.min)?\.css|js/wp-emoji-release\.min\.js|css/dashicons(?:\.min)?\.css)\?ver=(\d+\.\d+(?:\.\d+)?)", re.I)

TECH_COOKIES = {
    "phpsessid": "PHP", "jsessionid": "Java Servlet", "laravel_session": "Laravel", "asp.net_sessionid": "ASP.NET",
    "connect.sid": "Express (Node.js)", "ci_session": "CodeIgniter", "cakephp": "CakePHP", "symfony": "Symfony",
    "wordpress_logged_in": "WordPress", "django_language": "Django", "_rails_session": "Ruby on Rails",
}

HTML_TECH_MARKERS = [
    ("/_next/static/", "Next.js"),
    ("__NUXT__", "Nuxt"),
    ("/wp-content/", "WordPress"),
    ("data-reactroot", "React"),
    ("__gatsby", "Gatsby"),
    ("/sites/default/files/", "Drupal"),
    ("cdn.shopify.com", "Shopify"),
    ("static.wixstatic.com", "Wix"),
    ("squarespace.com", "Squarespace"),
]


def clean_version(raw: Optional[str]) -> Tuple[Optional[str], bool]:
    """Returns (clean version, packaging_suffix_present).

    '2.4.49' -> ('2.4.49', False); '7.4.3-1ubuntu1' -> ('7.4.3', True); '1.1.1k' -> ('1.1.1k', False)
    """
    if not raw:
        return None, False
    raw = raw.strip()
    m = _VERSION_RE.match(raw)
    if not m:
        return None, False
    version = m.group(1)
    rest = raw[m.end():].lower()
    packaged = bool(rest) and (any(d in rest for d in DISTRO_MARKERS) or bool(re.match(r"^[-+~]\d", rest)))
    return version, packaged


def _component(name, version=None, source="", evidence="", location="", backport_risk=False,
               ecosystem=None, package=None, cpe=None, kind="software") -> Dict[str, object]:
    return {
        "name": name,
        "version": version,
        "source": source,
        "evidence": evidence[:300],
        "location": location,
        "backport_risk": backport_risk,
        "ecosystem": ecosystem,
        "package": package,
        "cpe": cpe,
        "kind": kind,  # software | platform | technology
    }


def parse_product_header(value: str, header: str, location: str = "") -> List[Dict[str, object]]:
    """Parses Server / X-Powered-By style headers into components."""
    components: List[Dict[str, object]] = []
    if not value:
        return components
    has_distro = any(d in value.lower() for d in DISTRO_MARKERS)
    tokens = _PRODUCT_TOKEN_RE.findall(value)
    for name, raw_ver in tokens:
        version, packaged = clean_version(raw_ver)
        components.append(_component(
            name=name, version=version, source=f"http.header.{header}",
            evidence=f"{header}: {value}", location=location, backport_risk=has_distro or packaged,
        ))
    if not tokens:
        bare = value.strip()
        platform = _PLATFORM_SERVERS.get(bare.lower())
        kind = "platform" if platform else "software"
        # "Apache" / "nginx" without a version: product known, version hidden
        components.append(_component(
            name=platform or bare.split(" ")[0], source=f"http.header.{header}",
            evidence=f"{header}: {value}", location=location, kind=kind,
        ))
    return components


def detect_cdn(headers: Dict[str, str]) -> Optional[str]:
    server = (headers.get("server") or "").lower()
    for key, name in _PLATFORM_SERVERS.items():
        if server == key or server.startswith(key):
            return name
    for header, name in CDN_HEADER_HINTS:
        if header in headers:
            return name
    return None


def parse_generator(html: str, location: str = "") -> List[Dict[str, object]]:
    out = []
    for rx in _GENERATOR_RE:
        for value in rx.findall(html or ""):
            m = re.match(r"^\s*(.+?)\s+v?(\d[\w.\-]*)", value)
            if m:
                version, packaged = clean_version(m.group(2))
                name = m.group(1).strip()
            else:
                name, version, packaged = value.split(" - ")[0].strip(), None, False
            out.append(_component(name=name, version=version, source="html.meta.generator",
                                  evidence=f'<meta name="generator" content="{value}">', location=location))
        if out:
            break
    return out


def parse_wordpress_core(html: str, location: str = "") -> List[Dict[str, object]]:
    versions = _WP_CORE_VER_RE.findall(html or "")
    if not versions:
        return []
    version, count = Counter(versions).most_common(1)[0]
    return [_component(name="WordPress", version=version, source="html.asset.ver",
                       evidence=f"{count} core asset(s) loaded with ?ver={version}", location=location)]


def library_from_url(url: str) -> Optional[Dict[str, object]]:
    for rx, how in LIB_URL_PATTERNS:
        m = rx.search(url)
        if not m:
            continue
        raw_name = m.group("name")
        if how == "cdnjs":
            package = CDNJS_TO_NPM.get(raw_name) or CDNJS_TO_NPM.get(raw_name.lower())
            if not package:
                return None
        else:
            package = raw_name.lower()
        version, _ = clean_version(m.group("ver"))
        if not version:
            return None
        return _component(name=package, version=version, source=f"script.url.{how}", evidence=url,
                          location=url, ecosystem="npm", package=package, kind="library")
    return None


def libraries_from_script(content: str, url: str) -> List[Dict[str, object]]:
    head = (content or "")[:6000]
    out = []
    for package, rx in SCRIPT_BANNERS:
        m = rx.search(head)
        if m:
            out.append(_component(name=package, version=m.group(1), source="script.banner",
                                  evidence=f"{url}: {m.group(0)[:120]}", location=url,
                                  ecosystem="npm", package=package, kind="library"))
    return out


def script_urls(html: str) -> List[str]:
    return _SCRIPT_SRC_RE.findall(html or "")


def stylesheet_urls(html: str) -> List[str]:
    return [h for h in _LINK_HREF_RE.findall(html or "") if ".css" in h.lower()]


def technologies(html: str, headers: Dict[str, str], cookies: List[str]) -> List[Dict[str, object]]:
    """Versionless technology hints (inventory only)."""
    seen = set()
    out = []

    def add(name, evidence, source):
        if name not in seen:
            seen.add(name)
            out.append(_component(name=name, source=source, evidence=evidence, kind="technology"))

    for marker, name in HTML_TECH_MARKERS:
        if marker in (html or ""):
            add(name, f"HTML contains '{marker}'", "html.marker")
    for cookie in cookies:
        cname = cookie.split("=", 1)[0].strip().lower()
        for prefix, name in TECH_COOKIES.items():
            if cname.startswith(prefix):
                add(name, f"Set-Cookie: {cookie.split('=', 1)[0]}", "http.cookie")
    m = _NG_VERSION_RE.search(html or "")
    if m:
        out.append(_component(name="@angular/core", version=m.group(1), source="html.ng-version",
                              evidence=m.group(0), ecosystem="npm", package="@angular/core", kind="library"))
    return out


def parse_nmap_xml(xml_text: str) -> Tuple[List[Dict[str, object]], List[Dict[str, object]]]:
    """Parses `nmap -sV -oX -` output. Returns (open_ports, components)."""
    ports: List[Dict[str, object]] = []
    components: List[Dict[str, object]] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return ports, components
    for port in root.iter("port"):
        state = port.find("state")
        if state is None or state.get("state") != "open":
            continue
        svc = port.find("service")
        portid = int(port.get("portid", "0"))
        proto = port.get("protocol", "tcp")
        info = {
            "port": portid,
            "protocol": proto,
            "service": svc.get("name") if svc is not None else "unknown",
            "product": svc.get("product") if svc is not None else None,
            "version": svc.get("version") if svc is not None else None,
            "extrainfo": svc.get("extrainfo") if svc is not None else None,
            "tunnel": svc.get("tunnel") if svc is not None else None,
            "cpes": [c.text for c in svc.findall("cpe")] if svc is not None else [],
        }
        ports.append(info)
        if svc is not None and info["product"]:
            version, packaged = clean_version(info["version"])
            extra = (info["extrainfo"] or "").lower()
            app_cpe = next((c for c in info["cpes"] if c and c.startswith("cpe:/a:")), None)
            evidence = f"{portid}/{proto} {info['service']} {info['product']} {info['version'] or ''} {info['extrainfo'] or ''}".strip()
            components.append(_component(
                name=info["product"], version=version, source="nmap.service", evidence=evidence,
                location=f"{portid}/{proto}", backport_risk=packaged or any(d in extra for d in DISTRO_MARKERS),
                cpe=app_cpe,
            ))
    return ports, components


def dedupe(components: List[Dict[str, object]]) -> List[Dict[str, object]]:
    """Keeps one component per (name/package, version), preferring versioned entries."""
    best: Dict[Tuple[str, str], Dict[str, object]] = {}
    for c in components:
        key = (str(c.get("package") or c.get("name") or "").lower(), str(c.get("version") or ""))
        if key not in best:
            best[key] = c
    versioned_names = {k[0] for k in best if k[1]}
    return [c for k, c in best.items() if k[1] or k[0] not in versioned_names]

"""
Scope-pinned HTTP client.

Every request is checked against the authorized host. Redirects are only
followed when they stay on that host; an off-host redirect is recorded but
never followed.
"""
import http.client
import socket
import ssl
import time
import urllib.parse
from typing import Dict, List, Optional, Tuple

USER_AGENT = "ReconX-Scanner/4.0 (authorized security assessment)"
DEFAULT_MAX_BODY = 512 * 1024


class ScopeError(Exception):
    pass


class Response:
    def __init__(self, url: str, method: str):
        self.url = url
        self.final_url = url
        self.method = method
        self.status: Optional[int] = None
        self.reason = ""
        self.headers: List[Tuple[str, str]] = []
        self.body: bytes = b""
        self.error: Optional[str] = None
        self.elapsed = 0.0
        self.redirect_chain: List[Tuple[int, str]] = []
        self.off_scope_redirect: Optional[str] = None

    def header(self, name: str) -> Optional[str]:
        n = name.lower()
        for k, v in self.headers:
            if k == n:
                return v
        return None

    def headers_all(self, name: str) -> List[str]:
        n = name.lower()
        return [v for k, v in self.headers if k == n]

    def header_map(self) -> Dict[str, str]:
        out: Dict[str, str] = {}
        for k, v in self.headers:
            out[k] = f"{out[k]}, {v}" if k in out and k != "set-cookie" else v
        return out

    @property
    def text(self) -> str:
        return self.body.decode("utf-8", errors="replace")

    @property
    def ok(self) -> bool:
        return self.status is not None

    def summary(self) -> Dict[str, object]:
        return {
            "url": self.final_url,
            "status": self.status,
            "length": len(self.body),
            "error": self.error,
        }


class HttpClient:
    def __init__(
        self,
        canonical_host: str,
        timeout: float = 8.0,
        max_body: int = DEFAULT_MAX_BODY,
        user_agent: str = USER_AGENT,
        min_interval: float = 0.05,
    ):
        self.host = canonical_host.lower().strip(".")
        self.timeout = timeout
        self.max_body = max_body
        self.user_agent = user_agent
        self.min_interval = min_interval
        self.request_count = 0
        self._last = 0.0
        self._ctx = ssl.create_default_context()
        self._ctx.check_hostname = False
        self._ctx.verify_mode = ssl.CERT_NONE  # certificate validity is assessed by the TLS check

    def in_scope(self, url: str) -> bool:
        try:
            parsed = urllib.parse.urlsplit(url)
        except ValueError:
            return False
        return parsed.scheme in ("http", "https") and (parsed.hostname or "").lower().strip(".") == self.host

    def request(
        self,
        url: str,
        method: str = "GET",
        headers: Optional[Dict[str, str]] = None,
        body: Optional[bytes] = None,
        follow_redirects: bool = False,
        max_redirects: int = 4,
        max_body: Optional[int] = None,
    ) -> Response:
        resp = Response(url, method)
        current = url
        start = time.monotonic()
        for _ in range(max_redirects + 1):
            if not self.in_scope(current):
                raise ScopeError(f"Refusing out-of-scope request: {current}")
            status, reason, hdrs, data, err = self._single(current, method, headers, body, max_body)
            resp.final_url = current
            resp.status, resp.reason, resp.headers, resp.body, resp.error = status, reason, hdrs, data, err
            if err or not follow_redirects or status not in (301, 302, 303, 307, 308):
                break
            location = resp.header("location")
            if not location:
                break
            nxt = urllib.parse.urljoin(current, location)
            resp.redirect_chain.append((status, nxt))
            if not self.in_scope(nxt):
                resp.off_scope_redirect = nxt
                break
            if status == 303:
                method, body = "GET", None
            current = nxt
        resp.elapsed = round(time.monotonic() - start, 3)
        return resp

    def get(self, url: str, **kw) -> Response:
        return self.request(url, "GET", **kw)

    def _single(self, url, method, headers, body, max_body):
        wait = self._last + self.min_interval - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        self._last = time.monotonic()
        self.request_count += 1

        parsed = urllib.parse.urlsplit(url)
        path = parsed.path or "/"
        if parsed.query:
            path += "?" + parsed.query
        port = parsed.port
        hdrs = {
            "User-Agent": self.user_agent,
            "Accept": "*/*",
            "Accept-Encoding": "identity",
            "Connection": "close",
        }
        if headers:
            hdrs.update(headers)
        try:
            if parsed.scheme == "https":
                conn = http.client.HTTPSConnection(parsed.hostname, port or 443, timeout=self.timeout, context=self._ctx)
            else:
                conn = http.client.HTTPConnection(parsed.hostname, port or 80, timeout=self.timeout)
            try:
                conn.request(method, path, body=body, headers=hdrs)
                r = conn.getresponse()
                limit = max_body if max_body is not None else self.max_body
                data = r.read(limit) if method != "HEAD" else b""
                raw_headers = [(k.lower(), v) for k, v in r.getheaders()]
                return r.status, r.reason, raw_headers, data, None
            finally:
                conn.close()
        except (socket.timeout, TimeoutError):
            return None, "", [], b"", "timeout"
        except (ssl.SSLError, ConnectionError, OSError, http.client.HTTPException) as exc:
            return None, "", [], b"", f"{type(exc).__name__}: {exc}"[:200]

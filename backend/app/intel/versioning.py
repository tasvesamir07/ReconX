"""
Version parsing and comparison used for CPE range matching.

Handles the formats seen in server banners and NVD data:
  2.4.49, 1.1.1k (OpenSSL letter releases), 3.0.0-rc1, 7.4.3, 1.18.0
"""
import re
from typing import List, Optional, Union

Token = Union[int, str]

_TOKEN_RE = re.compile(r"\d+|[a-z]+")
_PRE_RELEASE = ("dev", "snapshot", "alpha", "a", "beta", "b", "pre", "preview", "m", "milestone", "rc", "cr")


def tokenize(version: str) -> List[Token]:
    """Splits a version string into numeric and alphabetic tokens."""
    v = (version or "").strip().lower()
    if v.startswith("v") and len(v) > 1 and v[1].isdigit():
        v = v[1:]
    # Drop build metadata / distro packaging suffixes (1.2.3+build, 1:2.3~deb)
    v = re.split(r"[+~]", v, maxsplit=1)[0]
    if ":" in v:
        v = v.split(":", 1)[1]
    return [int(t) if t.isdigit() else t for t in _TOKEN_RE.findall(v)]


def specificity(version: str) -> int:
    """Number of numeric components (2.4 -> 2, 2.4.49 -> 3, 1.1.1k -> 3)."""
    return sum(1 for t in tokenize(version) if isinstance(t, int))


def _is_pre(tok: Token) -> bool:
    return isinstance(tok, str) and tok in _PRE_RELEASE


def compare(a: str, b: str) -> int:
    """
    Compares two versions. Returns -1 if a < b, 0 if equal, 1 if a > b.

    Rules:
    - numeric components compare numerically (2.4.5 < 2.4.49)
    - missing trailing zeros are equal (1.0 == 1.0.0)
    - pre-release markers sort before the release (3.0.0-rc1 < 3.0.0)
    - other letter suffixes sort after the release (1.1.1 < 1.1.1k < 1.1.1t)
    """
    ta, tb = tokenize(a), tokenize(b)
    for i in range(max(len(ta), len(tb))):
        x: Optional[Token] = ta[i] if i < len(ta) else None
        y: Optional[Token] = tb[i] if i < len(tb) else None
        if x == y:
            continue
        if x is None:
            if y == 0:
                continue
            return 1 if _is_pre(y) else -1
        if y is None:
            if x == 0:
                continue
            return -1 if _is_pre(x) else 1
        if isinstance(x, int) and isinstance(y, int):
            return -1 if x < y else 1
        if isinstance(x, str) and isinstance(y, str):
            if _is_pre(x) and _is_pre(y):
                xi, yi = _PRE_RELEASE.index(x), _PRE_RELEASE.index(y)
                if xi != yi:
                    return -1 if xi < yi else 1
                continue
            if _is_pre(x) != _is_pre(y):
                return -1 if _is_pre(x) else 1
            return -1 if x < y else 1
        # int vs str: a pre-release marker sorts before a number, other letters after
        if isinstance(x, str):
            return -1 if _is_pre(x) else 1
        return 1 if _is_pre(y) else -1
    return 0


def in_range(
    version: str,
    start_including: Optional[str] = None,
    start_excluding: Optional[str] = None,
    end_including: Optional[str] = None,
    end_excluding: Optional[str] = None,
) -> bool:
    """True when version falls inside the NVD-style range bounds."""
    if start_including and compare(version, start_including) < 0:
        return False
    if start_excluding and compare(version, start_excluding) <= 0:
        return False
    if end_including and compare(version, end_including) > 0:
        return False
    if end_excluding and compare(version, end_excluding) >= 0:
        return False
    return True


def is_comparable(version: Optional[str]) -> bool:
    """A version is usable for matching only if it has at least one numeric component."""
    return bool(version) and specificity(version) > 0

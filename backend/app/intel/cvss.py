"""
CVSS v3.0 / v3.1 base score calculator (FIRST specification).

Used for OSV advisories, which publish a vector string but no numeric score.
Temporal and environmental metrics in the vector are ignored.
"""
import math
from typing import Optional, Tuple

_WEIGHTS = {
    "AV": {"N": 0.85, "A": 0.62, "L": 0.55, "P": 0.2},
    "AC": {"L": 0.77, "H": 0.44},
    "UI": {"N": 0.85, "R": 0.62},
    "C": {"H": 0.56, "L": 0.22, "N": 0.0},
    "I": {"H": 0.56, "L": 0.22, "N": 0.0},
    "A": {"H": 0.56, "L": 0.22, "N": 0.0},
}
_PR_UNCHANGED = {"N": 0.85, "L": 0.62, "H": 0.27}
_PR_CHANGED = {"N": 0.85, "L": 0.68, "H": 0.5}
_REQUIRED = ("AV", "AC", "PR", "UI", "S", "C", "I", "A")


def _roundup(value: float) -> float:
    """CVSS v3.1 Roundup: smallest one-decimal number >= value (float-safe)."""
    int_input = int(round(value * 100000))
    if int_input % 10000 == 0:
        return int_input / 100000.0
    return (math.floor(int_input / 10000) + 1) / 10.0


def parse_vector(vector: str) -> Optional[dict]:
    if not vector or not vector.upper().startswith("CVSS:3"):
        return None
    metrics = {}
    for part in vector.split("/")[1:]:
        if ":" in part:
            k, v = part.split(":", 1)
            metrics[k.upper()] = v.upper()
    if not all(k in metrics for k in _REQUIRED):
        return None
    return metrics


def base_score(vector: str) -> Optional[float]:
    m = parse_vector(vector)
    if not m:
        return None
    try:
        changed = m["S"] == "C"
        iss = 1 - (1 - _WEIGHTS["C"][m["C"]]) * (1 - _WEIGHTS["I"][m["I"]]) * (1 - _WEIGHTS["A"][m["A"]])
        if changed:
            impact = 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15
        else:
            impact = 6.42 * iss
        pr = (_PR_CHANGED if changed else _PR_UNCHANGED)[m["PR"]]
        exploitability = 8.22 * _WEIGHTS["AV"][m["AV"]] * _WEIGHTS["AC"][m["AC"]] * pr * _WEIGHTS["UI"][m["UI"]]
    except KeyError:
        return None
    if impact <= 0:
        return 0.0
    if changed:
        return _roundup(min(1.08 * (impact + exploitability), 10))
    return _roundup(min(impact + exploitability, 10))


def severity_from_score(score: Optional[float]) -> str:
    if score is None:
        return "medium"
    if score >= 9.0:
        return "critical"
    if score >= 7.0:
        return "high"
    if score >= 4.0:
        return "medium"
    if score > 0.0:
        return "low"
    return "informational"


def describe_exploitability(vector: Optional[str]) -> str:
    """Plain-language exploitability sentence derived only from the vector."""
    m = parse_vector(vector or "")
    if not m:
        return ""
    where = {"N": "remotely over the network", "A": "from an adjacent network", "L": "with local access", "P": "with physical access"}[m["AV"]]
    auth = {"N": "without authentication", "L": "by a low-privileged user", "H": "by a highly privileged user"}[m["PR"]]
    ui = "and without user interaction" if m["UI"] == "N" else "but requires user interaction"
    effects = [name for key, name in (("C", "confidentiality"), ("I", "integrity"), ("A", "availability")) if m[key] == "H"]
    impact = f" High impact on {', '.join(effects)}." if effects else ""
    return f"Exploitable {where} {auth} {ui}.{impact}"


def best_nvd_metric(metrics: dict) -> Tuple[Optional[float], Optional[str], Optional[str]]:
    """Picks the most authoritative CVSS metric from an NVD 'metrics' object.
    Returns (score, vector, version)."""
    for key, version in (("cvssMetricV31", "3.1"), ("cvssMetricV30", "3.0"), ("cvssMetricV40", "4.0"), ("cvssMetricV2", "2.0")):
        entries = metrics.get(key) or []
        if not entries:
            continue
        primary = [e for e in entries if e.get("type") == "Primary"] or entries
        data = primary[0].get("cvssData", {})
        score = data.get("baseScore")
        if score is not None:
            return float(score), data.get("vectorString"), version
    return None, None, None

"""
Vulnerability intelligence: matches software versions detected during a scan
against public vulnerability databases.

Sources:
- NVD CVE API 2.0  (servers, frameworks, CMS)  -> CPE + version-range matching
- OSV.dev          (JavaScript / package ecosystems) -> exact version queries
- CISA KEV         (known exploited vulnerabilities) -> prioritisation flag
- FIRST EPSS       (exploit prediction scores) -> prioritisation score

Nothing in this package invents data: a CVE is only reported when a database
lists the detected product version as affected.
"""

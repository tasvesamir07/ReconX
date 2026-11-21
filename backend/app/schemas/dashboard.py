from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class SeverityDistribution(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    informational: int = 0


class TrendPoint(BaseModel):
    date: str
    total: int
    completed: int
    failed: int


class AttentionFinding(BaseModel):
    id: UUID
    scan_id: UUID
    target_url: str
    title: str
    severity: str
    confidence: str
    affected_asset: str
    created_at: datetime


class RecentScan(BaseModel):
    id: UUID
    target_url: str
    preset: str
    status: str
    budget_seconds_snapshot: int
    created_at: datetime
    finished_at: Optional[datetime] = None
    finding_count: int = 0


class PostureSummary(BaseModel):
    score: Optional[int] = None
    label: str
    scan_id: Optional[UUID] = None
    scan_date: Optional[datetime] = None
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class DashboardSummary(BaseModel):
    organization_id: Optional[UUID] = None
    organization_name: Optional[str] = None
    active_scans: int
    completed_scans: int
    total_scans: int
    approved_assets: int
    pending_authorizations: int
    total_findings: int
    severity_distribution: SeverityDistribution
    scan_trend: List[TrendPoint]
    posture: PostureSummary
    needs_attention: List[AttentionFinding]
    recent_scans: List[RecentScan]
    generated_at: datetime


class PolicySimulationRequest(BaseModel):
    target_url: str
    organization_id: Optional[UUID] = None


class PolicyCheck(BaseModel):
    id: str
    label: str
    status: str  # pass | fail | warn | skip
    detail: str


class PolicySimulationResponse(BaseModel):
    allowed: bool
    target_url: str
    canonical_host: Optional[str] = None
    resolved_ip: Optional[str] = None
    matched_asset_id: Optional[UUID] = None
    authorization_id: Optional[UUID] = None
    organization_id: Optional[UUID] = None
    scope_type: Optional[str] = None
    expires_at: Optional[datetime] = None
    checks: List[PolicyCheck]
    error_code: Optional[str] = None
    error_message: Optional[str] = None

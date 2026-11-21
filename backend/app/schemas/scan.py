from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class ScanCreateRequest(BaseModel):
    organization_id: Optional[UUID] = None
    approved_asset_id: UUID
    target_url: str
    preset: str = Field("normal", pattern="^(normal|moderate|ultimate)$")


class ScanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: Optional[UUID] = None
    requested_by: UUID
    approved_asset_id: UUID
    target_url: str
    resolved_ip: Optional[str] = None
    preset: str
    status: str
    budget_seconds_snapshot: int
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    finding_count: int = 0
    has_report: bool = False


class ScanEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    scan_id: UUID
    sequence_number: int
    event_type: str
    severity: str
    message: str
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime


class CheckRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    scan_id: UUID
    capability_id: str
    status: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    exit_code: Optional[int] = None
    output_summary: Optional[str] = None
    created_at: datetime


class FindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    scan_id: UUID
    finding_key: str
    title: str
    category: str
    severity: str
    confidence: str
    status: str
    affected_asset: str
    description: str
    impact: str
    remediation: str
    references: Optional[List[str]] = None
    evidence_ids: Optional[List[str]] = None
    created_at: datetime


class EvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    scan_id: UUID
    check_run_id: Optional[UUID] = None
    evidence_type: str
    normalized_data: Dict[str, Any]
    source: str
    confidence: float
    content_hash: str
    observed_at: datetime


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    scan_id: UUID
    status: str
    format: str
    storage_path: Optional[str] = None
    generated_at: datetime

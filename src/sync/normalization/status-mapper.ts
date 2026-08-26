import { CanonicalStatusCode } from "@/connectors/core/connector-types";

const DEFAULT_STATUS_MAP: Record<string, CanonicalStatusCode> = {
  "new": "NEW",
  "created": "NEW",
  "unassigned": "NEW",
  "received": "NEW",
  "open": "NEW",
  
  "assigned": "ASSIGNED",
  "dispatched": "ASSIGNED",
  "accepted": "ASSIGNED",
  "scheduled": "ASSIGNED",
  
  "in progress": "IN_PROGRESS",
  "in-progress": "IN_PROGRESS",
  "in_progress": "IN_PROGRESS",
  "active": "IN_PROGRESS",
  "started": "IN_PROGRESS",
  "working": "IN_PROGRESS",

  "field complete": "FIELD_COMPLETE",
  "field-complete": "FIELD_COMPLETE",
  "field_complete": "FIELD_COMPLETE",
  "completed": "FIELD_COMPLETE",
  "complete": "FIELD_COMPLETE",
  "done": "FIELD_COMPLETE",
  "work completed": "FIELD_COMPLETE",

  "qc review": "QC_REVIEW",
  "qc": "QC_REVIEW",
  "quality control": "QC_REVIEW",
  "under review": "QC_REVIEW",
  "review": "QC_REVIEW",

  "pending review": "PENDING_REVIEW",
  "pending client": "PENDING_REVIEW",
  "submitted": "PENDING_REVIEW",

  "ready for client": "READY_FOR_CLIENT",
  "ready_for_client": "READY_FOR_CLIENT",
  "ready-for-client": "READY_FOR_CLIENT",

  "sent to client": "SENT_TO_CLIENT",
  "sent_to_client": "SENT_TO_CLIENT",
  "sent-to-client": "SENT_TO_CLIENT",
  "submitted to client": "SENT_TO_CLIENT",
  "client submitted": "SENT_TO_CLIENT",
  "client submission": "SENT_TO_CLIENT",

  "revisions needed": "REVISIONS_NEEDED",
  "revisions": "REVISIONS_NEEDED",
  "rejected": "REVISIONS_NEEDED",
  "rejected by client": "REVISIONS_NEEDED",
  "re-open": "REVISIONS_NEEDED",
  "reopened": "REVISIONS_NEEDED",

  "office complete": "OFFICE_COMPLETE",
  "ready for billing": "OFFICE_COMPLETE",
  "invoiced": "OFFICE_COMPLETE",
  "approved": "OFFICE_COMPLETE",

  "closed": "CLOSED",
  "paid": "CLOSED",
  "archived": "CLOSED",

  "cancelled": "CANCELLED",
  "canceled": "CANCELLED",
  "void": "CANCELLED",
  "deleted": "CANCELLED",

  "on hold": "ON_HOLD",
  "hold": "ON_HOLD",
  "paused": "ON_HOLD",
};

export class StatusMapper {
  private customMappings: Map<string, CanonicalStatusCode> = new Map();

  constructor(customRules?: Array<{ externalStatus: string; internalStatus: CanonicalStatusCode }>) {
    if (customRules) {
      for (const rule of customRules) {
        this.customMappings.set(rule.externalStatus.trim().toLowerCase(), rule.internalStatus);
      }
    }
  }

  public mapStatus(externalStatus?: string): CanonicalStatusCode {
    if (!externalStatus || !externalStatus.trim()) {
      return "NEW";
    }

    const clean = externalStatus.trim().toLowerCase();

    // 1. Check custom DB mapping
    if (this.customMappings.has(clean)) {
      return this.customMappings.get(clean)!;
    }

    // 2. Default standard mapping
    if (DEFAULT_STATUS_MAP[clean]) {
      return DEFAULT_STATUS_MAP[clean];
    }

    // 3. Partial substring matching
    for (const [key, val] of Object.entries(DEFAULT_STATUS_MAP)) {
      if (clean.includes(key)) return val;
    }

    return "NEW";
  }
}

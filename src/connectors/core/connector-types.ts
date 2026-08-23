/**
 * Canonical property preservation service codes.
 */
export type CanonicalServiceCode =
  | "GRASS_CUT"
  | "DEBRIS_REMOVAL"
  | "WINTERIZATION"
  | "BOARD_UP"
  | "INSPECTION"
  | "LOCK_CHANGE"
  | "ROOF_TARP"
  | "MOLD_REMEDIATION"
  | "POOL_MAINTENANCE"
  | "TREE_TRIMMING"
  | "PRESSURE_WASH"
  | "SNOW_REMOVAL"
  | "JANITORIAL"
  | "PLUMBING_REPAIR"
  | "ELECTRIC_REPAIR"
  | "HVAC_SERVICE"
  | "GENERAL_REPAIRS"
  | "RECONVEYANCE"
  | "BID_SUBMISSION"
  | "OTHER";

/**
 * Standardized status codes for work orders.
 */
export type CanonicalStatusCode =
  | "NEW"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "FIELD_COMPLETE"
  | "QC_REVIEW"
  | "PENDING_REVIEW"
  | "REVISIONS_NEEDED"
  | "OFFICE_COMPLETE"
  | "CLOSED"
  | "CANCELLED"
  | "ON_HOLD";

export interface ServiceItem {
  id?: string;
  serviceCode: CanonicalServiceCode;
  externalCode?: string;
  name: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  approvedPrice?: number;
  instructions?: string;
  completed?: boolean;
  requiredPhotos?: string[];
}

export interface ContactInfo {
  name: string;
  role: "CLIENT" | "COORDINATOR" | "CONTRACTOR" | "BROKER" | "PROPERTY_MANAGER" | "OCCUPANT" | "OTHER";
  email?: string;
  phone?: string;
  notes?: string;
}

export interface ConnectorDocument {
  id?: string;
  externalDocumentId: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  url?: string;
  dataBase64?: string;
  sizeBytes?: number;
  documentType: "WORK_ORDER_PDF" | "BID_SHEET" | "INVOICE" | "INSPECTION_FORM" | "PCR" | "OTHER";
  retrievedAt: string;
}

export interface ConnectorPhoto {
  id?: string;
  externalPhotoId: string;
  fileName: string;
  url?: string;
  dataBase64?: string;
  caption?: string;
  photoType: "BEFORE" | "DURING" | "AFTER" | "BID" | "DOCUMENT" | "HAZARD" | "GENERAL";
  takenAt?: string;
  latitude?: number;
  longitude?: number;
}

export interface SyncCursor {
  lastSyncAt?: string;
  lastExternalId?: string;
  page?: number;
  token?: string;
  custom?: Record<string, any>;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  expiresAt?: string;
  actionRequired?: boolean;
  actionDetails?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  statusCode?: number;
  latencyMs?: number;
  message: string;
  capabilitiesConfirmed: string[];
  diagnostics?: Record<string, any>;
}

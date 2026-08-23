export * from "./connector-types";
import {
  AuthResult,
  ConnectionTestResult,
  ConnectorDocument,
  ConnectorPhoto,
  ContactInfo,
  ServiceItem,
  SyncCursor,
} from "./connector-types";

export type ConnectorCapabilities = {
  importOrders: boolean;
  importUpdates: boolean;
  importDocuments: boolean;
  importPhotos: boolean;

  exportStatus: boolean;
  submitOrders: boolean;
  uploadDocuments: boolean;
  uploadPhotos: boolean;

  bids: boolean;
  invoices: boolean;
  messaging: boolean;

  webhook: boolean;
  polling: boolean;

  api: boolean;
  browserAutomation: boolean;
  fileImport: boolean;
  emailImport: boolean;
};

export type ConnectorMetadata = {
  key: string;
  name: string;
  version: string;
  vendor: string;
  description?: string;
  icon?: string;

  authenticationType:
    | "oauth2"
    | "api_key"
    | "username_password"
    | "token"
    | "file"
    | "email"
    | "manual"
    | "mock";

  capabilities: ConnectorCapabilities;
  requiresAuthorization: boolean;
  documentationUrl?: string;
};

export interface NormalizedWorkOrder {
  clientId: string;
  clientName?: string;
  externalWorkOrderId: string;
  externalReference?: string;
  externalStatus?: string;
  externalCreatedAt?: string;
  externalUpdatedAt?: string;

  property: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    county?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    lotSize?: string;
    lawnSize?: string;
    lockCode?: string;
    lockboxLocation?: string;
    gateCode?: string;
    keyCode?: string;
    keycodeLocation?: string;
    occupancyStatus?: string;
  };

  assignment: {
    assignedAt?: string;
    dueAt?: string;
    completionDeadline?: string;
    priority?: number | string;
    category?: string;
  };

  services: ServiceItem[];
  instructions?: string;
  status: string;

  financials?: {
    bidAmount?: number;
    approvedAmount?: number;
    invoiceAmount?: number;
    maxAllowance?: number;
  };

  contacts?: ContactInfo[];
  documents?: ConnectorDocument[];
  photos?: ConnectorPhoto[];

  rawPayload?: any;
  payloadChecksum?: string;
  metadata?: Record<string, any>;
}

export interface ConnectorWorkOrderResult {
  orders: NormalizedWorkOrder[];
  nextCursor?: SyncCursor;
  hasMore: boolean;
  recordsFetched: number;
}

export interface SubmissionRequirements {
  requiresBeforePhotos: boolean;
  requiresDuringPhotos: boolean;
  requiresAfterPhotos: boolean;
  minPhotosPerService?: Record<string, number>;
  requiresInvoice: boolean;
  requiresPCRForm: boolean;
  requiresSignature: boolean;
  requiresGpsCoords: boolean;
  allowedPhotoMimeTypes: string[];
}

export interface SubmissionPayload {
  workOrderId: string;
  externalWorkOrderId: string;
  completionDate: string;
  notes?: string;
  lineItems: {
    serviceCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  invoiceAmount?: number;
  photos: {
    id: string;
    url?: string;
    dataBase64?: string;
    caption?: string;
    photoType: "BEFORE" | "DURING" | "AFTER" | "BID" | "DOCUMENT";
    takenAt?: string;
    latitude?: number;
    longitude?: number;
  }[];
  documents: {
    id: string;
    fileName: string;
    url?: string;
    dataBase64?: string;
    documentType: string;
  }[];
  metadata?: Record<string, any>;
}

export interface SubmissionResult {
  success: boolean;
  externalSubmissionId?: string;
  externalStatus?: string;
  message?: string;
  submittedAt: string;
  warnings?: string[];
  rawResponse?: any;
}

export interface UploadResult {
  success: boolean;
  externalFileId?: string;
  url?: string;
  message?: string;
}

export interface WorkOrderConnector {
  getMetadata(): ConnectorMetadata;

  authenticate(credentials?: Record<string, any>): Promise<AuthResult>;

  testConnection(credentials?: Record<string, any>): Promise<ConnectionTestResult>;

  fetchNewWorkOrders(
    cursor?: SyncCursor,
    credentials?: Record<string, any>
  ): Promise<ConnectorWorkOrderResult>;

  fetchUpdatedWorkOrders(
    cursor?: SyncCursor,
    credentials?: Record<string, any>
  ): Promise<ConnectorWorkOrderResult>;

  fetchWorkOrder(
    externalWorkOrderId: string,
    credentials?: Record<string, any>
  ): Promise<NormalizedWorkOrder | null>;

  fetchDocuments(
    externalWorkOrderId: string,
    credentials?: Record<string, any>
  ): Promise<ConnectorDocument[]>;

  fetchPhotos(
    externalWorkOrderId: string,
    credentials?: Record<string, any>
  ): Promise<ConnectorPhoto[]>;

  getSubmissionRequirements(
    externalWorkOrderId?: string
  ): Promise<SubmissionRequirements>;

  submitWorkOrder(
    externalWorkOrderId: string,
    payload: SubmissionPayload,
    credentials?: Record<string, any>
  ): Promise<SubmissionResult>;

  uploadDocument(
    externalWorkOrderId: string,
    document: ConnectorDocument,
    credentials?: Record<string, any>
  ): Promise<UploadResult>;

  uploadPhoto(
    externalWorkOrderId: string,
    photo: ConnectorPhoto,
    credentials?: Record<string, any>
  ): Promise<UploadResult>;

  disconnect(): Promise<void>;
}

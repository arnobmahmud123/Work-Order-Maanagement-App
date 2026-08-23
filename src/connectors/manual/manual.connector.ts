import {
  AuthResult,
  ConnectionTestResult,
  ConnectorDocument,
  ConnectorMetadata,
  ConnectorPhoto,
  ConnectorWorkOrderResult,
  NormalizedWorkOrder,
  SubmissionPayload,
  SubmissionRequirements,
  SubmissionResult,
  UploadResult,
  WorkOrderConnector,
} from "../core/connector.interface";

export class ManualConnector implements WorkOrderConnector {
  private metadata: ConnectorMetadata = {
    key: "manual_entry",
    name: "Manual Work Order Entry",
    version: "1.0.0",
    vendor: "PPW Platform Core",
    description: "Standard manual processor intake channel routing internal entries through canonical validation, normalization, and deduplication.",
    authenticationType: "manual",
    requiresAuthorization: false,
    capabilities: {
      importOrders: true,
      importUpdates: true,
      importDocuments: true,
      importPhotos: true,
      exportStatus: false,
      submitOrders: false,
      uploadDocuments: false,
      uploadPhotos: false,
      bids: true,
      invoices: true,
      messaging: true,
      webhook: false,
      polling: false,
      api: false,
      browserAutomation: false,
      fileImport: false,
      emailImport: false,
    },
  };

  public getMetadata(): ConnectorMetadata {
    return this.metadata;
  }

  public async authenticate(): Promise<AuthResult> {
    return { success: true, message: "Manual entry channel ready" };
  }

  public async testConnection(): Promise<ConnectionTestResult> {
    return {
      success: true,
      statusCode: 200,
      latencyMs: 0,
      message: "Manual intake channel operational",
      capabilitiesConfirmed: ["importOrders", "importDocuments", "importPhotos"],
    };
  }

  public async fetchNewWorkOrders(): Promise<ConnectorWorkOrderResult> {
    return { orders: [], hasMore: false, recordsFetched: 0 };
  }

  public async fetchUpdatedWorkOrders(): Promise<ConnectorWorkOrderResult> {
    return { orders: [], hasMore: false, recordsFetched: 0 };
  }

  public async fetchWorkOrder(): Promise<NormalizedWorkOrder | null> {
    return null;
  }

  public async fetchDocuments(): Promise<ConnectorDocument[]> {
    return [];
  }

  public async fetchPhotos(): Promise<ConnectorPhoto[]> {
    return [];
  }

  public async getSubmissionRequirements(): Promise<SubmissionRequirements> {
    return {
      requiresBeforePhotos: false,
      requiresDuringPhotos: false,
      requiresAfterPhotos: false,
      requiresInvoice: false,
      requiresPCRForm: false,
      requiresSignature: false,
      requiresGpsCoords: false,
      allowedPhotoMimeTypes: ["image/jpeg", "image/png"],
    };
  }

  public async submitWorkOrder(): Promise<SubmissionResult> {
    return { success: false, message: "Manual entry orders do not export to an external API.", submittedAt: new Date().toISOString() };
  }

  public async uploadDocument(): Promise<UploadResult> {
    return { success: true };
  }

  public async uploadPhoto(): Promise<UploadResult> {
    return { success: true };
  }

  public async disconnect(): Promise<void> {}
}

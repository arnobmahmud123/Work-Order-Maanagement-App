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
import { WorkOrderNormalizer } from "@/sync/normalization/work-order-normalizer";

export interface ColumnMappingConfig {
  externalWorkOrderId: string;
  address1: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  serviceType?: string;
  dueDate?: string;
  status?: string;
  priority?: string;
  lockCode?: string;
  gateCode?: string;
  keyCode?: string;
  instructions?: string;
  bidAmount?: string;
  clientName?: string;
}

export interface FileValidationResult {
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  samplePreview: Array<{
    rowNumber: number;
    raw: Record<string, any>;
    normalized?: NormalizedWorkOrder;
    errors: string[];
    warnings: string[];
  }>;
}

export class CsvExcelConnector implements WorkOrderConnector {
  private metadata: ConnectorMetadata = {
    key: "csv_excel",
    name: "Universal File Importer (CSV / Excel / PDF)",
    version: "1.0.0",
    vendor: "PPW Platform Core",
    description: "Universal multi-format work order importer supporting CSV, Excel (.xlsx/.xls), JSON, and PDF extractions with column auto-mapping and dry-run validation preview.",
    authenticationType: "file",
    requiresAuthorization: false,
    capabilities: {
      importOrders: true,
      importUpdates: true,
      importDocuments: true,
      importPhotos: false,
      exportStatus: false,
      submitOrders: false,
      uploadDocuments: false,
      uploadPhotos: false,
      bids: true,
      invoices: true,
      messaging: false,
      webhook: false,
      polling: false,
      api: false,
      browserAutomation: false,
      fileImport: true,
      emailImport: false,
    },
  };

  private normalizer = new WorkOrderNormalizer();

  public getMetadata(): ConnectorMetadata {
    return this.metadata;
  }

  public async authenticate(): Promise<AuthResult> {
    return { success: true, message: "File connector ready for file uploads" };
  }

  public async testConnection(): Promise<ConnectionTestResult> {
    return {
      success: true,
      statusCode: 200,
      latencyMs: 1,
      message: "File importer engine ready",
      capabilitiesConfirmed: ["fileImport", "importOrders", "importUpdates"],
    };
  }

  /**
   * Auto-detect columns from parsed headers
   */
  public autoDetectColumns(headers: string[]): ColumnMappingConfig {
    const map: Partial<ColumnMappingConfig> = {};
    const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const h of headers) {
      const n = norm(h);
      if (!map.externalWorkOrderId && (n.includes("workorder") || n.includes("wo") || n.includes("ordernumber") || n.includes("taskid") || n.includes("refnumber"))) {
        map.externalWorkOrderId = h;
      } else if (!map.address1 && (n.includes("address") || n.includes("street") || n.includes("propertyaddress"))) {
        map.address1 = h;
      } else if (!map.city && n.includes("city")) {
        map.city = h;
      } else if (!map.state && (n === "state" || n === "st" || n.includes("province"))) {
        map.state = h;
      } else if (!map.zip && (n.includes("zip") || n.includes("postal"))) {
        map.zip = h;
      } else if (!map.serviceType && (n.includes("service") || n.includes("category") || n.includes("jobtype") || n.includes("worktype") || n.includes("task"))) {
        map.serviceType = h;
      } else if (!map.dueDate && (n.includes("due") || n.includes("completiondate") || n.includes("deadline") || n.includes("targetdate"))) {
        map.dueDate = h;
      } else if (!map.status && n.includes("status")) {
        map.status = h;
      } else if (!map.lockCode && (n.includes("lock") || n.includes("lockbox") || n.includes("combo"))) {
        map.lockCode = h;
      } else if (!map.gateCode && n.includes("gate")) {
        map.gateCode = h;
      } else if (!map.keyCode && n.includes("key")) {
        map.keyCode = h;
      } else if (!map.instructions && (n.includes("instruction") || n.includes("description") || n.includes("notes") || n.includes("scope"))) {
        map.instructions = h;
      } else if (!map.clientName && (n.includes("client") || n.includes("customer") || n.includes("vendor"))) {
        map.clientName = h;
      }
    }

    return {
      externalWorkOrderId: map.externalWorkOrderId || headers[0] || "Work Order #",
      address1: map.address1 || headers[1] || "Address",
      city: map.city,
      state: map.state,
      zip: map.zip,
      serviceType: map.serviceType,
      dueDate: map.dueDate,
      status: map.status,
      lockCode: map.lockCode,
      gateCode: map.gateCode,
      keyCode: map.keyCode,
      instructions: map.instructions,
      clientName: map.clientName,
    };
  }

  /**
   * Validate raw uploaded table rows and return preview
   */
  public validateRows(
    rows: Array<Record<string, any>>,
    mapping: ColumnMappingConfig,
    clientId: string = "cli_custom_file",
    clientName: string = "File Import"
  ): FileValidationResult {
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    const samplePreview: FileValidationResult["samplePreview"] = [];

    rows.forEach((row, idx) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const rawWo = String(row[mapping.externalWorkOrderId] || "").trim();
      const rawAddr = String(row[mapping.address1] || "").trim();

      if (!rawWo) {
        errors.push("Missing Work Order ID / Number");
      }
      if (!rawAddr) {
        errors.push("Missing Property Address");
      }

      if (!row[mapping.city || ""] && !rawAddr.includes(",")) {
        warnings.push("City not specified in separate column");
      }
      if (!row[mapping.state || ""] && !rawAddr.includes(",")) {
        warnings.push("State not specified");
      }
      if (!row[mapping.dueDate || ""]) {
        warnings.push("Due Date not provided; will default to +7 days");
      }

      let normalized: NormalizedWorkOrder | undefined;
      if (errors.length === 0) {
        normalized = this.normalizer.normalize({
          clientId,
          clientName: String(row[mapping.clientName || ""] || clientName),
          externalWorkOrderId: rawWo,
          address1: rawAddr,
          city: mapping.city ? String(row[mapping.city] || "") : undefined,
          state: mapping.state ? String(row[mapping.state] || "") : undefined,
          zip: mapping.zip ? String(row[mapping.zip] || "") : undefined,
          category: mapping.serviceType ? String(row[mapping.serviceType] || "") : undefined,
          dueAt: mapping.dueDate ? String(row[mapping.dueDate] || "") : undefined,
          externalStatus: mapping.status ? String(row[mapping.status] || "") : undefined,
          lockCode: mapping.lockCode ? String(row[mapping.lockCode] || "") : undefined,
          gateCode: mapping.gateCode ? String(row[mapping.gateCode] || "") : undefined,
          keyCode: mapping.keyCode ? String(row[mapping.keyCode] || "") : undefined,
          instructions: mapping.instructions ? String(row[mapping.instructions] || "") : undefined,
          rawPayload: row,
        });
        validCount++;
        if (warnings.length > 0) warningCount++;
      } else {
        errorCount++;
      }

      if (idx < 50) {
        samplePreview.push({
          rowNumber: idx + 1,
          raw: row,
          normalized,
          errors,
          warnings,
        });
      }
    });

    return {
      totalRows: rows.length,
      validRows: validCount,
      warningRows: warningCount,
      errorRows: errorCount,
      samplePreview,
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
    return {
      success: false,
      message: "File connector does not support direct automated client submission.",
      submittedAt: new Date().toISOString(),
    };
  }

  public async uploadDocument(): Promise<UploadResult> {
    return { success: false };
  }

  public async uploadPhoto(): Promise<UploadResult> {
    return { success: false };
  }

  public async disconnect(): Promise<void> {}
}

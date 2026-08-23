import crypto from "crypto";
import { NormalizedWorkOrder, ServiceItem } from "@/connectors/core/connector.interface";
import { ServiceMapper } from "./service-mapper";
import { StatusMapper } from "./status-mapper";
import { normalizeAddress } from "./address-normalizer";

export function computePayloadChecksum(payload: any): string {
  const normalizedString = typeof payload === "string" ? payload : JSON.stringify(payload, Object.keys(payload || {}).sort());
  return crypto.createHash("sha256").update(normalizedString).digest("hex");
}

export class WorkOrderNormalizer {
  private serviceMapper: ServiceMapper;
  private statusMapper: StatusMapper;

  constructor(serviceMapper?: ServiceMapper, statusMapper?: StatusMapper) {
    this.serviceMapper = serviceMapper || new ServiceMapper();
    this.statusMapper = statusMapper || new StatusMapper();
  }

  public normalize(raw: {
    clientId: string;
    clientName?: string;
    externalWorkOrderId: string;
    externalReference?: string;
    externalStatus?: string;
    externalCreatedAt?: string;
    externalUpdatedAt?: string;
    address1: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    county?: string;
    lotSize?: string;
    lawnSize?: string;
    lockCode?: string;
    lockboxLocation?: string;
    gateCode?: string;
    keyCode?: string;
    keycodeLocation?: string;
    occupancyStatus?: string;
    assignedAt?: string;
    dueAt?: string;
    completionDeadline?: string;
    priority?: number | string;
    category?: string;
    services?: Array<{ name: string; externalCode?: string; description?: string; quantity?: number; unit?: string; unitPrice?: number; instructions?: string }>;
    instructions?: string;
    bidAmount?: number;
    approvedAmount?: number;
    invoiceAmount?: number;
    contacts?: any[];
    documents?: any[];
    photos?: any[];
    rawPayload?: any;
    metadata?: Record<string, any>;
  }): NormalizedWorkOrder {
    const addressNorm = normalizeAddress({
      address1: raw.address1,
      address2: raw.address2,
      city: raw.city,
      state: raw.state,
      zip: raw.zip,
      county: raw.county,
    });

    const mappedStatus = this.statusMapper.mapStatus(raw.externalStatus);

    const services: ServiceItem[] = (raw.services || []).map((srv) => {
      const mapped = this.serviceMapper.mapService(srv.externalCode || srv.name);
      return {
        serviceCode: mapped.code,
        externalCode: srv.externalCode,
        name: srv.name || mapped.code,
        description: srv.description,
        quantity: srv.quantity ?? 1,
        unit: srv.unit || "EA",
        unitPrice: srv.unitPrice,
        instructions: srv.instructions,
      };
    });

    // If no explicit services provided, infer from instructions or category
    if (services.length === 0 && (raw.category || raw.instructions)) {
      const inferText = `${raw.category || ""} ${raw.instructions || ""}`;
      const mapped = this.serviceMapper.mapService(inferText);
      services.push({
        serviceCode: mapped.code,
        name: raw.category || mapped.code,
        quantity: 1,
      });
    }

    const checksum = computePayloadChecksum(raw.rawPayload || raw);

    return {
      clientId: raw.clientId,
      clientName: raw.clientName,
      externalWorkOrderId: String(raw.externalWorkOrderId).trim(),
      externalReference: raw.externalReference?.trim(),
      externalStatus: raw.externalStatus?.trim(),
      externalCreatedAt: raw.externalCreatedAt,
      externalUpdatedAt: raw.externalUpdatedAt,
      property: {
        address1: addressNorm.address1,
        address2: addressNorm.address2,
        city: addressNorm.city,
        state: addressNorm.state,
        zip: addressNorm.zip,
        county: addressNorm.county,
        lotSize: raw.lotSize,
        lawnSize: raw.lawnSize,
        lockCode: raw.lockCode,
        lockboxLocation: raw.lockboxLocation,
        gateCode: raw.gateCode,
        keyCode: raw.keyCode,
        keycodeLocation: raw.keycodeLocation,
        occupancyStatus: raw.occupancyStatus,
      },
      assignment: {
        assignedAt: raw.assignedAt,
        dueAt: raw.dueAt,
        completionDeadline: raw.completionDeadline,
        priority: typeof raw.priority === "string" ? parseInt(raw.priority, 10) || 0 : raw.priority || 0,
        category: raw.category,
      },
      services,
      instructions: raw.instructions,
      status: mappedStatus,
      financials: {
        bidAmount: raw.bidAmount,
        approvedAmount: raw.approvedAmount,
        invoiceAmount: raw.invoiceAmount,
      },
      contacts: raw.contacts,
      documents: raw.documents,
      photos: raw.photos,
      rawPayload: raw.rawPayload || raw,
      payloadChecksum: checksum,
      metadata: raw.metadata || {},
    };
  }
}

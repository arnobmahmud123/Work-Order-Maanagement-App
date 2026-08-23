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
import { CanonicalServiceCode } from "../core/connector-types";

export class MockConnector implements WorkOrderConnector {
  private metadata: ConnectorMetadata = {
    key: "mock",
    name: "Sandbox Simulation Client",
    version: "1.0.0",
    vendor: "PPW Platform Internal",
    description: "High-fidelity mock client generating 100 realistic property preservation work orders with documents, photos, line items, and updates.",
    authenticationType: "mock",
    requiresAuthorization: false,
    capabilities: {
      importOrders: true,
      importUpdates: true,
      importDocuments: true,
      importPhotos: true,
      exportStatus: true,
      submitOrders: true,
      uploadDocuments: true,
      uploadPhotos: true,
      bids: true,
      invoices: true,
      messaging: true,
      webhook: false,
      polling: true,
      api: true,
      browserAutomation: false,
      fileImport: false,
      emailImport: false,
    },
  };

  public getMetadata(): ConnectorMetadata {
    return this.metadata;
  }

  public async authenticate(): Promise<AuthResult> {
    return { success: true, message: "Mock Sandbox authenticated successfully" };
  }

  public async testConnection(): Promise<ConnectionTestResult> {
    return {
      success: true,
      statusCode: 200,
      latencyMs: 18,
      message: "Sandbox test connection active and healthy",
      capabilitiesConfirmed: [
        "importOrders", "importUpdates", "importDocuments", "importPhotos",
        "submitOrders", "uploadDocuments", "uploadPhotos", "bids", "invoices"
      ],
      diagnostics: {
        dataset: "100 Property Preservation Records",
        generatedServices: ["GRASS_CUT", "WINTERIZATION", "DEBRIS_REMOVAL", "BOARD_UP", "INSPECTION", "LOCK_CHANGE", "ROOF_TARP"],
        status: "OPERATIONAL"
      }
    };
  }

  public async fetchNewWorkOrders(cursor?: any): Promise<ConnectorWorkOrderResult> {
    const orders: NormalizedWorkOrder[] = [];
    const streetNames = ["Oak Ave", "Maple St", "Pine Rd", "Cedar Ln", "Elm St", "Main St", "Washington Blvd", "Lincoln Way", "Sunset Dr", "Highland Ave"];
    const cities = [
      { city: "Springfield", state: "IL", zip: "62701" },
      { city: "Dallas", state: "TX", zip: "75201" },
      { city: "Atlanta", state: "GA", zip: "30301" },
      { city: "Orlando", state: "FL", zip: "32801" },
      { city: "Columbus", state: "OH", zip: "43215" },
      { city: "Phoenix", state: "AZ", zip: "85001" },
      { city: "Charlotte", state: "NC", zip: "28202" },
      { city: "Denver", state: "CO", zip: "80202" },
      { city: "Detroit", state: "MI", zip: "48226" },
      { city: "Memphis", state: "TN", zip: "38103" },
    ];

    const serviceTemplates: Array<{ name: string; code: CanonicalServiceCode; instructions: string; price: number }> = [
      { name: "Initial Grass Cut & Trimming", code: "GRASS_CUT", instructions: "Mow front, back, and side yards up to 10,000 sq ft. Edge sidewalks and string trim around fences and AC units.", price: 95 },
      { name: "Full Dry Winterization", code: "WINTERIZATION", instructions: "Shut off main water valve. Drain all plumbing lines, water heater, and pressure tank. Add non-toxic antifreeze to all traps and toilets.", price: 140 },
      { name: "Interior & Exterior Debris Removal (15 CY)", code: "DEBRIS_REMOVAL", instructions: "Remove and dispose of up to 15 cubic yards of interior household debris. Take before, during, and after photos of every room.", price: 450 },
      { name: "Plywood Board-Up & Window Securing", code: "BOARD_UP", instructions: "Board up 3 broken windows on rear and basement using 1/2-inch CDX plywood and 3/8-inch carriage bolts.", price: 210 },
      { name: "Rekey & Master Lockbox Installation", code: "LOCK_CHANGE", instructions: "Change lock on main front entry to standard client key code 35241. Install numeric lockbox coded to 5821 on front door knob.", price: 75 },
      { name: "Exterior Occupancy Inspection & PCR", code: "INSPECTION", instructions: "Determine occupancy status. Check for posting notices, utility meters, roof damage, and lawn maintenance condition.", price: 35 },
      { name: "Emergency Roof Tarping", code: "ROOF_TARP", instructions: "Install 20x30 heavy-duty UV resistant tarp over active roof puncture near rear slope. Secure with 2x4 furring strips.", price: 320 },
    ];

    const count = 100;
    for (let i = 1; i <= count; i++) {
      const cityObj = cities[i % cities.length];
      const streetNum = 100 + (i * 12);
      const street = `${streetNum} ${streetNames[i % streetNames.length]}`;
      const serviceTpl = serviceTemplates[i % serviceTemplates.length];
      const woNum = `SIM-${100000 + i}`;
      const daysOffset = (i % 7) + 1;
      const dueDate = new Date(Date.now() + daysOffset * 86400000).toISOString();

      orders.push({
        clientId: "cli_mock",
        clientName: "Sandbox Simulation Client",
        externalWorkOrderId: woNum,
        externalReference: `LOAN-${7000000 + i}`,
        externalStatus: i % 5 === 0 ? "In Progress" : i % 8 === 0 ? "Completed" : "Assigned",
        externalCreatedAt: new Date().toISOString(),
        property: {
          address1: street,
          city: cityObj.city,
          state: cityObj.state,
          zip: cityObj.zip,
          lotSize: "0.25 Acres",
          lawnSize: "8,500 sq ft",
          lockCode: "35241",
          lockboxLocation: "Front Door",
          gateCode: i % 3 === 0 ? "1984" : undefined,
          keyCode: "5821",
          keycodeLocation: "Front Porch Railing",
          occupancyStatus: i % 4 === 0 ? "OCCUPIED" : "VACANT",
        },
        assignment: {
          assignedAt: new Date().toISOString(),
          dueAt: dueDate,
          priority: i % 6 === 0 ? 2 : 0,
          category: serviceTpl.name,
        },
        services: [
          {
            serviceCode: serviceTpl.code,
            name: serviceTpl.name,
            description: serviceTpl.instructions,
            quantity: 1,
            unit: "JOB",
            unitPrice: serviceTpl.price,
            approvedPrice: serviceTpl.price,
            instructions: serviceTpl.instructions,
          },
        ],
        instructions: `CLIENT RULES:\n1. All work must follow HUD/FHA guidelines.\n2. Minimum 10 clear photos required per service.\n3. Return all lockbox codes and confirmation numbers upon completion.`,
        status: i % 5 === 0 ? "IN_PROGRESS" : i % 8 === 0 ? "FIELD_COMPLETE" : "ASSIGNED",
        financials: {
          approvedAmount: serviceTpl.price,
          maxAllowance: serviceTpl.price + 100,
        },
        contacts: [
          { name: "John Doe (Client Specialist)", role: "CLIENT", email: "orders@mockclient.com", phone: "800-555-0199" },
        ],
        documents: [
          {
            externalDocumentId: `DOC-${woNum}`,
            fileName: `${woNum}_WorkOrder.pdf`,
            fileType: "pdf",
            mimeType: "application/pdf",
            documentType: "WORK_ORDER_PDF",
            retrievedAt: new Date().toISOString(),
          }
        ],
        photos: [],
        metadata: {
          simulationId: `SIM_RUN_${Date.now()}`,
          clientPriority: i % 6 === 0 ? "RUSH" : "STANDARD",
          fhaCaseNumber: `156-${5000000 + i}`,
        }
      });
    }

    return {
      orders,
      hasMore: false,
      recordsFetched: orders.length,
    };
  }

  public async fetchUpdatedWorkOrders(cursor?: any): Promise<ConnectorWorkOrderResult> {
    return {
      orders: [],
      hasMore: false,
      recordsFetched: 0,
    };
  }

  public async fetchWorkOrder(externalWorkOrderId: string): Promise<NormalizedWorkOrder | null> {
    const all = await this.fetchNewWorkOrders();
    return all.orders.find((o) => o.externalWorkOrderId === externalWorkOrderId) || null;
  }

  public async fetchDocuments(externalWorkOrderId: string): Promise<ConnectorDocument[]> {
    return [
      {
        externalDocumentId: `DOC-${externalWorkOrderId}`,
        fileName: `${externalWorkOrderId}_SpecSheet.pdf`,
        fileType: "pdf",
        mimeType: "application/pdf",
        documentType: "WORK_ORDER_PDF",
        retrievedAt: new Date().toISOString(),
      },
    ];
  }

  public async fetchPhotos(externalWorkOrderId: string): Promise<ConnectorPhoto[]> {
    return [];
  }

  public async getSubmissionRequirements(): Promise<SubmissionRequirements> {
    return {
      requiresBeforePhotos: true,
      requiresDuringPhotos: false,
      requiresAfterPhotos: true,
      requiresInvoice: true,
      requiresPCRForm: false,
      requiresSignature: false,
      requiresGpsCoords: false,
      allowedPhotoMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    };
  }

  public async submitWorkOrder(externalWorkOrderId: string, payload: SubmissionPayload): Promise<SubmissionResult> {
    return {
      success: true,
      externalSubmissionId: `SUB-${externalWorkOrderId}-${Date.now()}`,
      externalStatus: "ACCEPTED",
      message: `Work order ${externalWorkOrderId} successfully submitted to Sandbox client system.`,
      submittedAt: new Date().toISOString(),
    };
  }

  public async uploadDocument(externalWorkOrderId: string, document: ConnectorDocument): Promise<UploadResult> {
    return { success: true, externalFileId: `UP-DOC-${Date.now()}` };
  }

  public async uploadPhoto(externalWorkOrderId: string, photo: ConnectorPhoto): Promise<UploadResult> {
    return { success: true, externalFileId: `UP-IMG-${Date.now()}` };
  }

  public async disconnect(): Promise<void> {}
}

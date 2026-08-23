import { NormalizedWorkOrder } from "@/connectors/core/connector.interface";

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export function detectWorkOrderChanges(
  existingOrder: any,
  incomingOrder: NormalizedWorkOrder
): FieldChange[] {
  const changes: FieldChange[] = [];

  if (!existingOrder) return changes;

  const compareFields: Array<{
    field: string;
    getExisting: (o: any) => any;
    getIncoming: (o: NormalizedWorkOrder) => any;
  }> = [
    { field: "status", getExisting: (o) => o.status, getIncoming: (o) => o.status },
    { field: "dueDate", getExisting: (o) => (o.dueDate ? new Date(o.dueDate).toISOString().split("T")[0] : null), getIncoming: (o) => (o.assignment.dueAt ? new Date(o.assignment.dueAt).toISOString().split("T")[0] : null) },
    { field: "serviceType", getExisting: (o) => o.serviceType, getIncoming: (o) => o.services[0]?.serviceCode || "OTHER" },
    { field: "priority", getExisting: (o) => o.priority, getIncoming: (o) => o.assignment.priority },
    { field: "lockCode", getExisting: (o) => o.lockCode, getIncoming: (o) => o.property.lockCode },
    { field: "gateCode", getExisting: (o) => o.gateCode, getIncoming: (o) => o.property.gateCode },
    { field: "keyCode", getExisting: (o) => o.keyCode, getIncoming: (o) => o.property.keyCode },
    { field: "specialInstructions", getExisting: (o) => o.specialInstructions, getIncoming: (o) => o.instructions },
  ];

  for (const { field, getExisting, getIncoming } of compareFields) {
    const oldVal = getExisting(existingOrder);
    const newVal = getIncoming(incomingOrder);

    if (newVal !== undefined && newVal !== null && String(oldVal || "").trim() !== String(newVal || "").trim()) {
      changes.push({
        field,
        oldValue: oldVal ?? null,
        newValue: newVal,
      });
    }
  }

  return changes;
}

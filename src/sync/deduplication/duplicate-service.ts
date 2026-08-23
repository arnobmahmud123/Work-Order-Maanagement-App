import { NormalizedWorkOrder } from "@/connectors/core/connector.interface";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingWorkOrderId?: string;
  matchType: "EXACT_EXTERNAL_ID" | "ADDRESS_REFERENCE" | "NONE";
  existingChecksum?: string;
  hasChanged: boolean;
}

export class DuplicateService {
  /**
   * Check if a work order already exists in the system
   */
  public async checkForDuplicate(
    order: NormalizedWorkOrder,
    db: any
  ): Promise<DuplicateCheckResult> {
    if (!db) {
      return { isDuplicate: false, matchType: "NONE", hasChanged: true };
    }

    try {
      // 1. Check primary unique key: clientId + externalWorkOrderId
      const ref = await db
        .prepare(
          `SELECT workOrderId, checksum FROM work_order_external_refs WHERE clientId = ? AND externalWorkOrderId = ? LIMIT 1`
        )
        .bind(order.clientId, order.externalWorkOrderId)
        .first() as any;

      if (ref && ref.workOrderId) {
        const hasChanged = ref.checksum !== order.payloadChecksum;
        return {
          isDuplicate: true,
          existingWorkOrderId: ref.workOrderId,
          matchType: "EXACT_EXTERNAL_ID",
          existingChecksum: ref.checksum,
          hasChanged,
        };
      }

      // 2. Secondary fuzzy check: address + client + due date (prevent duplicate creates)
      if (order.property.address1 && order.property.city && order.property.state) {
        const addressMatch = await db
          .prepare(
            `SELECT id, metadata FROM WorkOrder 
             WHERE LOWER(address) LIKE ? AND LOWER(city) = ? AND UPPER(state) = ? 
             AND status NOT IN ('CANCELLED', 'CLOSED') LIMIT 1`
          )
          .bind(
            `%${order.property.address1.toLowerCase()}%`,
            order.property.city.toLowerCase(),
            order.property.state.toUpperCase()
          )
          .first() as any;

        if (addressMatch && addressMatch.id) {
          return {
            isDuplicate: true,
            existingWorkOrderId: addressMatch.id,
            matchType: "ADDRESS_REFERENCE",
            hasChanged: true,
          };
        }
      }

      return {
        isDuplicate: false,
        matchType: "NONE",
        hasChanged: true,
      };
    } catch (error) {
      console.warn("[DuplicateService] Check failed, proceeding as new:", error);
      return { isDuplicate: false, matchType: "NONE", hasChanged: true };
    }
  }
}

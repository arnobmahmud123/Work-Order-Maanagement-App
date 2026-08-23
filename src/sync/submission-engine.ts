import { ConnectorRegistry } from "@/connectors/core/connector-registry";
import { SubmissionPayload, SubmissionResult } from "@/connectors/core/connector.interface";

export interface SubmissionValidationReport {
  valid: boolean;
  blockers: string[];
  warnings: string[];
  photoCount: number;
  hasInvoice: boolean;
}

export class SubmissionEngine {
  /**
   * Validate work order before sending to client
   */
  public async validateForSubmission(
    workOrder: any,
    connectorKey: string
  ): Promise<SubmissionValidationReport> {
    const blockers: string[] = [];
    const warnings: string[] = [];

    const connector = ConnectorRegistry.get(connectorKey);
    if (!connector) {
      blockers.push(`Connector '${connectorKey}' is not registered.`);
      return { valid: false, blockers, warnings, photoCount: 0, hasInvoice: false };
    }

    const reqs = await connector.getSubmissionRequirements(workOrder.id);

    // 1. Photos check
    let photos: any[] = [];
    try {
      if (Array.isArray(workOrder.files)) {
        photos = workOrder.files.filter((f: any) => f.fileType === "image" || f.mimeType?.startsWith("image"));
      }
    } catch {}

    const photoCount = photos.length;

    if (reqs.requiresBeforePhotos && photoCount === 0) {
      blockers.push("Client requires before/completion photos, but none are attached.");
    }

    if (reqs.requiresAfterPhotos && photoCount < 2) {
      warnings.push("Client recommends at least 2 completion photos.");
    }

    // 2. Invoice check
    const hasInvoice = Array.isArray(workOrder.invoices) && workOrder.invoices.length > 0;
    if (reqs.requiresInvoice && !hasInvoice) {
      warnings.push("Client requires an invoice or line-item breakdown before submission.");
    }

    // 3. Status check
    if (workOrder.status !== "FIELD_COMPLETE" && workOrder.status !== "QC_REVIEW" && workOrder.status !== "OFFICE_COMPLETE") {
      blockers.push(`Work order status is '${workOrder.status}'. Must be FIELD_COMPLETE or QC_REVIEW before client submission.`);
    }

    return {
      valid: blockers.length === 0,
      blockers,
      warnings,
      photoCount,
      hasInvoice,
    };
  }

  /**
   * Execute submission to external client connector
   */
  public async submitWorkOrder(params: {
    workOrderId: string;
    connectorId: string;
    connectorKey: string;
    externalWorkOrderId: string;
    payload: SubmissionPayload;
    db: any;
  }): Promise<SubmissionResult> {
    const { workOrderId, connectorId, connectorKey, externalWorkOrderId, payload, db } = params;
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const connector = ConnectorRegistry.get(connectorKey);
    if (!connector) {
      throw new Error(`Connector '${connectorKey}' not found.`);
    }

    // 1. Record pending submission
    if (db) {
      try {
        await db
          .prepare(
            `INSERT INTO work_order_submissions (id, workOrderId, connectorId, submissionType, status, payload, attemptedAt)
             VALUES (?, ?, ?, 'WORK_ORDER_SUBMIT', 'SUBMITTING', ?, CURRENT_TIMESTAMP)`
          )
          .bind(submissionId, workOrderId, connectorId, JSON.stringify(payload))
          .run();
      } catch (e) {
        console.warn("[SubmissionEngine] Log failed:", e);
      }
    }

    try {
      const result = await connector.submitWorkOrder(externalWorkOrderId, payload);

      if (db) {
        await db
          .prepare(
            `UPDATE work_order_submissions SET 
              status = ?, externalSubmissionId = ?, completedAt = CURRENT_TIMESTAMP, response = ?, error = ?
             WHERE id = ?`
          )
          .bind(
            result.success ? "SUBMITTED" : "FAILED",
            result.externalSubmissionId || null,
            JSON.stringify(result),
            result.message || null,
            submissionId
          )
          .run();

        if (result.success) {
          await db
            .prepare(`UPDATE work_orders SET status = 'PENDING_REVIEW', updatedAt = CURRENT_TIMESTAMP WHERE id = ?`)
            .bind(workOrderId)
            .run();
        }
      }

      return result;
    } catch (err: any) {
      if (db) {
        await db
          .prepare(
            `UPDATE work_order_submissions SET status = 'FAILED', completedAt = CURRENT_TIMESTAMP, error = ? WHERE id = ?`
          )
          .bind(err.message || "Submission execution failed", submissionId)
          .run();
      }
      return {
        success: false,
        submittedAt: new Date().toISOString(),
        message: err.message || "Failed to submit work order to client connector.",
      };
    }
  }
}

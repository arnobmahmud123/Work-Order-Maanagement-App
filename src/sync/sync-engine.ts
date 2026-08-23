import { ConnectorRegistry } from "@/connectors/core/connector-registry";
import { NormalizedWorkOrder } from "@/connectors/core/connector.interface";
import { DuplicateService } from "./deduplication/duplicate-service";
import { detectWorkOrderChanges } from "./change-detection";
import { sanitizePayload } from "@/security/credential-vault";

export interface SyncExecutionOptions {
  connectorId: string;
  connectorKey: string;
  clientId?: string;
  companyId?: string;
  createdById?: string;
  syncType?: "NEW_WORK_ORDERS" | "UPDATED_WORK_ORDERS" | "MANUAL_BATCH";
  db: any;
  customOrders?: NormalizedWorkOrder[];
}

export interface SyncSummaryResult {
  jobId: string;
  connectorId: string;
  status: "COMPLETED" | "PARTIAL" | "FAILED";
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: string[];
  durationMs: number;
}

export class SyncEngine {
  private duplicateService = new DuplicateService();

  public async runSync(options: SyncExecutionOptions): Promise<SyncSummaryResult> {
    const startTime = Date.now();
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const { connectorId, connectorKey, db } = options;
    const effectiveCompanyId = options.companyId || "cmrwl4vwd0001oocwyt5b5v0a";

    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    // 1. Record job creation
    if (db) {
      try {
        await db
          .prepare(
            `INSERT INTO sync_jobs (id, connectorId, type, status, startedAt) VALUES (?, ?, ?, 'RUNNING', CURRENT_TIMESTAMP)`
          )
          .bind(jobId, connectorId, options.syncType || "NEW_WORK_ORDERS")
          .run();
      } catch (e) {
        console.warn("[SyncEngine] Failed to create sync_job log:", e);
      }
    }

    try {
      let ordersToProcess: NormalizedWorkOrder[] = [];

      if (options.customOrders && options.customOrders.length > 0) {
        ordersToProcess = options.customOrders;
      } else {
        const connector = ConnectorRegistry.get(connectorKey);
        if (!connector) {
          throw new Error(`Connector '${connectorKey}' is not registered in ConnectorRegistry.`);
        }

        const fetchResult = await connector.fetchNewWorkOrders();
        ordersToProcess = fetchResult.orders;
      }

      recordsProcessed = ordersToProcess.length;

      // Process each normalized work order through the idempotent pipeline
      for (const order of ordersToProcess) {
        try {
          const clientId = order.clientId || options.clientId || "cli_default";

          // 2. Store Sanitized Raw Record for Auditing & Reprocessing
          if (db && order.rawPayload) {
            try {
              const sanitized = sanitizePayload(order.rawPayload);
              await db
                .prepare(
                  `INSERT INTO connector_raw_records (id, connectorId, externalRecordId, recordType, payload, checksum) 
                   VALUES (?, ?, ?, 'WORK_ORDER', ?, ?)`
                )
                .bind(
                  `raw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  connectorId,
                  order.externalWorkOrderId,
                  JSON.stringify(sanitized),
                  order.payloadChecksum || "none"
                )
                .run();
            } catch (rawErr) {
              console.warn("[SyncEngine] Raw audit write failed:", rawErr);
            }
          }

          // 3. Deduplication & Idempotency Check
          const dupeResult = await this.duplicateService.checkForDuplicate(order, db);

          if (dupeResult.isDuplicate && dupeResult.existingWorkOrderId) {
            // Check for changes
            const existingWo = await db
              .prepare(`SELECT * FROM WorkOrder WHERE id = ? LIMIT 1`)
              .bind(dupeResult.existingWorkOrderId)
              .first() as any;

            if (existingWo) {
              const changes = detectWorkOrderChanges(existingWo, order);

              if (changes.length > 0) {
                // Update existing work order
                await db
                  .prepare(
                    `UPDATE WorkOrder SET 
                      status = COALESCE(?, status),
                      dueDate = COALESCE(?, dueDate),
                      serviceType = COALESCE(?, serviceType),
                      lockCode = COALESCE(?, lockCode),
                      gateCode = COALESCE(?, gateCode),
                      keyCode = COALESCE(?, keyCode),
                      specialInstructions = COALESCE(?, specialInstructions),
                      company_id = COALESCE(company_id, ?),
                      updatedAt = CURRENT_TIMESTAMP
                     WHERE id = ?`
                  )
                  .bind(
                    order.status || existingWo.status,
                    order.assignment.dueAt || existingWo.dueDate,
                    order.services[0]?.serviceCode || existingWo.serviceType,
                    order.property.lockCode || existingWo.lockCode,
                    order.property.gateCode || existingWo.gateCode,
                    order.property.keyCode || existingWo.keyCode,
                    order.instructions || existingWo.specialInstructions,
                    effectiveCompanyId,
                    dupeResult.existingWorkOrderId
                  )
                  .run();

                // Log field changes
                for (const ch of changes) {
                  await db
                    .prepare(
                      `INSERT INTO work_order_changes (id, workOrderId, source, field, oldValue, newValue) 
                       VALUES (?, ?, ?, ?, ?, ?)`
                    )
                    .bind(
                      `chg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                      dupeResult.existingWorkOrderId,
                      `CONNECTOR_${connectorKey.toUpperCase()}`,
                      ch.field,
                      String(ch.oldValue ?? ""),
                      String(ch.newValue ?? "")
                    )
                    .run();
                }
              }

              // Update external reference checksum
              await db
                .prepare(
                  `UPDATE work_order_external_refs SET checksum = ?, updatedAt = CURRENT_TIMESTAMP WHERE workOrderId = ?`
                )
                .bind(order.payloadChecksum || "", dupeResult.existingWorkOrderId)
                .run();

              recordsUpdated++;
            }
          } else {
            // 4. Find or Create Property Record in D1
            let propertyId: string | null = null;
            if (db && order.property.address1) {
              try {
                const existingProp = await db
                  .prepare(`SELECT id FROM Property WHERE address = ? AND (company_id = ? OR company_id IS NULL) LIMIT 1`)
                  .bind(order.property.address1.trim(), effectiveCompanyId)
                  .first() as any;

                if (existingProp?.id) {
                  propertyId = existingProp.id;
                } else {
                  propertyId = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                  await db
                    .prepare(
                      `INSERT INTO Property (id, address, city, state, zipCode, company_id, createdAt, updatedAt)
                       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
                    )
                    .bind(
                      propertyId,
                      order.property.address1.trim(),
                      order.property.city || null,
                      order.property.state || null,
                      order.property.zip || null,
                      effectiveCompanyId
                    )
                    .run();
                }
              } catch (propErr) {
                console.warn("[SyncEngine] Property lookup/creation failed:", propErr);
              }
            }

            // 5. Create New Canonical Work Order
            const newWoId = `wo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            const tasksJson = JSON.stringify(
              order.services.map((s, idx) => ({
                id: `task_${idx + 1}`,
                title: s.name,
                completed: false,
                serviceCode: s.serviceCode,
                quantity: s.quantity || 1,
                unitPrice: s.unitPrice,
                instructions: s.instructions,
              }))
            );

            const title = `${order.services[0]?.name || "Property Preservation"} - ${order.property.address1}`;

            await db
              .prepare(
                `INSERT INTO WorkOrder (
                  id, title, description, address, city, state, zipCode, 
                  serviceType, status, priority, dueDate, 
                  lockCode, lockboxLocation, gateCode, keyCode, keycodeLocation, 
                  lotSize, lawnSize, specialInstructions, tasks, metadata, propertyId, createdById, company_id, createdAt, updatedAt
                ) VALUES (
                  ?, ?, ?, ?, ?, ?, ?, 
                  ?, ?, ?, ?, 
                  ?, ?, ?, ?, ?, 
                  ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )`
              )
              .bind(
                newWoId,
                title,
                order.instructions || "",
                order.property.address1,
                order.property.city,
                order.property.state,
                order.property.zip,
                order.services[0]?.serviceCode || "OTHER",
                order.status || "NEW",
                typeof order.assignment.priority === "number" ? order.assignment.priority : 0,
                (order.assignment?.dueAt ? (isNaN(Date.parse(order.assignment.dueAt)) ? order.assignment.dueAt : new Date(order.assignment.dueAt).toISOString()) : null),
                order.property.lockCode || null,
                order.property.lockboxLocation || null,
                order.property.gateCode || null,
                order.property.keyCode || null,
                order.property.keycodeLocation || null,
                order.property.lotSize || null,
                order.property.lawnSize || null,
                order.instructions || null,
                tasksJson,
                JSON.stringify({
                  clientId,
                  clientName: order.clientName,
                  externalWorkOrderId: order.externalWorkOrderId,
                  financials: order.financials,
                  metadata: order.metadata,
                }),
                propertyId,
                options.createdById || null,
                effectiveCompanyId
              )
              .run();

            // Insert External Reference Mapping
            await db
              .prepare(
                `INSERT INTO work_order_external_refs (id, workOrderId, connectorId, clientId, externalWorkOrderId, externalReference, checksum)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                newWoId,
                connectorId,
                clientId,
                order.externalWorkOrderId,
                order.externalReference || null,
                order.payloadChecksum || ""
              )
              .run();

            recordsCreated++;
          }
        } catch (err: any) {
          recordsFailed++;
          errors.push(`Order ${order.externalWorkOrderId}: ${err.message || err}`);
        }
      }

      const durationMs = Date.now() - startTime;
      const finalStatus = recordsFailed === 0 ? "COMPLETED" : recordsCreated > 0 ? "PARTIAL" : "FAILED";

      // 6. Update sync state & connector health
      if (db) {
        try {
          await db
            .prepare(
              `UPDATE sync_jobs SET 
                status = ?, completedAt = CURRENT_TIMESTAMP, 
                recordsProcessed = ?, recordsCreated = ?, recordsUpdated = ?, recordsFailed = ?, error = ? 
               WHERE id = ?`
            )
            .bind(
              finalStatus,
              recordsProcessed,
              recordsCreated,
              recordsUpdated,
              recordsFailed,
              errors.length > 0 ? errors.slice(0, 5).join(" | ") : null,
              jobId
            )
            .run();

          await db
            .prepare(
              `UPDATE connectors SET 
                lastSyncAt = CURRENT_TIMESTAMP,
                lastSuccessAt = CASE WHEN ? = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE lastSuccessAt END,
                lastFailureAt = CASE WHEN ? = 'FAILED' THEN CURRENT_TIMESTAMP ELSE lastFailureAt END,
                lastError = ?,
                status = CASE WHEN ? = 'FAILED' THEN 'FAILING' ELSE 'HEALTHY' END,
                updatedAt = CURRENT_TIMESTAMP
               WHERE id = ?`
            )
            .bind(
              finalStatus,
              finalStatus,
              errors.length > 0 ? errors[0] : null,
              finalStatus,
              connectorId
            )
            .run();
        } catch (updateErr) {
          console.warn("[SyncEngine] Failed to update job/connector state:", updateErr);
        }
      }

      return {
        jobId,
        connectorId,
        status: finalStatus,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        errors,
        durationMs,
      };
    } catch (globalErr: any) {
      if (db) {
        try {
          await db
            .prepare(`UPDATE sync_jobs SET status = 'FAILED', completedAt = CURRENT_TIMESTAMP, error = ? WHERE id = ?`)
            .bind(globalErr.message || "Global sync error", jobId)
            .run();

          await db
            .prepare(`UPDATE connectors SET lastFailureAt = CURRENT_TIMESTAMP, lastError = ?, status = 'FAILING' WHERE id = ?`)
            .bind(globalErr.message, connectorId)
            .run();
        } catch {}
      }

      return {
        jobId,
        connectorId,
        status: "FAILED",
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 1,
        errors: [globalErr.message || "Fatal synchronization failure"],
        durationMs: Date.now() - startTime,
      };
    }
  }
}

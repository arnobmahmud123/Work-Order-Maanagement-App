import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

async function getFileBuffer(filePath: string): Promise<Buffer | null> {
  try {
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      const res = await fetch(filePath);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } else {
      const relativePath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
      const fullPath = path.join(process.cwd(), "public", relativePath);
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath);
      }
      return null;
    }
  } catch (err) {
    console.error(`Failed to read file ${filePath}:`, err);
    return null;
  }
}

function zipCrc32(bytes: Uint8Array) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function zipDateTime(date = new Date()) {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    dosDate: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function createStoredZipServer(files: { name: string; data: Buffer }[]): Buffer {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const now = zipDateTime();

  function record(size: number, write: (view: DataView) => void) {
    const bytes = new Uint8Array(size);
    write(new DataView(bytes.buffer));
    return bytes;
  }

  for (const file of files) {
    const data = new Uint8Array(file.data);
    const nameBytes = encoder.encode(file.name);
    const crc = zipCrc32(data);

    const local = record(30, (view) => {
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(10, now.time, true);
      view.setUint16(12, now.dosDate, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, data.length, true);
      view.setUint32(22, data.length, true);
      view.setUint16(26, nameBytes.length, true);
    });
    chunks.push(local, nameBytes, data);

    const centralRecord = record(46, (view) => {
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(12, now.time, true);
      view.setUint16(14, now.dosDate, true);
      view.setUint32(16, crc, true);
      view.setUint32(20, data.length, true);
      view.setUint32(24, data.length, true);
      view.setUint16(28, nameBytes.length, true);
      view.setUint32(42, offset, true);
    });
    central.push(centralRecord, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }

  const centralOffset = offset;
  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = record(22, (view) => {
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, files.length, true);
    view.setUint16(10, files.length, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, centralOffset, true);
  });

  const totalLength = chunks.reduce((s, c) => s + c.length, 0) + centralSize + end.length;
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of [...chunks, ...central, end]) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return Buffer.from(result.buffer);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "COORDINATOR", "PROCESSOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { workOrderIds, action, data } = body;

  if (!Array.isArray(workOrderIds) || workOrderIds.length === 0 || !action) {
    return NextResponse.json({ error: "workOrderIds and action are required" }, { status: 400 });
  }

  const userId = (session.user as any).id;
  let updateData: any = {};
  let actionLabel = "";

  switch (action) {
    case "change-status": {
      if (!data?.status) return NextResponse.json({ error: "Status required" }, { status: 400 });
      const validStatuses = ["NEW", "UNASSIGNED", "PENDING", "ASSIGNED", "IN_PROGRESS", "FIELD_COMPLETE", "QC_REVIEW", "PENDING_REVIEW", "READY_FOR_CLIENT", "SENT_TO_CLIENT", "REVISIONS_NEEDED", "OFFICE_COMPLETE", "CLOSED", "CANCELLED", "ASSETS"];
      if (!validStatuses.includes(data.status)) {
        return NextResponse.json({ error: `Invalid status: ${data.status}. Valid: ${validStatuses.join(", ")}` }, { status: 400 });
      }
      updateData = { status: data.status };
      actionLabel = `Status → ${data.status}`;
      break;
    }

    case "change-service-type": {
      if (!data?.serviceType) return NextResponse.json({ error: "Service type required" }, { status: 400 });
      const validTypes = ["GRASS_CUT", "DEBRIS_REMOVAL", "WINTERIZATION", "BOARD_UP", "INSPECTION", "MOLD_REMEDIATION", "OTHER"];
      if (!validTypes.includes(data.serviceType)) {
        return NextResponse.json({ error: `Invalid service type: ${data.serviceType}. Valid: ${validTypes.join(", ")}` }, { status: 400 });
      }
      updateData = { serviceType: data.serviceType };
      actionLabel = `Type → ${data.serviceType}`;
      break;
    }

    case "change-due-date":
      if (!data?.dueDate) return NextResponse.json({ error: "Due date required" }, { status: 400 });
      updateData = { dueDate: new Date(data.dueDate) };
      actionLabel = `Due date → ${data.dueDate}`;
      break;

    case "change-start-date":
      updateData = { metadata: { startDate: data?.startDate || null } };
      actionLabel = `Start date → ${data?.startDate || "cleared"}`;
      break;

    case "change-estimated-date":
      updateData = { metadata: { estimatedDate: data?.estimatedDate || null } };
      actionLabel = `Estimated date → ${data?.estimatedDate || "cleared"}`;
      break;

    case "change-priority":
      updateData = { priority: data?.priority ?? 0 };
      actionLabel = `Priority → ${data?.priority ?? 0}`;
      break;

    case "cancel":
      updateData = { status: "CANCELLED" };
      actionLabel = "Cancelled";
      break;

    case "assign-contractor":
      if (!data?.contractorId) return NextResponse.json({ error: "Contractor ID required" }, { status: 400 });
      updateData = { contractorId: data.contractorId, status: "ASSIGNED" };
      actionLabel = `Contractor assigned`;
      break;

    case "assign-coordinator":
      if (!data?.coordinatorId) return NextResponse.json({ error: "Coordinator ID required" }, { status: 400 });
      updateData = { coordinatorId: data.coordinatorId };
      actionLabel = `Coordinator assigned`;
      break;

    case "assign-processor":
      if (!data?.processorId) return NextResponse.json({ error: "Processor ID required" }, { status: 400 });
      updateData = { processorId: data.processorId };
      actionLabel = `Processor assigned`;
      break;

    case "add-instructions":
      updateData = { specialInstructions: data?.instructions || "" };
      actionLabel = `Instructions updated`;
      break;

    case "modify-comments":
      updateData = { description: data?.description || "" };
      actionLabel = `Comments updated`;
      break;

    case "set-category":
      if (!data?.serviceType) return NextResponse.json({ error: "Category required" }, { status: 400 });
      updateData = { serviceType: data.serviceType };
      actionLabel = `Category → ${data.serviceType}`;
      break;

    case "send-message":
      if (!data?.message) return NextResponse.json({ error: "Message required" }, { status: 400 });
      // Create a thread message for each work order's assigned contractor/coordinator
      for (const woId of workOrderIds) {
        const wo = await prisma.workOrder.findUnique({
          where: { id: woId },
          select: { contractorId: true, coordinatorId: true, processorId: true },
        });
        const recipients = [wo?.contractorId, wo?.coordinatorId, wo?.processorId].filter(Boolean);
        for (const recipientId of recipients) {
          try {
            await prisma.notification.create({
              data: {
                type: "MESSAGE",
                title: "Bulk Message",
                message: data.message,
                userId: recipientId!,
                workOrderId: woId,
              },
            });
          } catch {}
        }
      }
      actionLabel = `Message sent: "${data.message.substring(0, 50)}${data.message.length > 50 ? "..." : ""}"`;

      // Log activity and return early — no work order field update needed
      await prisma.activityLog.createMany({
        data: workOrderIds.map((id: string) => ({
          action: "BULK_SEND_MESSAGE",
          details: actionLabel,
          userId,
          workOrderId: id,
        })),
      });
      return NextResponse.json({ updated: workOrderIds.length });

    case "download-photos": {
      const workOrders = await prisma.workOrder.findMany({
        where: { id: { in: workOrderIds } },
        include: {
          files: true,
        },
      });

      const zipFiles: { name: string; data: Buffer }[] = [];

      for (const wo of workOrders) {
        const counters: { [key: string]: number } = {};
        for (const file of wo.files) {
          if (file.mimeType.startsWith("image/")) {
            const buffer = await getFileBuffer(file.path);
            if (buffer) {
              const category = (file.category || "Photos").toLowerCase();
              let type = "Task";
              let label = wo.title;

              if (category === "bid") {
                type = "Bid";
                label = file.originalName || wo.title;
              } else if (category === "inspection") {
                type = "Inspection";
                label = "Interior Inspection"; // default to interior inspection as requested
              }

              const counterKey = `${type}-${label}-${category}`.toLowerCase();
              counters[counterKey] = (counters[counterKey] || 0) + 1;
              const index = counters[counterKey];

              const cleanLabel = label.replace(/[^a-zA-Z0-9\s]/g, "").toLowerCase().trim().replace(/\s+/g, " ");

              let customName = "";
              if (type.toLowerCase() === "task") {
                if (category === "before" || category === "during" || category === "after") {
                  customName = `task ${cleanLabel} - ${cleanLabel} ${category} ${index}`;
                } else {
                  customName = `task ${cleanLabel} - ${cleanLabel} ${index}`;
                }
              } else if (type.toLowerCase() === "bid") {
                customName = `bid ${cleanLabel} ${index}`;
              } else if (type.toLowerCase() === "inspection") {
                customName = `${cleanLabel} ${index}`;
              } else {
                customName = `${type.toLowerCase()} ${cleanLabel} ${index}`;
              }

              // Keep zip directory structured cleanly
              zipFiles.push({
                name: `${wo.title.replace(/[^a-zA-Z0-9]/g, "_")}/${customName}.jpg`,
                data: buffer,
              });
            }
          }
        }
      }

      if (zipFiles.length === 0) {
        return NextResponse.json({ error: "No photos found for selected work orders" }, { status: 404 });
      }

      const zipBuffer = createStoredZipServer(zipFiles);

      // Log download action in ActivityLog
      await prisma.activityLog.createMany({
        data: workOrderIds.map((id: string) => ({
          action: "BULK_DOWNLOAD_PHOTOS",
          details: `Downloaded ${zipFiles.length} photos`,
          userId,
          workOrderId: id,
        })),
      });

      return new NextResponse(new Uint8Array(zipBuffer), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="work-order-photos-${Date.now()}.zip"`,
        },
      });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  // For metadata merges, we need to handle differently
  if (updateData.metadata) {
    // Fetch current metadata and merge
    const current = await prisma.workOrder.findMany({
      where: { id: { in: workOrderIds } },
      select: { id: true, metadata: true },
    });
    for (const wo of current) {
      const existingMeta = (wo.metadata as any) || {};
      await prisma.workOrder.update({
        where: { id: wo.id },
        data: {
          metadata: { ...existingMeta, ...updateData.metadata },
        },
      });
    }
    // Log activity
    await prisma.activityLog.createMany({
      data: workOrderIds.map((id: string) => ({
        action: `BULK_${action.toUpperCase().replace(/-/g, "_")}`,
        details: actionLabel,
        userId,
        workOrderId: id,
      })),
    });
    return NextResponse.json({ updated: workOrderIds.length });
  }

  const result = await prisma.workOrder.updateMany({
    where: { id: { in: workOrderIds } },
    data: updateData,
  });

  // Log activity
  await prisma.activityLog.createMany({
    data: workOrderIds.map((id: string) => ({
      action: `BULK_${action.toUpperCase().replace(/-/g, "_")}`,
      details: actionLabel,
      userId,
      workOrderId: id,
    })),
  });

  return NextResponse.json({ updated: result.count });
}

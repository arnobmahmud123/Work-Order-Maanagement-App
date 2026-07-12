import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
  const { workOrderIds, action } = body;

  if (!Array.isArray(workOrderIds) || workOrderIds.length === 0 || !action) {
    return NextResponse.json({ error: "workOrderIds and action are required" }, { status: 400 });
  }

  const userId = (session.user as any).id;

  // Find all invoices linked to the selected work orders
  const invoices = await prisma.invoice.findMany({
    where: { workOrderId: { in: workOrderIds } },
  });

  if (invoices.length === 0) {
    return NextResponse.json({ error: "No invoices found for the selected work orders", updated: 0 }, { status: 200 });
  }

  const invoiceIds = invoices.map((inv) => inv.id);
  let updateData: any = {};
  let actionLabel = "";

  switch (action) {
    case "mark-client-invoice-paid":
      updateData = { status: "PAID", paidAt: new Date() };
      actionLabel = "Client invoice marked as paid";
      break;

    case "mark-contractor-invoice-paid":
      // Contractor invoices are tracked via metadata
      for (const woId of workOrderIds) {
        const wo = await prisma.workOrder.findUnique({
          where: { id: woId },
          select: { metadata: true },
        });
        const meta = (wo?.metadata as any) || {};
        const contractorInvoices = meta.contractorInvoices || [];
        for (const inv of contractorInvoices) {
          inv.paid = true;
          inv.paidAt = new Date().toISOString();
        }
        await prisma.workOrder.update({
          where: { id: woId },
          data: {
            metadata: {
              ...meta,
              contractorInvoices,
              contractorInvoicePaid: true,
              contractorInvoicePaidAt: new Date().toISOString(),
            },
          },
        });
      }
      actionLabel = "Contractor invoice marked as paid";
      break;

    case "write-off-invoice":
      updateData = { status: "CANCELLED", notes: "Written off via bulk action" };
      actionLabel = "Invoice written off";
      break;

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  let updatedCount = 0;

  if (Object.keys(updateData).length > 0) {
    const result = await prisma.invoice.updateMany({
      where: { id: { in: invoiceIds } },
      data: updateData,
    });
    updatedCount = result.count;
  } else {
    updatedCount = workOrderIds.length;
  }

  // Log activity
  await prisma.activityLog.createMany({
    data: workOrderIds.map((id: string) => ({
      action: `BULK_INVOICE_${action.toUpperCase().replace(/-/g, "_")}`,
      details: actionLabel,
      userId,
      workOrderId: id,
    })),
  });

  return NextResponse.json({ updated: updatedCount });
}

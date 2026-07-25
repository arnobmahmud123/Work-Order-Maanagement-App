import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { findPairedInvoice, syncInvoiceItemStructure } from "@/lib/invoice-sync";

// PATCH — bulk update invoice items (inline edit save)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["SUPER_ADMIN", "ADMIN", "COORDINATOR", "PROCESSOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const companyId = (session.user as any).companyId;

  // Verify the invoice belongs to this company
  const invoiceObj = await prisma.invoice.findUnique({
    where: { id },
  });
  if (!invoiceObj) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (role !== "SUPER_ADMIN" && invoiceObj.companyId !== companyId) {
    return NextResponse.json({ error: "Forbidden: Invoice belongs to another company" }, { status: 403 });
  }

  const body = await req.json();
  const { items } = body;

  if (!items || !Array.isArray(items)) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  for (const item of items) {
    if (!item.id) continue;
    if (item.id.startsWith("new-")) {
      await prisma.invoiceItem.create({
        data: {
          taskName: item.taskName,
          description: item.description || null,
          unit: item.unit || null,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          discountPercent: Number(item.discountPercent) || 0,
          amount:
            (Number(item.quantity) || 0) *
            (Number(item.unitPrice) || 0) *
            (1 - (Number(item.discountPercent) || 0) / 100),
          invoiceId: id,
        },
      });
    } else {
      await prisma.invoiceItem.update({
        where: { id: item.id },
        data: {
          taskName: item.taskName,
          description: item.description || null,
          unit: item.unit || null,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          discountPercent: Number(item.discountPercent) || 0,
          amount:
            (Number(item.quantity) || 0) *
            (Number(item.unitPrice) || 0) *
            (1 - (Number(item.discountPercent) || 0) / 100),
        },
      });
    }
  }

  // Recalculate totals
  const allItems = await prisma.invoiceItem.findMany({
    where: { invoiceId: id },
  });
  const subtotal = allItems.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0
  );
  const totalDiscount = allItems.reduce(
    (sum, i) =>
      sum + (i.quantity * i.unitPrice * (i.discountPercent || 0)) / 100,
    0
  );
  const inv = await prisma.invoice.findUnique({ where: { id } });
  const total = subtotal - totalDiscount + (inv?.tax || 0);

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      subtotal,
      total: inv?.noCharge ? 0 : total,
    },
    include: { items: true },
  });

  // Sync item structure to paired invoice (client ↔ contractor)
  if (inv?.workOrderId) {
    const paired = await findPairedInvoice(prisma, id, inv.type as "CLIENT" | "CONTRACTOR", inv.workOrderId);
    if (paired) {
      await syncInvoiceItemStructure(prisma, id, paired.id);
    }
  }

  return NextResponse.json(invoice);
}

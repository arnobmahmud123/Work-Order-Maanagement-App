import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { findPairedInvoice, syncInvoiceItemStructure } from "@/lib/invoice-sync";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["SUPER_ADMIN", "ADMIN", "COORDINATOR", "PROCESSOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, itemId } = await params;
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

  // Verify the item belongs to this invoice
  const item = await prisma.invoiceItem.findFirst({
    where: { id: itemId, invoiceId: id },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.delete({ where: { id: itemId } });

    // Recalculate invoice totals
    const remainingItems = await tx.invoiceItem.findMany({
      where: { invoiceId: id },
    });

    const subtotal = remainingItems.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0
    );
    const totalDiscount = remainingItems.reduce(
      (sum, i) => sum + (i.quantity * i.unitPrice * (i.discountPercent || 0)) / 100,
      0
    );
    const invoice = await tx.invoice.findUnique({ where: { id } });
    const total = subtotal - totalDiscount + (invoice?.tax || 0);

    await tx.invoice.update({
      where: { id },
      data: { subtotal, total: invoice?.noCharge ? 0 : total },
    });

    // Sync item structure to paired invoice (client ↔ contractor)
    if (invoice?.workOrderId) {
      const paired = await findPairedInvoice(tx, id, invoice.type as "CLIENT" | "CONTRACTOR", invoice.workOrderId);
      if (paired) {
        await syncInvoiceItemStructure(tx, id, paired.id);
      }
    }
  });

  return NextResponse.json({ success: true });
}

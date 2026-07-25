import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { findPairedInvoice, syncInvoiceItemStructure } from "@/lib/invoice-sync";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const companyId = (session.user as any).companyId;

  const where: any = {};

  if (role === "CLIENT") {
    where.clientId = userId;
  }

  if (role !== "SUPER_ADMIN") {
    if (!companyId) {
      return NextResponse.json({ error: "Forbidden: User has no assigned company tenant context" }, { status: 403 });
    }
    where.companyId = companyId;
  } else {
    const { searchParams } = new URL(req.url);
    const filterCompanyId = searchParams.get("companyId");
    if (filterCompanyId) {
      where.companyId = filterCompanyId;
    }
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, email: true } },
      workOrder: { select: { id: true, title: true, address: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["SUPER_ADMIN", "ADMIN", "COORDINATOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = (session.user as any).companyId;
  if (role !== "SUPER_ADMIN" && !companyId) {
    return NextResponse.json({ error: "Forbidden: User has no assigned company tenant context" }, { status: 403 });
  }

  const body = await req.json();
  const { workOrderId, clientId, items, notes, dueDate, noCharge, tax, type } = body;

  if (!clientId || !items?.length) {
    return NextResponse.json(
      { error: "Client and items are required" },
      { status: 400 }
    );
  }

  // Validate invoice type
  const invoiceType = type === "CONTRACTOR" ? "CONTRACTOR" : "CLIENT";

  const subtotal = items.reduce(
    (sum: number, item: any) => sum + (item.quantity * item.unitPrice),
    0
  );
  const totalDiscount = items.reduce(
    (sum: number, item: any) => sum + (item.quantity * item.unitPrice * (item.discountPercent || 0)) / 100,
    0
  );
  const total = subtotal - totalDiscount + (tax || 0);

  // Generate invoice number
  const count = await prisma.invoice.count();
  const invoiceNumber = `INV-${String(count + 1).padStart(6, "0")}`;

  const targetCompanyId = role === "SUPER_ADMIN" ? (body.companyId || null) : companyId;

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        invoiceNumber,
        type: invoiceType as any,
        workOrderId,
        clientId,
        subtotal,
        tax: tax || 0,
        total: noCharge ? 0 : total,
        noCharge: noCharge || false,
        notes,
        dueDate: dueDate ? new Date(dueDate) : null,
        companyId: targetCompanyId,
        items: {
          create: items.map((item: any) => ({
            taskName: item.taskName,
            description: item.description,
            unit: item.unit || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent || 0,
            amount: (item.quantity * item.unitPrice) * (1 - (item.discountPercent || 0) / 100),
          })),
        },
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        items: true,
      },
    });

    // Sync item structure to paired invoice (client ↔ contractor)
    if (workOrderId) {
      const paired = await findPairedInvoice(created.id, invoiceType, workOrderId);
      if (paired) {
        await syncInvoiceItemStructure(tx, created.id, paired.id);
      }
    }

    return created;
  });

  // Notify the client about the new invoice
  try {
    await prisma.notification.create({
      data: {
        type: "INVOICE",
        title: "New Invoice",
        message: `Invoice ${invoiceNumber} has been created for $${(noCharge ? 0 : total).toFixed(2)}`,
        userId: clientId,
        companyId: targetCompanyId,
      },
    });
  } catch {}

  return NextResponse.json(invoice, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch unbilled Work Orders (Status COMPLETED but no CLIENT invoice)
    const completedWorkOrders = await prisma.workOrder.findMany({
      where: { status: "COMPLETED" },
      include: { invoices: true, property: true }
    });
    const unbilledWorkOrders = completedWorkOrders.filter(wo => !wo.invoices.some(i => i.type === "CLIENT"));

    // Fetch all Client Invoices
    const clientInvoices = await prisma.invoice.findMany({
      where: { type: "CLIENT" },
      include: { workOrder: true, client: true },
      orderBy: { createdAt: "desc" }
    });

    const drafts = clientInvoices.filter(i => i.status === "DRAFT");
    const sent = clientInvoices.filter(i => i.status === "SENT" || i.status === "APPROVED");
    
    // Check if overdue (e.g. dueDate < now and not paid)
    const now = new Date();
    const overdue = clientInvoices.filter(i => 
      i.status !== "PAID" && i.dueDate && new Date(i.dueDate) < now
    );

    return NextResponse.json({
      unbilledWorkOrders,
      drafts,
      sent,
      overdue,
      allInvoices: clientInvoices
    });
  } catch (error) {
    console.error("AR Error:", error);
    return NextResponse.json({ error: "Failed to fetch AR data: " + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}

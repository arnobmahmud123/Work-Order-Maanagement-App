import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch Client Invoices for AR
    const clientInvoices = await prisma.invoice.findMany({
      where: {
        workOrderId: id,
        type: "CLIENT",
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch Contractor Invoices for AP (Labor)
    const contractorInvoices = await prisma.invoice.findMany({
      where: {
        workOrderId: id,
        type: "CONTRACTOR",
      },
      include: {
        items: true,
        client: true, // In prisma schema, clientId relates to User. For CONTRACTOR type, this is the contractor.
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch Bills for AP (Materials/Misc)
    const bills = await prisma.bill.findMany({
      where: {
        workOrderId: id,
      },
      include: {
        items: true,
        vendor: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate AR Total
    const totalAR = clientInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const paidAR = clientInvoices.filter(i => i.status === "PAID").reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Calculate AP (Labor) Total
    const totalLaborAP = contractorInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const paidLaborAP = contractorInvoices.filter(i => i.status === "PAID").reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Calculate AP (Materials) Total
    const totalMaterialsAP = bills.reduce((sum, bill) => sum + (bill.total || 0), 0);
    const paidMaterialsAP = bills.filter(b => b.status === "PAID").reduce((sum, bill) => sum + (bill.total || 0), 0);

    const totalAP = totalLaborAP + totalMaterialsAP;
    const grossMargin = totalAR - totalAP;
    const grossMarginPercent = totalAR > 0 ? (grossMargin / totalAR) * 100 : 0;

    return NextResponse.json({
      clientInvoices,
      contractorInvoices,
      bills,
      summary: {
        totalAR,
        paidAR,
        totalLaborAP,
        paidLaborAP,
        totalMaterialsAP,
        paidMaterialsAP,
        totalAP,
        grossMargin,
        grossMarginPercent,
      }
    });

  } catch (error) {
    console.error("Error fetching work order financials:", error);
    return NextResponse.json(
      { error: "Failed to fetch financials" },
      { status: 500 }
    );
  }
}

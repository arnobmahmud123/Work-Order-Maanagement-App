import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch Contractor Balances (Unpaid)
    const contractorBalances = await prisma.contractorBalance.findMany({
      include: { contractor: true },
      where: { OR: [{ pendingAmount: { gt: 0 } }, { availableBalance: { gt: 0 } }] }
    });

    // Fetch Supplier Bills
    const bills = await prisma.bill.findMany({
      include: { vendor: true, workOrder: true },
      orderBy: { createdAt: "desc" }
    });
    
    const unpaidBills = bills.filter(b => b.status === "OPEN");

    const chargebacks = await prisma.chargeback.findMany({
      include: { contractor: true, workOrder: true },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return NextResponse.json({
      contractorBalances,
      unpaidBills,
      allBills: bills,
      chargebacks
    });
  } catch (error) {
    console.error("AP Error:", error);
    return NextResponse.json({ error: "Failed to fetch AP data" }, { status: 500 });
  }
}

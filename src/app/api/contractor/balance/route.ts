import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calculateContractorMaturityBalance } from "@/lib/contractor-balance-calculator";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const targetContractorId = searchParams.get("contractorId");

  if (role === "ADMIN" && !targetContractorId) {
    // Admin overview: calculate live maturity for all contractors with balances/invoices
    const contractorUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: "CONTRACTOR" },
          { contractorBalance: { isNot: null } },
        ],
      },
      select: { id: true, name: true, email: true, image: true },
    });

    const balances = await Promise.all(
      contractorUsers.map(async (u) => {
        const matBalance = await calculateContractorMaturityBalance(u.id);
        return {
          ...matBalance,
          contractor: u,
        };
      })
    );

    return NextResponse.json({ balances });
  }

  // Contractor sees their own live maturity balance (or admin requesting a specific contractor)
  const contractorIdToQuery = (role === "ADMIN" && targetContractorId) ? targetContractorId : userId;
  const maturityBalance = await calculateContractorMaturityBalance(contractorIdToQuery);

  return NextResponse.json({ balance: maturityBalance });
}

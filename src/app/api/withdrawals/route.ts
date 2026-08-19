import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = {};

  if (role !== "ADMIN") {
    where.contractorId = userId;
  }

  if (status) where.status = status;

  const withdrawals = await prisma.withdrawal.findMany({
    where,
    include: {
      contractor: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ withdrawals });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();
  const { amount, method, paymentDetails } = body;

  if (!amount || !method) {
    return NextResponse.json(
      { error: "Amount and method are required" },
      { status: 400 }
    );
  }

  if (amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be greater than 0" },
      { status: 400 }
    );
  }

  // 30-Day Maturation Check: Calculate real-time available matured balance
  const { calculateContractorMaturityBalance } = await import("@/lib/contractor-balance-calculator");
  const maturityBalance = await calculateContractorMaturityBalance(userId);

  if (maturityBalance.availableBalance < amount) {
    const immatureInfo = maturityBalance.immatureAmount > 0
      ? ` ($${maturityBalance.immatureAmount.toFixed(2)} is currently pending the 30-day holding period)`
      : "";
    return NextResponse.json(
      {
        error: `Insufficient withdrawable balance. You can only withdraw earnings from work orders and invoices approved at least 30 days ago. Current withdrawable balance: $${maturityBalance.availableBalance.toFixed(2)}${immatureInfo}.`,
      },
      { status: 400 }
    );
  }

  // Validate payment details based on method
  const validMethods = ["ACH", "WIRE", "PAYPAL", "ZELLE", "CHECK"];
  if (!validMethods.includes(method)) {
    return NextResponse.json(
      { error: "Invalid payment method" },
      { status: 400 }
    );
  }

  const withdrawal = await prisma.withdrawal.create({
    data: {
      contractorId: userId,
      amount,
      method,
      paymentDetails: paymentDetails || null,
    },
    include: {
      contractor: { select: { id: true, name: true, email: true } },
    },
  });

  // Deduct from available balance and add to pending
  await prisma.contractorBalance.upsert({
    where: { contractorId: userId },
    update: {
      availableBalance: { decrement: amount },
      pendingAmount: { increment: amount },
    },
    create: {
      contractorId: userId,
      totalEarned: maturityBalance.totalEarned,
      availableBalance: Math.max(0, maturityBalance.availableBalance - amount),
      pendingAmount: amount,
    },
  });

  // Create transaction record
  await prisma.balanceTransaction.create({
    data: {
      contractorId: userId,
      type: "WITHDRAWAL",
      amount: -amount,
      description: `Withdrawal request via ${method}`,
      referenceId: withdrawal.id,
      balanceAfter: Math.max(0, maturityBalance.availableBalance - amount),
    },
  });

  return NextResponse.json(withdrawal, { status: 201 });
}

import prisma from "@/lib/prisma";

export const HOLDING_PERIOD_DAYS = 30;
export const HOLDING_PERIOD_MS = HOLDING_PERIOD_DAYS * 24 * 60 * 60 * 1000;

export interface InvoiceMaturityItem {
  id: string;
  invoiceNumber: string;
  type: string;
  workOrderId?: string | null;
  workOrderTitle?: string | null;
  amount: number;
  approvedAt: Date;
  matureDate: Date;
  isMatured: boolean;
  daysRemaining: number;
  status: string;
}

export interface ContractorMaturityBalance {
  contractorId: string;
  contractorName?: string | null;
  contractorEmail?: string | null;
  totalEarned: number;        // All approved earnings
  totalWithdrawn: number;     // All completed withdrawals
  pendingWithdrawn: number;   // Pending withdrawal requests currently processing
  immatureAmount: number;     // Earnings from invoices approved < 30 days ago
  maturedAmount: number;      // Earnings from invoices approved >= 30 days ago
  availableBalance: number;   // Max(0, maturedAmount - totalWithdrawn - pendingWithdrawn)
  daysUntilNextMaturity?: number | null;
  nextMaturityDate?: string | null;
  nextMaturityAmount?: number | null;
  immatureInvoices: InvoiceMaturityItem[];
  maturedInvoices: InvoiceMaturityItem[];
}

/**
 * Calculates a contractor's real-time financial balance enforcing the strict 30-day holding rule.
 * 
 * Rules:
 * 1. An invoice approved < 30 days ago is "Immature / Pending" (funds cannot be withdrawn).
 * 2. An invoice approved >= 30 days ago is "Matured" (funds are available for withdrawal).
 * 3. Available Withdrawable Balance = Matured Earnings - Total Withdrawn - Pending Withdrawals.
 */
export async function calculateContractorMaturityBalance(
  contractorId: string,
  targetDate: Date = new Date()
): Promise<ContractorMaturityBalance> {
  const nowMs = targetDate.getTime();

  // 1. Fetch contractor details
  const contractor = await prisma.user.findUnique({
    where: { id: contractorId },
    select: { id: true, name: true, email: true },
  });

  // 2. Fetch all approved/paid invoices where this user is the contractor
  // Contractor can be linked via invoice.clientId (when type="CONTRACTOR") or invoice.workOrder.contractorId
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ["APPROVED", "PAID"] },
      total: { gt: 0 },
      OR: [
        { clientId: contractorId, type: "CONTRACTOR" },
        { workOrder: { contractorId } },
      ],
    },
    include: {
      workOrder: {
        select: { id: true, title: true, contractorId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Deduplicate in case an invoice matches both conditions
  const uniqueInvoicesMap = new Map<string, typeof invoices[0]>();
  for (const inv of invoices) {
    if (!uniqueInvoicesMap.has(inv.id)) {
      uniqueInvoicesMap.set(inv.id, inv);
    }
  }
  const uniqueInvoices = Array.from(uniqueInvoicesMap.values());

  const immatureInvoices: InvoiceMaturityItem[] = [];
  const maturedInvoices: InvoiceMaturityItem[] = [];

  let totalEarnedFromInvoices = 0;
  let maturedAmount = 0;
  let immatureAmount = 0;

  for (const inv of uniqueInvoices) {
    const amount = inv.total;
    totalEarnedFromInvoices += amount;

    // Determine approval date: prefer approvedAt, fallback to paidAt, then createdAt
    const approvedAt = inv.approvedAt || inv.paidAt || inv.createdAt;
    const approvedMs = new Date(approvedAt).getTime();
    const matureDate = new Date(approvedMs + HOLDING_PERIOD_MS);
    const matureMs = matureDate.getTime();

    const isMatured = nowMs >= matureMs;
    const daysRemaining = isMatured ? 0 : Math.max(1, Math.ceil((matureMs - nowMs) / (24 * 60 * 60 * 1000)));

    const item: InvoiceMaturityItem = {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      type: inv.type,
      workOrderId: inv.workOrderId,
      workOrderTitle: inv.workOrder?.title || null,
      amount,
      approvedAt: new Date(approvedAt),
      matureDate,
      isMatured,
      daysRemaining,
      status: inv.status,
    };

    if (isMatured) {
      maturedAmount += amount;
      maturedInvoices.push(item);
    } else {
      immatureAmount += amount;
      immatureInvoices.push(item);
    }
  }

  // Also check direct credit transactions that might not be linked to an invoice
  const otherCredits = await prisma.balanceTransaction.findMany({
    where: {
      contractorId,
      type: "CREDIT",
      referenceId: { notIn: uniqueInvoices.map((i) => i.id) },
    },
  });

  for (const credit of otherCredits) {
    const amount = credit.amount;
    totalEarnedFromInvoices += amount;
    const creditMs = new Date(credit.createdAt).getTime();
    const matureDate = new Date(creditMs + HOLDING_PERIOD_MS);
    const isMatured = nowMs >= matureDate.getTime();
    const daysRemaining = isMatured ? 0 : Math.max(1, Math.ceil((matureDate.getTime() - nowMs) / (24 * 60 * 60 * 1000)));

    const item: InvoiceMaturityItem = {
      id: credit.id,
      invoiceNumber: credit.description.slice(0, 24),
      type: "ADJUSTMENT",
      amount,
      approvedAt: new Date(credit.createdAt),
      matureDate,
      isMatured,
      daysRemaining,
      status: "APPROVED",
    };

    if (isMatured) {
      maturedAmount += amount;
      maturedInvoices.push(item);
    } else {
      immatureAmount += amount;
      immatureInvoices.push(item);
    }
  }

  // 3. Fetch all withdrawals for this contractor
  const withdrawals = await prisma.withdrawal.findMany({
    where: { contractorId },
  });

  let totalWithdrawn = 0;
  let pendingWithdrawn = 0;

  for (const w of withdrawals) {
    if (w.status === "COMPLETED") {
      totalWithdrawn += w.amount;
    } else if (w.status === "PENDING" || w.status === "PROCESSING") {
      pendingWithdrawn += w.amount;
    }
  }

  // Available Withdrawable Balance = only matured funds minus already withdrawn and pending withdrawals
  const availableBalance = Math.max(0, Math.round((maturedAmount - totalWithdrawn - pendingWithdrawn) * 100) / 100);

  // Find next upcoming maturity release
  immatureInvoices.sort((a, b) => a.matureDate.getTime() - b.matureDate.getTime());
  const nextImmature = immatureInvoices[0];

  return {
    contractorId,
    contractorName: contractor?.name || null,
    contractorEmail: contractor?.email || null,
    totalEarned: Math.round(totalEarnedFromInvoices * 100) / 100,
    totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
    pendingWithdrawn: Math.round(pendingWithdrawn * 100) / 100,
    immatureAmount: Math.round(immatureAmount * 100) / 100,
    maturedAmount: Math.round(maturedAmount * 100) / 100,
    availableBalance,
    daysUntilNextMaturity: nextImmature ? nextImmature.daysRemaining : null,
    nextMaturityDate: nextImmature ? nextImmature.matureDate.toISOString() : null,
    nextMaturityAmount: nextImmature ? nextImmature.amount : null,
    immatureInvoices,
    maturedInvoices,
  };
}

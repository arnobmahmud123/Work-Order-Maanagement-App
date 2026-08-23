import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let companyId = (session.user as any).companyId;
    if (!companyId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: (session.user as any).id },
        select: { companyId: true },
      }).catch(() => null);
      companyId = dbUser?.companyId;
    }

    if (!companyId) {
      const firstCompany = await prisma.company.findFirst({ select: { id: true } }).catch(() => null);
      companyId = firstCompany?.id;
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

    const dateFilter = {
      date: {
        gte: startOfYear,
        lte: endOfYear,
      }
    };

    let transactions = await prisma.financialTransaction.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...dateFilter,
      },
      orderBy: { date: "desc" },
    });

    // If no explicit financial transactions recorded yet, auto-aggregate from Invoices
    if (transactions.length === 0) {
      const invoices = await prisma.invoice.findMany({
        where: {
          createdAt: {
            gte: startOfYear,
            lte: endOfYear,
          },
        },
        include: { items: true },
      });

      if (invoices.length > 0) {
        const generatedTxs: any[] = [];
        for (const inv of invoices) {
          const isContractor = inv.type === "CONTRACTOR";
          const txDate = inv.createdAt || new Date();

          if (isContractor) {
            generatedTxs.push({
              id: `tx-inv-${inv.id}`,
              type: "EXPENSE",
              category: "CONTRACTOR_PAYMENT",
              amount: inv.total || 0,
              date: txDate.toISOString(),
              description: `Contractor Invoice ${inv.invoiceNumber || ""}`,
            });
          } else {
            generatedTxs.push({
              id: `tx-inv-${inv.id}`,
              type: "INCOME",
              category: "WORK_ORDER_REVENUE",
              amount: inv.total || 0,
              date: txDate.toISOString(),
              description: `Client Invoice ${inv.invoiceNumber || ""}`,
            });
          }
        }
        return NextResponse.json(generatedTxs);
      }
    }

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error("Failed to fetch transactions:", error);
    return NextResponse.json([], { status: 200 }); // Return empty array instead of 500 so UI doesn't crash
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let companyId = (session.user as any).companyId;
    if (!companyId) {
      const firstCompany = await prisma.company.findFirst({ select: { id: true } }).catch(() => null);
      companyId = firstCompany?.id;
    }

    const body = await req.json();
    const { type, category, amount, date, description, referenceId } = body;

    if (!type || !category || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const transaction = await prisma.financialTransaction.create({
      data: {
        companyId: companyId || "default-company",
        type,
        category,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        description,
        referenceId,
      },
    });

    return NextResponse.json({ success: true, transaction });
  } catch (error: any) {
    console.error("Failed to create transaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

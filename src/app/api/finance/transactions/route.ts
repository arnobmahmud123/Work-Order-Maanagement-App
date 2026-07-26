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

    const companyId = (session.user as any).companyId;
    if (!companyId) {
      return NextResponse.json({ error: "No company associated with user" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");

    let dateFilter = {};
    if (year) {
      const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59Z`);
      dateFilter = {
        date: {
          gte: startOfYear,
          lte: endOfYear,
        }
      };
    }

    const transactions = await prisma.financialTransaction.findMany({
      where: {
        companyId,
        ...dateFilter
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error("Failed to fetch transactions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    const companyId = (session.user as any).companyId;
    if (!companyId) {
      return NextResponse.json({ error: "No company associated with user" }, { status: 400 });
    }

    const body = await req.json();
    const { type, category, amount, date, description, referenceId } = body;

    if (!type || !category || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const transaction = await prisma.financialTransaction.create({
      data: {
        companyId,
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

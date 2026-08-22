import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DEFAULT_URGENCY_KEYWORDS } from "@/lib/automation/seed-rules";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId || undefined;

    let keywords = await prisma.urgencyKeyword.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { keyword: "asc" },
    });

    if (keywords.length === 0) {
      for (const kw of DEFAULT_URGENCY_KEYWORDS) {
        await prisma.urgencyKeyword.upsert({
          where: { keyword: kw.keyword },
          update: {},
          create: {
            keyword: kw.keyword,
            targetPriority: kw.targetPriority,
            category: kw.category,
            isActive: true,
            companyId: companyId || null,
          },
        });
      }
      keywords = await prisma.urgencyKeyword.findMany({
        where: companyId ? { companyId } : {},
        orderBy: { keyword: "asc" },
      });
    }

    return NextResponse.json({ keywords });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch keywords", details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();
    const { keyword, targetPriority, category, isActive } = body;

    if (!keyword?.trim()) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
    }

    const companyId = (session.user as any).companyId || null;

    const created = await prisma.urgencyKeyword.upsert({
      where: { keyword: keyword.trim() },
      update: {
        targetPriority: targetPriority || "URGENT",
        category: category || "general",
        isActive: isActive !== undefined ? isActive : true,
      },
      create: {
        keyword: keyword.trim(),
        targetPriority: targetPriority || "URGENT",
        category: category || "general",
        isActive: isActive !== undefined ? isActive : true,
        companyId,
      },
    });

    return NextResponse.json({ keyword: created });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to save keyword", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing keyword ID" }, { status: 400 });
    }

    await prisma.urgencyKeyword.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Keyword deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete keyword", details: error.message }, { status: 500 });
  }
}

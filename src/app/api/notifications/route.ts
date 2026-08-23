import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const email = (session.user as any).email;
    const role = (session.user as any).role;
    const companyId = (session.user as any).companyId;
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role);

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const userFilters: any[] = [];
    if (userId) userFilters.push({ userId });
    if (email) userFilters.push({ userId: email });
    if (isAdmin) {
      userFilters.push({ userId: "admin" }, { userId: "all_admins" });
      if (companyId) userFilters.push({ companyId });
    }

    const where: any = userFilters.length > 0 ? { OR: userFilters } : {};
    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        workOrder: { select: { id: true, title: true, address: true } },
        ticket: { select: { id: true, subject: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        ...where,
        isRead: false,
      },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

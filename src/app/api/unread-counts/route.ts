import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
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

    // Chat unread
    let chatUnread = 0;
    try {
      const channelMembers = await prisma.channelMember.findMany({
        where: { userId },
        select: { channelId: true, lastReadAt: true },
      });

      for (const cm of channelMembers) {
        const where: any = { channelId: cm.channelId, authorId: { not: userId } };
        if (cm.lastReadAt) {
          where.createdAt = { gt: cm.lastReadAt };
        }
        const count = await prisma.chatMessage.count({ where });
        chatUnread += count;
      }
    } catch {}

    // Notification unread — synchronized filter with notifications route
    const userFilters: any[] = [];
    if (userId) userFilters.push({ userId });
    if (email) userFilters.push({ userId: email });
    if (isAdmin) {
      userFilters.push({ userId: "admin" }, { userId: "all_admins" });
      if (companyId) userFilters.push({ companyId });
    }

    let notifUnread = 0;
    try {
      notifUnread = await prisma.notification.count({
        where: {
          ...(userFilters.length > 0 ? { OR: userFilters } : {}),
          isRead: false,
        },
      });
    } catch {}

    return NextResponse.json({
      chat: chatUnread,
      email: 0,
      notifications: notifUnread,
    });
  } catch (error: any) {
    return NextResponse.json({ chat: 0, email: 0, notifications: 0 });
  }
}

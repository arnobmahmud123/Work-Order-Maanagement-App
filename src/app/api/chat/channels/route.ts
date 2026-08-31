import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const userCompanyId = (session.user as any).companyId || null;
  const userRole = (session.user as any).role;
  const isContractor = userRole === "CONTRACTOR";

  // Single query: get channels with members, last message, and counts
  const channels = await prisma.channel.findMany({
    where: {
      isArchived: false,
      OR: isContractor
        ? [
            // Contractors only see GENERAL announcements or channels/DMs they are an explicit member of
            { type: "GENERAL" },
            { members: { some: { userId } } },
          ]
        : [
            // Staff and Admins see general, work orders, and all company/platform custom channels
            {
              type: { in: ["GENERAL", "WORK_ORDERS", "CUSTOM"] },
              OR: [
                { companyId: null },
                ...(userCompanyId ? [{ companyId: userCompanyId }] : []),
              ],
            },
            { members: { some: { userId } } },
            ...(userRole === "SUPER_ADMIN" ? [{ type: { not: "DIRECT_MESSAGE" } }] : []),
          ],
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true, role: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
          authorId: true,
          author: { select: { id: true, name: true, image: true } },
        },
      },
      _count: { select: { messages: true, members: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Batch unread counts: single query for all channels at once
  const userMemberships = await prisma.channelMember.findMany({
    where: { userId },
    select: { channelId: true, lastReadAt: true },
  });

  const membershipMap = new Map(
    userMemberships.map((m) => [m.channelId, m.lastReadAt])
  );

  // Get unread counts in a single grouped query
  const channelIds = channels.map((c) => c.id);
  const unreadCountsRaw = channelIds.length > 0
    ? await prisma.chatMessage.groupBy({
        by: ["channelId"],
        where: {
          channelId: { in: channelIds },
          authorId: { not: userId },
          // For channels with lastReadAt, count messages after that time
          // For channels without membership (GENERAL/WORK_ORDERS), count all
        },
        _count: { id: true },
      })
    : [];

  // Also get counts filtered by lastReadAt for each channel
  const unreadMap = new Map<string, number>();

  // For channels where user has membership with lastReadAt
  for (const ch of channels) {
    const lastRead = membershipMap.get(ch.id);
    if (lastRead) {
      // Count messages after lastRead
      const count = await prisma.chatMessage.count({
        where: {
          channelId: ch.id,
          authorId: { not: userId },
          createdAt: { gt: lastRead },
        },
      });
      unreadMap.set(ch.id, count);
    } else {
      // No membership or no lastReadAt - show total count for GENERAL/WORK_ORDERS
      if (ch.type === "GENERAL" || ch.type === "WORK_ORDERS") {
        const total = unreadCountsRaw.find((u) => u.channelId === ch.id);
        unreadMap.set(ch.id, total?._count?.id || 0);
      } else {
        unreadMap.set(ch.id, 0);
      }
    }
  }

  // Batch fetch work order photos for WORK_ORDERS channels
  const woChannels = channels.filter(c => c.type === "WORK_ORDERS");
  const woIds = woChannels.map(c => {
    const cuidMatch = (c.name || "").match(/(wo_[a-z0-9_]+)|([a-z0-9]{24,})/i) || (c.description || "").match(/(wo_[a-z0-9_]+)|([a-z0-9]{24,})/i);
    return cuidMatch ? cuidMatch[0] : null;
  }).filter(Boolean) as string[];

  const workOrders = woIds.length > 0 
    ? await prisma.workOrder.findMany({
        where: { id: { in: woIds } },
        select: { id: true, property: { select: { imageUrl: true } } }
      })
    : [];

  const woPhotoMap = new Map(workOrders.map(wo => [wo.id, wo.property?.imageUrl]));

  const result = channels
    .filter(channel => !(channel.type === "WORK_ORDERS" && channel._count.messages === 0))
    .map((channel) => {
      let image = null;
      if (channel.type === "WORK_ORDERS") {
        const cuidMatch = (channel.name || "").match(/(wo_[a-z0-9_]+)|([a-z0-9]{24,})/i) || (channel.description || "").match(/(wo_[a-z0-9_]+)|([a-z0-9]{24,})/i);
        if (cuidMatch) image = woPhotoMap.get(cuidMatch[0]);
      }

      return {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        type: channel.type,
        isArchived: channel.isArchived,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt,
        members: channel.members,
        lastMessage: channel.messages[0] || null,
        messageCount: channel._count.messages,
        unreadCount: unreadMap.get(channel.id) || 0,
        image,
        imageUrl: channel.imageUrl,
      };
    })
    .sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.updatedAt).getTime();
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });

  return NextResponse.json({ channels: result });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId = (session.user as any).id;
    const userEmail = session.user.email ? session.user.email.toLowerCase().trim() : null;
    let userRole = (session.user as any).role;

    // 1. Locate or self-heal creator User record in DB to prevent foreign key errors
    let dbUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    if (!dbUser && userEmail) {
      dbUser = await prisma.user.findUnique({ where: { email: userEmail } });
      if (dbUser) {
        userId = dbUser.id;
        userRole = dbUser.role || userRole;
      }
    }

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          id: userId || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          email: userEmail || `user_${Date.now()}@proppreserve.com`,
          name: session.user.name || "User",
          role: userRole || "ADMIN",
          isActive: true,
        },
      });
      userId = dbUser.id;
      userRole = dbUser.role || userRole;
    }

    const body = await req.json();
    const { name, description, type = "CUSTOM", memberIds, recipientId, workOrderId } = body;

    // Consolidate memberIds if recipientId is passed
    const memberIdSet = new Set<string>();
    if (memberIds && Array.isArray(memberIds)) {
      for (const mId of memberIds) {
        if (mId && typeof mId === "string" && mId.trim() !== "" && mId.trim() !== userId) {
          memberIdSet.add(mId.trim());
        }
      }
    }
    if (recipientId && typeof recipientId === "string" && recipientId.trim() !== "" && recipientId.trim() !== userId) {
      memberIdSet.add(recipientId.trim());
    }

    const effectiveRole = dbUser.role || userRole || "CLIENT";
    // Contractors can create DIRECT_MESSAGE channels and WORK_ORDERS discussions, but cannot create arbitrary public channels
    if (effectiveRole === "CONTRACTOR" && type !== "DIRECT_MESSAGE" && type !== "WORK_ORDERS") {
      return NextResponse.json(
        { error: "Forbidden - Contractors can only create direct messages or work order discussions" },
        { status: 403 }
      );
    }

    let channelName = (name || "").trim();
    if (!channelName) {
      if (type === "DIRECT_MESSAGE") {
        channelName = "Direct Message";
      } else if (workOrderId) {
        channelName = `wo-${workOrderId.slice(-8)}`;
      } else {
        channelName = `channel-${Date.now()}`;
      }
    }

    if (type !== "DIRECT_MESSAGE") {
      channelName = channelName.toLowerCase().replace(/^[#\s]+/, "").replace(/\s+/g, "-");
    }

    if (!channelName) {
      channelName = `channel-${Date.now()}`;
    }

    // 2. Validate and fallback companyId if not found in database
    let companyId: string | null = dbUser.companyId || (session.user as any).companyId || null;
    if (companyId && typeof companyId === "string" && companyId.trim() !== "" && companyId !== "null" && companyId !== "undefined") {
      const companyExists = await prisma.company.findUnique({ where: { id: companyId.trim() } });
      companyId = companyExists ? companyExists.id : null;
    } else {
      companyId = null;
    }

    // 3. Build validated members list
    const membersToCreate = [{ userId, role: "ADMIN" }];
    for (const mId of memberIdSet) {
      const mExists = await prisma.user.findUnique({ where: { id: mId } });
      if (mExists) {
        membersToCreate.push({ userId: mExists.id, role: "MEMBER" });
      }
    }

    // 4. Check if a DIRECT_MESSAGE channel between these users already exists
    if (type === "DIRECT_MESSAGE" && memberIdSet.size > 0) {
      const otherUserId = Array.from(memberIdSet)[0];
      const existingDM = await prisma.channel.findFirst({
        where: {
          type: "DIRECT_MESSAGE",
          AND: [
            { members: { some: { userId } } },
            { members: { some: { userId: otherUserId } } },
          ],
        },
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
          },
          _count: { select: { messages: true, members: true } },
        },
      });

      if (existingDM) {
        return NextResponse.json(existingDM, { status: 200 });
      }
    }

    // 5. Check if channel already exists with this name for this company
    const existingChannel = await prisma.channel.findFirst({
      where: {
        name: channelName,
        ...(companyId ? { companyId } : { companyId: null }),
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
        },
        _count: { select: { messages: true, members: true } },
      },
    });

    if (existingChannel) {
      // Ensure all requested members are added
      for (const m of membersToCreate) {
        const hasMem = existingChannel.members.some((em: any) => em.userId === m.userId);
        if (!hasMem) {
          await prisma.channelMember.upsert({
            where: { channelId_userId: { channelId: existingChannel.id, userId: m.userId } },
            create: { channelId: existingChannel.id, userId: m.userId, role: m.role },
            update: {},
          });
        }
      }

      const refreshed = await prisma.channel.findUnique({
        where: { id: existingChannel.id },
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
          },
          _count: { select: { messages: true, members: true } },
        },
      });

      return NextResponse.json(refreshed || existingChannel, { status: 200 });
    }

    // 6. Create channel record
    const channel = await prisma.channel.create({
      data: {
        name: channelName,
        description: description ? description.trim() : null,
        type: type || "CUSTOM",
        createdById: userId,
        companyId: companyId || null,
      },
    });

    // 7. Add validated members safely
    for (const member of membersToCreate) {
      try {
        await prisma.channelMember.upsert({
          where: {
            channelId_userId: {
              channelId: channel.id,
              userId: member.userId,
            },
          },
          create: {
            channelId: channel.id,
            userId: member.userId,
            role: member.role,
          },
          update: {
            role: member.role,
          },
        });
      } catch (memberErr) {
        console.warn(`[POST /api/chat/channels] Member add warning for ${member.userId}:`, memberErr);
      }
    }

    const fullChannel = await prisma.channel.findUnique({
      where: { id: channel.id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
        },
        _count: { select: { messages: true, members: true } },
      },
    });

    return NextResponse.json(fullChannel || channel, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/chat/channels] Error creating channel:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create channel" },
      { status: 500 }
    );
  }
}

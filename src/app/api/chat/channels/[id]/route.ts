import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const channel = await prisma.channel.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      type: true,
      isArchived: true,
      createdAt: true,
      updatedAt: true,
      members: {
        select: {
          id: true,
          userId: true,
          role: true,
          lastReadAt: true,
          user: { select: { id: true, name: true, email: true, image: true, role: true, isActive: true } },
        },
      },
      _count: { select: { messages: true, members: true } },
    },
  });

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  return NextResponse.json(channel);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;
  const { id } = await params;
  const body = await req.json();

  if (body.markRead) {
    const lastMsg = await prisma.chatMessage.findFirst({
      where: { channelId: id },
      orderBy: { createdAt: "desc" }
    });
    
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: id, userId } },
      create: {
        channelId: id,
        userId,
        role: "MEMBER",
        lastReadAt: lastMsg ? lastMsg.createdAt : new Date(),
      },
      update: {
        lastReadAt: lastMsg ? lastMsg.createdAt : new Date(),
      },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "leave") {
    await prisma.channelMember.deleteMany({
      where: { channelId: id, userId },
    });
    return NextResponse.json({ success: true });
  }

  // All other actions (modifying channel, inviting, removing, changing photo) are forbidden for contractors
  if (userRole === "CONTRACTOR") {
    return NextResponse.json(
      { error: "Forbidden - Contractors cannot modify channel settings" },
      { status: 403 }
    );
  }

  if (body.action === "invite" && body.userId) {
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: id, userId: body.userId } },
      create: {
        channelId: id,
        userId: body.userId,
        role: "MEMBER",
      },
      update: {},
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "remove" && body.userId) {
    await prisma.channelMember.deleteMany({
      where: { channelId: id, userId: body.userId },
    });
    return NextResponse.json({ success: true });
  }

  let updateData: any = {};

  if (body.action === "updatePhoto" && body.imageUrl !== undefined) {
    updateData.imageUrl = body.imageUrl;
  } else {
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isArchived !== undefined) updateData.isArchived = body.isArchived;
  }

  const channel = await prisma.channel.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, description: true, type: true, imageUrl: true },
  });

  return NextResponse.json(channel);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admins only" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.channel.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

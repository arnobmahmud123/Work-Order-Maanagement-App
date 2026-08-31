import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const roleFilter = searchParams.get("role") || "";

    const where: any = {
      isActive: true,
    };

    if (roleFilter && roleFilter !== "ALL") {
      where.role = roleFilter;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { company: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        company: true,
        image: true,
        _count: {
          select: {
            assignedWorkOrders: true,
            coordinatedWorkOrders: true,
          },
        },
      },
      orderBy: [
        { name: "asc" },
        { email: "asc" },
      ],
      take: 50,
    });

    const contacts = users.map((u) => ({
      id: u.id,
      name: u.name || u.email.split("@")[0],
      email: u.email,
      phone: u.phone || "",
      role: u.role,
      company: u.company || "",
      image: u.image || null,
      activeOrdersCount: u.role === "CONTRACTOR" 
        ? u._count.assignedWorkOrders 
        : u._count.coordinatedWorkOrders,
    }));

    return NextResponse.json({ contacts });
  } catch (error: any) {
    console.error("Failed to load contractor directory:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load directory" },
      { status: 500 }
    );
  }
}

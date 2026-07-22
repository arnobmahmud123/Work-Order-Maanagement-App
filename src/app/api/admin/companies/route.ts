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
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Super Admins only" }, { status: 403 });
    }

    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: {
            users: true,
            workOrders: true,
            FileUpload: true,
            leads: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ companies });
  } catch (error: any) {
    console.error("[API Companies GET] Error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Super Admins only" }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, plan, maxUsers, maxVendors, maxWorkOrders, maxStorage, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    const updatedCompany = await prisma.company.update({
      where: { id },
      data: {
        name,
        plan,
        maxUsers: maxUsers !== undefined ? Number(maxUsers) : undefined,
        maxVendors: maxVendors !== undefined ? Number(maxVendors) : undefined,
        maxWorkOrders: maxWorkOrders !== undefined ? Number(maxWorkOrders) : undefined,
        maxStorage: maxStorage !== undefined ? Number(maxStorage) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return NextResponse.json(updatedCompany);
  } catch (error: any) {
    console.error("[API Companies PUT] Error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

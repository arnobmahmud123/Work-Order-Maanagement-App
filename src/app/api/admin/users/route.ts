import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hashSync } from "bcrypt-edge";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const search = searchParams.get("search");

  const where: any = {};
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      company: true,
      phone: true,
      isActive: true,
      createdAt: true,
      image: true,
      _count: {
        select: {
          assignedWorkOrders: true,
          supportTickets: true,
          messages: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, role, isActive, name, email, phone, company } = body;

  if (!id) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  const updateData: any = {};
  if (role !== undefined) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (company !== undefined) updateData.company = company;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  // Don't let admins delete themselves
  if (id === (session.user as any).id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserRole = (session.user as any).role;
    if (!["ADMIN", "SUPER_ADMIN"].includes(currentUserRole)) {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    const body = await req.json();
    const { name, email, password, role, phone, company } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already in use (bypass tenant block for global uniqueness check)
    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail, bypassTenant: true } as any,
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Verify Subscription Limits
    if (currentUserRole !== "SUPER_ADMIN" && companyId) {
      const activeCompany = await prisma.company.findUnique({
        where: { id: companyId },
      });
      if (activeCompany) {
        const activeUserCount = await prisma.user.count({
          where: { companyId },
        });
        if (activeUserCount >= activeCompany.maxUsers) {
          return NextResponse.json(
            { error: `User limit reached (${activeCompany.maxUsers}). Please upgrade your subscription plan.` },
            { status: 403 }
          );
        }
      }
    }

    const targetCompanyId = currentUserRole === "SUPER_ADMIN" ? (body.companyId || null) : companyId;
    const hashedPassword = hashSync(password, 8);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        hashedPassword,
        role: role || "CLIENT",
        phone: phone || null,
        company: company || null,
        companyId: targetCompanyId,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        companyId: newUser.companyId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

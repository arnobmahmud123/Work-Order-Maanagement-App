import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hashSync } from "bcrypt-edge";
import { getPlanConfig, getMaxUsersForPlan } from "@/lib/plans";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const search = searchParams.get("search");
    const status = searchParams.get("status"); // active, inactive
    const withQuota = searchParams.get("withQuota") === "true";

    const where: any = {};
    if (role && role !== "ALL") where.role = role;
    if (status === "ACTIVE") where.isActive = true;
    if (status === "INACTIVE") where.isActive = false;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
        { phone: { contains: search } },
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

    const userRole = (session.user as any).role;
    const companyId = (session.user as any).companyId;
    let activeCompany = null;
    if (companyId) {
      activeCompany = await prisma.company.findUnique({
        where: { id: companyId },
      });
    }

    const planConfig = getPlanConfig(activeCompany?.plan);
    const planName = planConfig.name.toUpperCase();
    const maxAllowed = userRole === "SUPER_ADMIN" ? 10000 : getMaxUsersForPlan(activeCompany?.plan, activeCompany?.maxUsers);
    const currentCount = await prisma.user.count({
      where: companyId && userRole !== "SUPER_ADMIN" ? { companyId } : {},
    });

    const quota = {
      currentCount,
      maxAllowed,
      planName,
      remaining: Math.max(0, maxAllowed - currentCount),
      isLimitReached: currentCount >= maxAllowed,
    };

    if (withQuota) {
      return NextResponse.json({ users, quota });
    }

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("[API Users GET] Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserRole = (session.user as any).role;
    if (!["ADMIN", "SUPER_ADMIN"].includes(currentUserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, role, isActive, name, email, phone, company, password } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone;
    if (company !== undefined) updateData.company = company;
    if (password && password.trim().length >= 6) {
      updateData.hashedPassword = hashSync(password.trim(), 8);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("[API Users PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserRole = (session.user as any).role;
    if (!["ADMIN", "SUPER_ADMIN"].includes(currentUserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (id === (session.user as any).id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API Users DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
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

    // Check if email already in use
    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail, bypassTenant: true } as any,
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Verify Subscription Plan Limits
    if (currentUserRole !== "SUPER_ADMIN") {
      let activeCompany = null;
      if (companyId) {
        activeCompany = await prisma.company.findUnique({
          where: { id: companyId },
        });
      }

      const planConfig = getPlanConfig(activeCompany?.plan);
      const planName = planConfig.name.toUpperCase();
      const maxAllowed = getMaxUsersForPlan(activeCompany?.plan, activeCompany?.maxUsers);

      const activeUserCount = await prisma.user.count({
        where: companyId ? { companyId } : {},
      });

      if (activeUserCount >= maxAllowed) {
        return NextResponse.json(
          {
            error: `User limit reached (${activeUserCount}/${maxAllowed} for ${planName} Plan). Please upgrade your subscription plan to add more users.`,
            currentCount: activeUserCount,
            maxAllowed,
            plan: planName,
          },
          { status: 403 }
        );
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
        isActive: true,
        ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
      },
    });

    return NextResponse.json(newUser);
  } catch (error: any) {
    console.error("[API Users POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}

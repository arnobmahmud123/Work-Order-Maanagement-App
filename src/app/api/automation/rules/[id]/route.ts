import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, context: any) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = context?.params ? await context.params : null;
    const id = resolvedParams?.id || new URL(req.url).pathname.split("/").slice(-1)[0];

    const rule = await prisma.automationRule.findUnique({ where: { id } });
    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({
      rule: {
        ...rule,
        conditions: typeof rule.conditions === "string" ? JSON.parse(rule.conditions) : rule.conditions,
        actions: typeof rule.actions === "string" ? JSON.parse(rule.actions) : rule.actions,
        escalationChain: typeof rule.escalationChain === "string" ? JSON.parse(rule.escalationChain || "[]") : rule.escalationChain,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch rule", details: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: any) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const resolvedParams = context?.params ? await context.params : null;
    const id = resolvedParams?.id || new URL(req.url).pathname.split("/").slice(-1)[0];

    const body = await req.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.trigger !== undefined) updateData.trigger = body.trigger;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.delayMinutes !== undefined) updateData.delayMinutes = body.delayMinutes;
    if (body.clientSpecific !== undefined) updateData.clientSpecific = body.clientSpecific;
    if (body.serviceTypeSpecific !== undefined) updateData.serviceTypeSpecific = body.serviceTypeSpecific;

    if (body.conditions !== undefined) {
      updateData.conditions = typeof body.conditions === "string" ? body.conditions : JSON.stringify(body.conditions);
    }
    if (body.actions !== undefined) {
      updateData.actions = typeof body.actions === "string" ? body.actions : JSON.stringify(body.actions);
    }
    if (body.escalationChain !== undefined) {
      updateData.escalationChain = typeof body.escalationChain === "string" ? body.escalationChain : JSON.stringify(body.escalationChain);
    }

    const updated = await prisma.automationRule.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      rule: {
        ...updated,
        conditions: JSON.parse(updated.conditions),
        actions: JSON.parse(updated.actions),
        escalationChain: JSON.parse(updated.escalationChain || "[]"),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update rule", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: any) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const resolvedParams = context?.params ? await context.params : null;
    const id = resolvedParams?.id || new URL(req.url).pathname.split("/").slice(-1)[0];

    await prisma.automationRule.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Rule deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete rule", details: error.message }, { status: 500 });
  }
}

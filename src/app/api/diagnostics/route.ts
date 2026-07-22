import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admins only" }, { status: 403 });
  }

  const { env } = getCloudflareContext();
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      has_D1: !!env?.DB,
      AUTH_SECRET: env?.AUTH_SECRET ? "SET" : "NOT SET",
      NEXTAUTH_SECRET: env?.NEXTAUTH_SECRET ? "SET" : "NOT SET",
      NODE_ENV: process.env.NODE_ENV,
    },
  };

  // Test database connection (Raw D1)
  try {
    if (!env?.DB) {
      throw new Error("env.DB is not defined");
    }
    const result = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first<any>();
    const users = await env.DB.prepare("SELECT id, email, name, role FROM users LIMIT 5").all();
    diagnostics.database = {
      status: "connected",
      userCount: result?.count || 0,
      sampleUsers: users?.results || [],
    };
  } catch (error: any) {
    diagnostics.database = {
      status: "error",
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 5),
    };
  }

  // Test Prisma Client Integration
  try {
    const workOrderCount = await prisma.workOrder.count();
    const propertyCount = await prisma.property.count();
    const sampleWorkOrders = await prisma.workOrder.findMany({
      take: 2,
      select: { id: true, title: true, status: true }
    });
    diagnostics.prisma = {
      status: "ok",
      workOrderCount,
      propertyCount,
      sampleWorkOrders,
    };
  } catch (error: any) {
    diagnostics.prisma = {
      status: "error",
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 5),
    };
  }

  // Test bcrypt-edge
  try {
    const { hashSync, compareSync } = await import("bcrypt-edge");
    const hash = hashSync("test", 8);
    const valid = compareSync("test", hash);
    diagnostics.bcrypt = { status: "ok", valid };
  } catch (error: any) {
    diagnostics.bcrypt = {
      status: "error",
      message: error.message,
    };
  }

  return NextResponse.json(diagnostics, { status: 200 });
}

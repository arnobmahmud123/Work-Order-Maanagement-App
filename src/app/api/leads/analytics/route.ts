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
    if (role === "CONTRACTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      totalLeads,
      verifiedLeads,
      convertedLeads,
      newLeads,
      recentlyAdded
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { verificationScore: { gte: 80 } } }),
      prisma.lead.count({ where: { status: "CONVERTED" } }),
      prisma.lead.count({ where: { status: "NEW" } }),
      prisma.lead.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)) // Last 7 days
          }
        }
      })
    ]);

    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    return NextResponse.json({
      totalLeads,
      verifiedLeads,
      convertedLeads,
      newLeads,
      conversionRate,
      recentlyAdded
    });
  } catch (error) {
    console.error("Error fetching lead analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

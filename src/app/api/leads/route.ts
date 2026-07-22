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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const query = searchParams.get("q") || "";
    const status = searchParams.get("status") || "";
    const state = searchParams.get("state") || "";
    const businessType = searchParams.get("businessType") || "";

    const where: any = {};
    const andConditions: any[] = [];

    if (query) {
      andConditions.push({
        OR: [
          { companyName: { contains: query } },
          { contactName: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
          { city: { contains: query } },
          { zipCode: { contains: query } },
          { businessType: { contains: query } },
        ]
      });
    }

    if (status) {
      andConditions.push({ status });
    }
    
    if (state) {
      andConditions.push({
        OR: [
          { state: { contains: state } },
          { city: { contains: state } }
        ]
      });
    }
    
    if (businessType) {
      andConditions.push({ businessType });
    }

    const companyId = (session.user as any).companyId;
    
    if (role !== "SUPER_ADMIN") {
      if (!companyId) {
        return NextResponse.json({ error: "Forbidden: User has no assigned company tenant context" }, { status: 403 });
      }
      andConditions.push({ companyId });
    } else {
      const filterCompanyId = searchParams.get("companyId");
      if (filterCompanyId) {
        andConditions.push({ companyId: filterCompanyId });
      }
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const displayLimit = Math.min(limit, 100);

    let [dbLeads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: [
          { verificationScore: "desc" },
          { dealValue: "desc" }
        ],
        skip,
        take: displayLimit,
        include: {
          tags: true,
          _count: {
            select: { activities: true, notes: true }
          }
        }
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({
      leads: dbLeads,
      total,
      page,
      totalPages: Math.ceil(total / displayLimit)
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const role = (session.user as any).role;
    if (role === "CONTRACTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    if (role !== "SUPER_ADMIN" && !companyId) {
      return NextResponse.json({ error: "Forbidden: User has no assigned company tenant context" }, { status: 403 });
    }

    const body = await req.json();
    const targetCompanyId = role === "SUPER_ADMIN" ? (body.companyId || null) : companyId;
    
    const newLead = await prisma.lead.create({
      data: {
        companyName: body.companyName,
        contactName: body.contactName,
        businessType: body.businessType || "General Contractor",
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        phone: body.phone,
        email: body.email,
        website: body.website,
        source: body.source || "Manual Entry",
        status: body.status || "NEW",
        verificationScore: body.verificationScore || 0,
        companyId: targetCompanyId,
      }
    });

    await prisma.leadActivity.create({
      data: {
        leadId: newLead.id,
        type: "STATUS_CHANGE",
        content: "Lead created manually",
        authorId: session.user.id,
        authorName: session.user.name || "System"
      }
    });

    return NextResponse.json(newLead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

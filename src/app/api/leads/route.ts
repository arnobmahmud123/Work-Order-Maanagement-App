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
    
    if (query) {
      where.OR = [
        { companyName: { contains: query } },
        { contactName: { contains: query } },
        { email: { contains: query } },
        { phone: { contains: query } },
        { city: { contains: query } },
        { zipCode: { contains: query } },
        { businessType: { contains: query } },
      ];
    }

    if (status) {
      where.status = status;
    }
    
    if (state) {
      where.OR = [
        ...(where.OR || []),
        { state: { contains: state } },
        { city: { contains: state } }
      ];
    }
    
    if (businessType) {
      where.businessType = businessType;
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
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
      leads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
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

    const body = await req.json();
    
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

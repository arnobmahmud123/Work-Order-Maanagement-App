import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) {
      return NextResponse.json({ error: "No company associated with user" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        twilioPhone: true,
        twilioSid: true,
        twilioToken: true,
        elevenlabsAgentId: true,
        elevenlabsPhoneId: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPass: true,
        smtpFrom: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error: any) {
    console.error("Failed to fetch company settings:", error);
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
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only admins can update company settings" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) {
      return NextResponse.json({ error: "No company associated with user" }, { status: 400 });
    }

    const body = await req.json();

    const updateData: any = {
      twilioPhone: body.twilioPhone || null,
      twilioSid: body.twilioSid || null,
      elevenlabsAgentId: body.elevenlabsAgentId || null,
      elevenlabsPhoneId: body.elevenlabsPhoneId || null,
      smtpHost: body.smtpHost || null,
      smtpPort: body.smtpPort ? parseInt(body.smtpPort, 10) : null,
      smtpUser: body.smtpUser || null,
      smtpFrom: body.smtpFrom || null,
    };

    if (body.twilioToken) {
      updateData.twilioToken = body.twilioToken;
    }

    if (body.smtpPass) {
      updateData.smtpPass = body.smtpPass;
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data: updateData,
    });

    return NextResponse.json({ success: true, message: "Company settings updated successfully" });
  } catch (error: any) {
    console.error("Failed to update company settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

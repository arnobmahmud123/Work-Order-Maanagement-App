import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Helper to dynamically fetch Twilio phone number for the active company
async function getCompanyTwilioNumber(): Promise<string | null> {
  try {
    const session = await auth();
    const companyId = (session?.user as any)?.companyId;

    if (companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { twilioPhone: true }
      });
      if (company?.twilioPhone) {
        return company.twilioPhone;
      }
    }
  } catch (err) {
    console.error("[SMS History API] Failed to fetch company Twilio number:", err);
  }

  return process.env.TWILIO_PHONE_NUMBER || null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const twilioNumber = await getCompanyTwilioNumber() || "";

    if (!phone) {
      return NextResponse.json({ error: "Missing phone parameter" }, { status: 400 });
    }

    // Resolve matching User metadata (especially image avatar)
    const cleanedPhone = phone.replace(/\D/g, "");
    const user = await prisma.user.findFirst({
      where: {
        phone: {
          contains: cleanedPhone !== "" ? cleanedPhone : undefined
        }
      }
    });

    // Fetch conversation history between Twilio number and external phone
    const messages = await prisma.smsMessage.findMany({
      where: {
        OR: [
          { from: phone, to: twilioNumber },
          { from: twilioNumber, to: phone },
          { from: "SYSTEM", to: phone, type: "NOTE" }
        ]
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return NextResponse.json({
      messages,
      contact: user
        ? {
            name: user.name,
            role: user.role,
            image: user.image
          }
        : null
    });
  } catch (error: any) {
    console.error("[SMS History API] Error fetching history:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

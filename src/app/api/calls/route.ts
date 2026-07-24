import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: any = {};
  if (role !== "ADMIN") {
    where.OR = [{ initiatorId: userId }, { recipientId: userId }];
  }
  if (status) where.status = status;

  const [calls, total] = await Promise.all([
    prisma.callLog.findMany({
      where,
      include: {
        initiator: { select: { id: true, name: true, email: true, image: true } },
        recipient: { select: { id: true, name: true, email: true, image: true } },
        voiceProfile: true,
        inspector: { select: { id: true, name: true, company: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.callLog.count({ where }),
  ]);

  return NextResponse.json({ calls, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();
  
  const recipientPhone = body.recipientPhone || body.phoneNumber;
  const recipientName = body.recipientName || body.contractorName;
  const { recipientId, inspectorId, voiceProfileId, purpose, workOrderId } = body;

  if (!recipientPhone) {
    return NextResponse.json({ error: "Recipient phone is required" }, { status: 400 });
  }

  let apiKey = process.env.ELEVENLABS_API_KEY;
  let agentId = process.env.ELEVENLABS_AGENT_ID;
  let phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
  const enableSimulation = process.env.NEXT_PUBLIC_ENABLE_SIMULATION === "true" || false;

  const companyId = (session?.user as any)?.companyId;
  let companyName = "";
  if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, elevenlabsAgentId: true, elevenlabsPhoneId: true }
    });
    if (company) {
      companyName = company.name;
      if (company.elevenlabsAgentId) {
        agentId = company.elevenlabsAgentId;
      }
      if (company.elevenlabsPhoneId) {
        phoneNumberId = company.elevenlabsPhoneId;
      }
    }
  }

  if (apiKey && agentId && phoneNumberId && !enableSimulation) {
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
          agent_phone_number_id: phoneNumberId,
          to_number: recipientPhone,
          conversation_initiation_client_data: {
            dynamic_variables: {
              work_order_id: workOrderId || "",
              company_id: companyId || "",
              company_name: companyName,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("ElevenLabs Outbound Call Error Response:", errorText);
        throw new Error(`ElevenLabs API returned ${response.status}: ${errorText}`);
      }

      const resData = await response.json();
      const { conversation_id } = resData;

      const call = await prisma.callLog.create({
        data: {
          id: conversation_id,
          initiatorId: userId,
          recipientId: recipientId || null,
          recipientPhone,
          recipientName: recipientName || "Unknown",
          inspectorId: inspectorId || null,
          voiceProfileId: voiceProfileId || null,
          purpose: purpose || (workOrderId ? `Discuss work order ID: ${workOrderId}` : "General discussion"),
          status: "RINGING",
          startedAt: new Date(),
        },
        include: {
          initiator: { select: { id: true, name: true, email: true } },
          voiceProfile: true,
        },
      });

      return NextResponse.json(call, { status: 201 });
    } catch (e: any) {
      console.error("Failed to initiate ElevenLabs outbound call, falling back to mock:", e);
    }
  }

  // Mock: Create call log with simulated Twilio integration
  const call = await prisma.callLog.create({
    data: {
      initiatorId: userId,
      recipientId: recipientId || null,
      recipientPhone,
      recipientName: recipientName || "Unknown",
      inspectorId: inspectorId || null,
      voiceProfileId: voiceProfileId || null,
      purpose: purpose || (workOrderId ? `Discuss work order ID: ${workOrderId} (Mock)` : "general discussion"),
      status: "RINGING",
      startedAt: new Date(),
    },
    include: {
      initiator: { select: { id: true, name: true, email: true } },
      voiceProfile: true,
    },
  });

  // Mock: Simulate call connecting after 2 seconds
  setTimeout(async () => {
    try {
      await prisma.callLog.update({
        where: { id: call.id },
        data: {
          status: "IN_PROGRESS",
        },
      });
    } catch {}
  }, 2000);

  // Mock: Simulate call completion after random duration
  const duration = Math.floor(Math.random() * 300) + 30;
  setTimeout(async () => {
    try {
      await prisma.callLog.update({
        where: { id: call.id },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
          duration,
          transcription: `[Mock Transcription] Call with ${recipientName || "recipient"} regarding ${purpose || "general discussion"}. The call lasted approximately ${Math.floor(duration / 60)} minutes and ${duration % 60} seconds. Key topics discussed included property inspection scheduling and service coordination.`,
          summary: `Completed call with ${recipientName || "recipient"}. Duration: ${Math.floor(duration / 60)}m ${duration % 60}s. Purpose: ${purpose || "General discussion"}.`,
        },
      });
    } catch {}
  }, 5000);

  return NextResponse.json(call, { status: 201 });
}

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
  let agentId = process.env.ELEVENLABS_AGENT_ID || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  let phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
  const enableSimulation = process.env.NEXT_PUBLIC_ENABLE_SIMULATION === "true" || false;

  const companyId = (session?.user as any)?.companyId;
  let companyName = "";
  
  if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, elevenlabsAgentId: true, elevenlabsPhoneId: true }
    });
    
    if (!company?.elevenlabsAgentId || !company?.elevenlabsPhoneId) {
      return NextResponse.json(
        { error: "Please configure your ElevenLabs Agent ID and Phone Number ID in Admin > Company Settings to enable AI calling." }, 
        { status: 400 }
      );
    }
    
    companyName = company.name || "";
    agentId = company.elevenlabsAgentId;
    phoneNumberId = company.elevenlabsPhoneId;
  }

  if (apiKey && agentId && phoneNumberId && !enableSimulation) {
    try {
      // Auto-resolve ElevenLabs phone_number_id if configured with an E.164 string like +16592137866
      let resolvedPhoneId = phoneNumberId;
      try {
        const phoneListRes = await fetch("https://api.elevenlabs.io/v1/convai/phone-numbers", {
          headers: { "xi-api-key": apiKey },
        });
        if (phoneListRes.ok) {
          const phoneListData = await phoneListRes.json();
          const list = phoneListData.phone_numbers || (Array.isArray(phoneListData) ? phoneListData : []);
          if (Array.isArray(list) && list.length > 0) {
            const match = list.find((p: any) => 
              p.phone_number === resolvedPhoneId || 
              p.phone_number?.replace(/\D/g, '') === resolvedPhoneId.replace(/\D/g, '') ||
              p.phone_number_id === resolvedPhoneId ||
              p.id === resolvedPhoneId
            );
            if (match) {
              resolvedPhoneId = match.phone_number_id || match.id;
            } else if (list.length === 1) {
              resolvedPhoneId = list[0].phone_number_id || list[0].id;
            }
          }
        }
      } catch (err) {
        console.warn("Could not query ElevenLabs phone-numbers:", err);
      }

      const response = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
          agent_phone_number_id: resolvedPhoneId,
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
        let parsedDetail = errorText;
        try {
          const parsed = JSON.parse(errorText);
          parsedDetail = parsed.detail?.message || parsed.message || parsed.detail || errorText;
        } catch {}
        return NextResponse.json(
          { error: `ElevenLabs AI Call Error: ${typeof parsedDetail === 'string' ? parsedDetail : JSON.stringify(parsedDetail)}` },
          { status: response.status >= 400 && response.status < 500 ? response.status : 500 }
        );
      }

      const resData = await response.json();
      const { conversation_id } = resData;

      const call = await prisma.callLog.create({
        data: {
          id: conversation_id || `call-${Date.now()}`,
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
      console.error("Failed to initiate ElevenLabs outbound call:", e);
      return NextResponse.json({ error: e.message || "Failed to initiate AI call." }, { status: 500 });
    }
  }

  // Mock: Create call log with simulated Twilio integration (ONLY for non-company test accounts)
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

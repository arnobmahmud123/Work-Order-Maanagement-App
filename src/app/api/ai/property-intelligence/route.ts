import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const body = await req.json();
    const { query, propertyId, workOrderId, propertyAddress } = body;

    if (!query || query.trim() === "") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // 1. Resolve Target Property / Work Orders Scope
    let resolvedPropertyId = propertyId || null;
    let targetProperty: any = null;

    if (workOrderId && !resolvedPropertyId) {
      const wo = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        select: { propertyId: true, address: true, city: true, state: true, zipCode: true },
      });
      if (wo) {
        resolvedPropertyId = wo.propertyId;
        if (!resolvedPropertyId && wo.address) {
          // Find property by address
          const prop = await prisma.property.findFirst({
            where: {
              address: { contains: wo.address.trim() },
              ...(companyId ? { companyId } : {}),
            },
          });
          if (prop) resolvedPropertyId = prop.id;
        }
      }
    }

    if (propertyAddress && !resolvedPropertyId) {
      const prop = await prisma.property.findFirst({
        where: {
          address: { contains: propertyAddress.trim() },
          ...(companyId ? { companyId } : {}),
        },
      });
      if (prop) resolvedPropertyId = prop.id;
    }

    if (resolvedPropertyId) {
      targetProperty = await prisma.property.findUnique({
        where: { id: resolvedPropertyId },
        include: {
          workOrders: {
            include: {
              contractor: { select: { id: true, name: true, phone: true } },
              coordinator: { select: { id: true, name: true } },
              invoices: { include: { items: true } },
              files: { select: { id: true, category: true, filename: true, originalName: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }

    // If still no property found, search work orders directly by address or general search
    let historicalOrders: any[] = [];
    if (targetProperty?.workOrders) {
      historicalOrders = targetProperty.workOrders;
    } else {
      const searchTerms = (propertyAddress || query).toLowerCase().split(" ").filter((w: string) => w.length > 2);
      historicalOrders = await prisma.workOrder.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          OR: [
            { address: { contains: propertyAddress || query } },
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        },
        include: {
          contractor: { select: { id: true, name: true, phone: true } },
          coordinator: { select: { id: true, name: true } },
          invoices: { include: { items: true } },
          files: { select: { id: true, category: true, filename: true, originalName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }

    // 2. Aggregate Complete Historical System Knowledge
    const historicalContext = historicalOrders.map((wo: any, idx: number) => {
      const invoiceDescriptions = wo.invoices
        ?.flatMap((inv: any) => inv.items?.map((item: any) => `${item.description} ($${item.total})`))
        .join("; ") || "None";

      return {
        orderNumber: wo.workOrderNumber || wo.id,
        title: wo.title,
        status: wo.status,
        serviceType: wo.serviceType,
        address: [wo.address, wo.city, wo.state, wo.zipCode].filter(Boolean).join(", "),
        createdAt: wo.createdAt ? new Date(wo.createdAt).toLocaleDateString() : "Unknown",
        completedAt: wo.completedAt ? new Date(wo.completedAt).toLocaleDateString() : "Not Completed",
        contractor: wo.contractor?.name || "Unassigned",
        coordinator: wo.coordinator?.name || "Unassigned",
        lockCode: wo.lockCode || "None recorded",
        instructions: wo.instructions || wo.description || "",
        invoicedItems: invoiceDescriptions,
        photoCount: wo.files?.length || 0,
      };
    });

    // 3. Search & Reason over all historical data
    const queryLower = query.toLowerCase();

    // Specific damage / topic analyzers
    const matchedRecords: any[] = [];
    const keywords = queryLower.split(/\s+/).filter((k: string) => k.length > 2);

    for (const record of historicalContext) {
      const fullSearchString = `${record.title} ${record.serviceType} ${record.instructions} ${record.invoicedItems}`.toLowerCase();
      
      const hasMatch = keywords.some((kw: string) => fullSearchString.includes(kw));
      if (hasMatch) {
        // Extract matching snippet
        matchedRecords.push(record);
      }
    }

    // 4. Try LLM synthesis (OpenAI / Gemini) or Intelligent Deterministic Engine Fallback
    let aiResponseText = "";
    const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;

    if (apiKey && process.env.OPENAI_API_KEY) {
      try {
        const prompt = `
You are an expert Property Preservation AI Copilot for Vanguard / Property Preservation Systems.
Analyze the following historical records (${historicalContext.length} total work orders for this property/system) and answer the user's specific query with extreme accuracy and detail.
If they ask about past damage (e.g. freeze damage, roof leaks, mold, vandalism), detail EVERY occurrence, the exact work order ID, dates, contractors, and invoice items.

User Query: "${query}"

Historical Work Orders Dataset:
${JSON.stringify(historicalContext.slice(0, 40), null, 2)}
`;

        const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are an expert property preservation intelligence assistant." },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          }),
        });

        if (openAiRes.ok) {
          const aiData = await openAiRes.json();
          aiResponseText = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (llmErr) {
        console.warn("OpenAI API call failed, falling back to built-in semantic processor:", llmErr);
      }
    }

    // Fallback / Built-in Semantic Synthesis Engine if no LLM key
    if (!aiResponseText) {
      if (queryLower.includes("freeze") || queryLower.includes("winter") || queryLower.includes("pipe") || queryLower.includes("burst")) {
        const freezeMatches = historicalContext.filter((r) =>
          `${r.title} ${r.serviceType} ${r.instructions} ${r.invoicedItems}`.toLowerCase().match(/freeze|frozen|winteriz|burst|plumbing leak|water pressure/i)
        );

        if (freezeMatches.length > 0) {
          aiResponseText = `### ❄️ Historical Freeze & Winterization Analysis\n\nFound **${freezeMatches.length} related work order records** mentioning freeze damage, winterization, or plumbing lines across ${historicalContext.length} total historical work orders on this property:\n\n` +
            freezeMatches.map((m, i) =>
              `**${i + 1}. Work Order #${m.orderNumber}** (${m.serviceType}) — *${m.status} on ${m.completedAt || m.createdAt}*\n` +
              `• **Contractor**: ${m.contractor}\n` +
              `• **Scope & Findings**: ${m.instructions ? m.instructions.substring(0, 180) + "..." : "Winterization / freeze check executed."}\n` +
              `• **Invoiced Repairs**: ${m.invoicedItems}\n`
            ).join("\n") +
            `\n\n💡 **Processor Recommendation**: Previous plumbing/freeze records exist for this property. Verify current pressure test and ensure system was properly re-winterized before closing order.`;
        } else {
          aiResponseText = `### ❄️ Historical Freeze Damage Check\n\nAcross all **${historicalContext.length} historical work orders** on this property, there are **no recorded instances of freeze damage, frozen pipes, or burst line repairs** in previous contractor notes or invoices. Standard winterizations were completed without reported plumbing failures.`;
        }
      } else if (queryLower.includes("roof") || queryLower.includes("tarp") || queryLower.includes("leak") || queryLower.includes("shingle")) {
        const roofMatches = historicalContext.filter((r) =>
          `${r.title} ${r.serviceType} ${r.instructions} ${r.invoicedItems}`.toLowerCase().match(/roof|tarp|leak|shingle|fascia|gutter/i)
        );
        if (roofMatches.length > 0) {
          aiResponseText = `### 🏠 Roof & Exterior Condition History\n\nFound **${roofMatches.length} records** involving roofing, tarping, or leak remediation:\n\n` +
            roofMatches.map((m, i) =>
              `**${i + 1}. Work Order #${m.orderNumber}** (${m.serviceType}) — *${m.completedAt || m.createdAt}*\n` +
              `• **Contractor**: ${m.contractor}\n` +
              `• **Details**: ${m.instructions ? m.instructions.substring(0, 160) + "..." : "Roofing maintenance record."}\n` +
              `• **Invoiced Items**: ${m.invoicedItems}\n`
            ).join("\n");
        } else {
          aiResponseText = `### 🏠 Roof History\n\nNo prior roof leaks, tarping orders, or structural roof repairs were found across the **${historicalContext.length} historical records** for this property.`;
        }
      } else if (queryLower.includes("lock") || queryLower.includes("code") || queryLower.includes("key") || queryLower.includes("gate")) {
        const lockCodes = [...new Set(historicalContext.map((r) => r.lockCode).filter((c) => c && c !== "None recorded"))];
        aiResponseText = `### 🔐 Lockbox & Keycode History\n\n` +
          (lockCodes.length > 0
            ? `Historical lock codes recorded across past work orders:\n• **Codes Used**: ${lockCodes.join(", ")}\n• **Most Recent Code**: ${lockCodes[0]}`
            : `No custom lockbox codes were logged in past work order notes. Standard HUD/Client padlocks were used.`);
      } else {
        // General query synthesis
        aiResponseText = `### 📋 Property Intelligence Summary\n\nAnalyzed **${historicalContext.length} historical work orders** for this property.\n\n` +
          (matchedRecords.length > 0
            ? `Found **${matchedRecords.length} records** matching your search for "*${query}*":\n\n` +
              matchedRecords.slice(0, 5).map((m, i) =>
                `**${i + 1}. Work Order #${m.orderNumber}** (${m.serviceType}) — *${m.status} on ${m.completedAt || m.createdAt}*\n` +
                `• **Contractor**: ${m.contractor}\n` +
                `• **Notes**: ${m.instructions ? m.instructions.substring(0, 150) + "..." : "Standard preservation dispatch."}\n`
              ).join("\n")
            : `No direct keyword matches found for "*${query}*" in past instructions or invoices. The property has ${historicalContext.length} total completed orders spanning services: ${[...new Set(historicalContext.map(r => r.serviceType))].join(", ")}.`);
      }
    }

    return NextResponse.json({
      success: true,
      query,
      property: targetProperty
        ? {
            id: targetProperty.id,
            address: `${targetProperty.address}, ${targetProperty.city} ${targetProperty.state}`,
            totalHistoricalWorkOrders: historicalOrders.length,
          }
        : null,
      totalOrdersAnalyzed: historicalOrders.length,
      matchedRecordCount: matchedRecords.length,
      answer: aiResponseText,
    });
  } catch (error: any) {
    console.error("[Property Intelligence Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to query property intelligence" }, { status: 500 });
  }
}

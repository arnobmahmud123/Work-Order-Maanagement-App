import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Gemini AI Chat Assistant ────────────────────────────────────────────────
// Full-context AI that can answer anything about the app's data.

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface ChatRequest {
  message: string;
  context?: {
    type: "work_order" | "property" | "general" | "contractor_search";
    id?: string;
  };
  conversationHistory?: { role: string; content: string }[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const userName = (session.user as any).name || "User";
  const body: ChatRequest = await req.json();
  const { message, context, conversationHistory } = body;

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
  }

  try {
    // Gather comprehensive context from the entire app
    const appContext = await gatherFullContext(userId, role, context);

    // Build the Gemini request
    const geminiPayload = buildGeminiRequest(message, appContext, role, userName, conversationHistory);

    // Call Gemini API
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json({
        response: "I'm having trouble connecting to my AI brain. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      });
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response. Please try again.";

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("AI Chat error:", error);
    return NextResponse.json({
      response: "Something went wrong processing your request. Please try again.",
      timestamp: new Date().toISOString(),
    });
  }
}

// ─── Gather Full App Context ─────────────────────────────────────────────────

async function gatherFullContext(userId: string, role: string, context?: ChatRequest["context"]) {
  const isAdmin = role === "ADMIN";
  const isCoordinator = role === "COORDINATOR" || role === "INCHARGE_COORDINATOR";
  const isProcessor = role === "PROCESSOR" || role === "PROCESSOR_INCHARGE";
  const isContractor = role === "CONTRACTOR";
  const isClient = role === "CLIENT" || role === "CLIENT_MANAGER" || role === "INCHARGE_CLIENT_MANAGER";

  // Work order filters based on role
  const woWhere: any = {};
  if (isContractor) woWhere.contractorId = userId;
  if (isClient) woWhere.createdById = userId;

  const [
    users,
    workOrders,
    properties,
    invoices,
    channels,
    recentMessages,
    contractors,
    inspectors,
    disputes,
    supportTickets,
    notifications,
    networkPosts,
    jobRequests,
    ratings,
    withdrawals,
  ] = await Promise.all([
    // Users summary
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, company: true, phone: true, isActive: true },
      take: 200,
    }),

    // Work orders (role-filtered)
    prisma.workOrder.findMany({
      where: woWhere,
      select: {
        id: true, title: true, description: true, address: true, city: true, state: true, zipCode: true,
        serviceType: true, status: true, priority: true, dueDate: true, createdAt: true, completedAt: true,
        lockCode: true, gateCode: true, specialInstructions: true,
        contractor: { select: { id: true, name: true, company: true } },
        coordinator: { select: { id: true, name: true } },
        processor: { select: { id: true, name: true } },
        property: { select: { address: true, city: true, state: true } },
        invoices: { select: { invoiceNumber: true, total: true, status: true } },
        _count: { select: { files: true, history: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),

    // Properties
    prisma.property.findMany({
      select: {
        id: true, address: true, city: true, state: true, zipCode: true,
        _count: { select: { workOrders: true } },
      },
      take: 100,
    }),

    // Invoices
    prisma.invoice.findMany({
      where: isAdmin || isClient ? {} : { clientId: userId },
      select: {
        id: true, invoiceNumber: true, status: true, subtotal: true, tax: true, total: true,
        dueDate: true, paidAt: true, createdAt: true,
        client: { select: { name: true, company: true } },
        workOrder: { select: { title: true, address: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    // Chat channels
    prisma.channel.findMany({
      select: {
        id: true, name: true, type: true,
        _count: { select: { messages: true, members: true } },
      },
      take: 20,
    }),

    // Recent chat messages
    prisma.chatMessage.findMany({
      select: {
        content: true, createdAt: true,
        author: { select: { name: true, role: true } },
        channel: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),

    // Contractors with profiles
    prisma.user.findMany({
      where: { role: "CONTRACTOR" },
      select: {
        id: true, name: true, email: true, phone: true, company: true, isActive: true,
        contractorProfile: {
          select: {
            completedJobs: true, totalJobs: true, avgRating: true, totalRatings: true,
            reliabilityScore: true, isAvailable: true, hourlyRate: true,
            bio: true, skills: true, specialties: true, serviceRadius: true,
            city: true, state: true, latitude: true, longitude: true,
          },
        },
        assignedWorkOrders: {
          select: { id: true, title: true, status: true, serviceType: true },
          where: { status: { notIn: ["CLOSED", "CANCELLED"] } },
          take: 5,
        },
      },
      take: 50,
    }),

    // Inspectors
    prisma.inspector.findMany({
      select: {
        id: true, name: true, company: true, city: true, state: true,
        availability: true, rating: true, reviewCount: true, hourlyRate: true,
        specialties: { select: { specialty: true, certified: true, yearsExp: true } },
      },
      take: 30,
    }),

    // Disputes
    prisma.dispute.findMany({
      select: {
        id: true, title: true, description: true, status: true, priority: true,
        resolution: true, createdAt: true,
        workOrder: { select: { title: true, address: true } },
        raisedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),

    // Support tickets
    prisma.supportTicket.findMany({
      select: {
        id: true, subject: true, description: true, status: true, priority: true,
        category: true, createdAt: true,
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),

    // Notifications
    prisma.notification.findMany({
      where: { userId },
      select: { id: true, title: true, message: true, type: true, isRead: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),

    // Network posts
    prisma.post.findMany({
      select: {
        id: true, title: true, content: true, category: true, isUrgent: true,
        city: true, state: true, createdAt: true,
        author: { select: { name: true, role: true } },
        _count: { select: { comments: true, reactions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),

    // Job requests
    prisma.jobRequest.findMany({
      select: {
        id: true, status: true, urgency: true, budget: true, deadline: true,
        location: true, city: true, state: true, scopeOfWork: true,
        post: { select: { title: true } },
        requester: { select: { name: true } },
        _count: { select: { offers: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),

    // Ratings
    prisma.rating.findMany({
      select: {
        id: true, score: true, comment: true, createdAt: true,
        ratedUser: { select: { name: true } },
        raterUser: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),

    // Withdrawals
    prisma.withdrawal.findMany({
      select: {
        id: true, amount: true, method: true, status: true, createdAt: true, completedAt: true,
        contractor: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  // Compute stats
  const statusCounts: Record<string, number> = {};
  const serviceCounts: Record<string, number> = {};
  let totalRevenue = 0;
  let overdueCount = 0;
  const now = new Date();

  for (const wo of workOrders) {
    statusCounts[wo.status] = (statusCounts[wo.status] || 0) + 1;
    serviceCounts[wo.serviceType] = (serviceCounts[wo.serviceType] || 0) + 1;
    if (wo.dueDate && new Date(wo.dueDate) < now && !["CLOSED", "CANCELLED"].includes(wo.status)) {
      overdueCount++;
    }
  }

  for (const inv of invoices) {
    if (inv.status === "PAID") totalRevenue += inv.total;
  }

  const activeContractors = contractors.filter(c => c.contractorProfile?.isAvailable).length;
  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  return {
    stats: {
      totalWorkOrders: workOrders.length,
      statusCounts,
      serviceCounts,
      overdueCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalProperties: properties.length,
      totalContractors: contractors.length,
      activeContractors,
      totalInvoices: invoices.length,
      totalUsers: users.length,
      unreadNotifications,
      openDisputes: disputes.filter(d => d.status === "OPEN" || d.status === "UNDER_REVIEW").length,
      openTickets: supportTickets.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS").length,
    },
    workOrders: workOrders.map(wo => ({
      title: wo.title,
      address: `${wo.address}, ${wo.city || ""}, ${wo.state || ""}`.trim(),
      serviceType: wo.serviceType,
      status: wo.status,
      priority: wo.priority,
      dueDate: wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : "N/A",
      contractor: wo.contractor?.name || "Unassigned",
      coordinator: wo.coordinator?.name || "N/A",
      description: wo.description?.slice(0, 200),
      lockCode: wo.lockCode,
      specialInstructions: wo.specialInstructions,
      invoiceCount: wo.invoices.length,
      fileCount: wo._count.files,
    })),
    properties: properties.map(p => ({
      address: `${p.address}, ${p.city || ""}, ${p.state || ""}`.trim(),
      workOrderCount: p._count.workOrders,
    })),
    invoices: invoices.map(inv => ({
      number: inv.invoiceNumber,
      status: inv.status,
      total: inv.total,
      client: inv.client?.company || inv.client?.name,
      workOrder: inv.workOrder?.title,
      paidAt: inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : null,
    })),
    contractors: contractors.map(c => ({
      name: c.name,
      company: c.company,
      phone: c.phone,
      email: c.email,
      available: c.contractorProfile?.isAvailable ?? false,
      completedJobs: c.contractorProfile?.completedJobs || 0,
      avgRating: c.contractorProfile?.avgRating || 0,
      reliabilityScore: c.contractorProfile?.reliabilityScore || 0,
      hourlyRate: c.contractorProfile?.hourlyRate,
      skills: c.contractorProfile?.skills || [],
      specialties: c.contractorProfile?.specialties || [],
      city: c.contractorProfile?.city,
      state: c.contractorProfile?.state,
      activeJobs: c.assignedWorkOrders.length,
    })),
    inspectors: inspectors.map(i => ({
      name: i.name,
      company: i.company,
      location: `${i.city || ""}, ${i.state || ""}`.trim(),
      availability: i.availability,
      rating: i.rating,
      hourlyRate: i.hourlyRate,
      specialties: i.specialties.map(s => s.specialty),
    })),
    disputes: disputes.map(d => ({
      title: d.title,
      status: d.status,
      priority: d.priority,
      workOrder: d.workOrder?.title,
      resolution: d.resolution,
    })),
    supportTickets: supportTickets.map(t => ({
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      category: t.category,
    })),
    networkPosts: networkPosts.map(p => ({
      title: p.title,
      category: p.category,
      author: p.author?.name,
      isUrgent: p.isUrgent,
      location: p.city && p.state ? `${p.city}, ${p.state}` : null,
      comments: p._count.comments,
      reactions: p._count.reactions,
    })),
    jobRequests: jobRequests.map(j => ({
      title: j.post?.title,
      status: j.status,
      urgency: j.urgency,
      budget: j.budget,
      location: j.location,
      offers: j._count.offers,
    })),
    recentMessages: recentMessages.map(m => ({
      author: m.author?.name,
      channel: m.channel?.name,
      content: m.content?.slice(0, 150),
      time: new Date(m.createdAt).toLocaleString(),
    })),
    channels: channels.map(ch => ({
      name: ch.name,
      type: ch.type,
      messages: ch._count.messages,
      members: ch._count.members,
    })),
    recentRatings: ratings.map(r => ({
      rated: r.ratedUser?.name,
      rater: r.raterUser?.name,
      score: r.score,
      comment: r.comment?.slice(0, 100),
    })),
  };
}

// ─── Build Gemini Request ────────────────────────────────────────────────────

function buildGeminiRequest(
  userMessage: string,
  appContext: any,
  role: string,
  userName: string,
  history?: { role: string; content: string }[],
) {
  const systemInstruction = `You are PropPreserve AI (also called "Aura Intelligence") — the built-in AI assistant for PropPreserve, a property preservation management platform.

You have FULL ACCESS to the entire app's data. You can answer ANY question about:
- Work orders (status, details, assignments, due dates, addresses, lock codes, instructions)
- Properties and their work order history
- Contractors (ratings, availability, skills, locations, contact info)
- Inspectors (specialties, availability, ratings)
- Invoices and financial data (revenue, payment status)
- Chat messages and team communication
- Network posts, job marketplace, and coverage requests
- Disputes and support tickets
- Notifications and alerts
- User roles and team members
- Platform statistics and analytics

You are knowledgeable, helpful, and concise. You use the actual data to give specific, accurate answers.
You can format responses with markdown for readability (bold, bullet points, tables).
If the user asks about something not in the data, say so honestly.
Never make up data — only use what's provided in the context.

The user is "${userName}" with role: ${role}.`;

  const dataSummary = `
=== PLATFORM STATS ===
Total Work Orders: ${appContext.stats.totalWorkOrders}
Status Breakdown: ${JSON.stringify(appContext.stats.statusCounts)}
Service Breakdown: ${JSON.stringify(appContext.stats.serviceCounts)}
Overdue: ${appContext.stats.overdueCount}
Total Revenue (paid): $${appContext.stats.totalRevenue}
Total Properties: ${appContext.stats.totalProperties}
Total Contractors: ${appContext.stats.totalContractors} (${appContext.stats.activeContractors} available)
Total Invoices: ${appContext.stats.totalInvoices}
Open Disputes: ${appContext.stats.openDisputes}
Open Support Tickets: ${appContext.stats.openTickets}
Unread Notifications: ${appContext.stats.unreadNotifications}

=== WORK ORDERS (first 50) ===
${appContext.workOrders.slice(0, 50).map((wo: any, i: number) => 
  `${i+1}. "${wo.title}" | ${wo.address} | ${wo.serviceType} | Status: ${wo.status} | Priority: ${wo.priority} | Due: ${wo.dueDate} | Contractor: ${wo.contractor} | Coordinator: ${wo.coordinator}${wo.lockCode ? ` | Lock: ${wo.lockCode}` : ""}${wo.specialInstructions ? ` | Notes: ${wo.specialInstructions}` : ""}`
).join("\n")}

=== PROPERTIES (first 50) ===
${appContext.properties.slice(0, 50).map((p: any, i: number) => 
  `${i+1}. ${p.address} — ${p.workOrderCount} work order(s)`
).join("\n")}

=== CONTRACTORS ===
${appContext.contractors.slice(0, 30).map((c: any, i: number) =>
  `${i+1}. ${c.name} (${c.company || "Independent"}) | Available: ${c.available} | Completed: ${c.completedJobs} | Rating: ${c.avgRating?.toFixed(1) || "N/A"} | Reliability: ${c.reliabilityScore}% | Rate: $${c.hourlyRate || "N/A"}/hr | Location: ${c.city || "N/A"}, ${c.state || ""} | Skills: ${c.skills.join(", ") || "N/A"} | Specialties: ${c.specialties.join(", ") || "N/A"} | Active Jobs: ${c.activeJobs} | Phone: ${c.phone || "N/A"} | Email: ${c.email}`
).join("\n")}

=== INSPECTORS ===
${appContext.inspectors.map((i: any, idx: number) =>
  `${idx+1}. ${i.name} (${i.company || ""}) | ${i.location} | ${i.availability} | Rating: ${i.rating?.toFixed(1) || "N/A"} | $${i.hourlyRate || "N/A"}/hr | Specialties: ${i.specialties.join(", ")}`
).join("\n")}

=== INVOICES (first 30) ===
${appContext.invoices.slice(0, 30).map((inv: any, i: number) =>
  `${i+1}. #${inv.number} | $${inv.total} | ${inv.status} | Client: ${inv.client || "N/A"} | WO: ${inv.workOrder || "N/A"}${inv.paidAt ? ` | Paid: ${inv.paidAt}` : ""}`
).join("\n")}

=== NETWORK POSTS (recent) ===
${appContext.networkPosts.map((p: any, i: number) =>
  `${i+1}. [${p.category}] "${p.title}" by ${p.author}${p.isUrgent ? " ⚠️ URGENT" : ""}${p.location ? ` (${p.location})` : ""} — ${p.comments} comments, ${p.reactions} reactions`
).join("\n")}

=== JOB MARKETPLACE ===
${appContext.jobRequests.map((j: any, i: number) =>
  `${i+1}. "${j.title || "Untitled"}" | ${j.status} | ${j.urgency} urgency | Budget: $${j.budget || "N/A"} | Location: ${j.location || "N/A"} | ${j.offers} offer(s)`
).join("\n")}

=== DISPUTES ===
${appContext.disputes.map((d: any, i: number) =>
  `${i+1}. "${d.title}" | ${d.status} | ${d.priority} | WO: ${d.workOrder || "N/A"}${d.resolution ? ` | Resolution: ${d.resolution}` : ""}`
).join("\n")}

=== SUPPORT TICKETS ===
${appContext.supportTickets.map((t: any, i: number) =>
  `${i+1}. "${t.subject}" | ${t.status} | ${t.priority} | ${t.category}`
).join("\n")}

=== CHAT CHANNELS ===
${appContext.channels.map((ch: any) =>
  `#${ch.name} (${ch.type}) — ${ch.messages} messages, ${ch.members} members`
).join("\n")}

=== RECENT MESSAGES ===
${appContext.recentMessages.map((m: any, i: number) =>
  `${i+1}. [${m.channel || "DM"}] ${m.author}: ${m.content}`
).join("\n")}

=== RECENT RATINGS ===
${appContext.recentRatings.map((r: any, i: number) =>
  `${i+1}. ${r.rated} rated ${r.score}/5 by ${r.rater}${r.comment ? `: "${r.comment}"` : ""}`
).join("\n")}

=== NOTIFICATIONS (user's) ===
${appContext.notifications?.length ? appContext.notifications.map((n: any, i: number) =>
  `${i+1}. [${n.type}] ${n.title} — ${n.message} (${n.isRead ? "read" : "unread"})`
).join("\n") : "No notifications"}
`;

  // Build conversation history for Gemini
  const contents: any[] = [];

  // Add conversation history
  if (history && history.length > 0) {
    for (const msg of history.slice(-10)) {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }
  }

  // Add current message with full context
  contents.push({
    role: "user",
    parts: [{
      text: `${systemInstruction}\n\n=== FULL APP DATA ===\n${dataSummary}\n\nUser question: ${userMessage}`
    }],
  });

  return {
    contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };
}

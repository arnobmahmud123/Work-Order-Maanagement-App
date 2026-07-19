import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const role = (session.user as any).role;
    if (role === "CONTRACTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: id },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' }
        },
        notes: {
          orderBy: { createdAt: 'desc' }
        },
        tags: true,
      }
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const role = (session.user as any).role;
    if (role === "CONTRACTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    
    // Support partial updates
    const lead = await prisma.lead.update({
      where: { id: id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.verificationScore !== undefined && { verificationScore: body.verificationScore }),
        ...(body.companyName && { companyName: body.companyName }),
        ...(body.contactName !== undefined && { contactName: body.contactName }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
      }
    });

    // If status changed, log activity
    if (body.status) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: "STATUS_CHANGE",
          content: `Status updated to ${body.status}`,
          authorId: session.user.id,
          authorName: session.user.name || "System"
        }
      });
    }

    // Support adding tags
    if (body.tagsToAdd && Array.isArray(body.tagsToAdd)) {
      for (const tagName of body.tagsToAdd) {
        await prisma.lead.update({
          where: { id: id },
          data: {
            tags: {
              connectOrCreate: {
                where: { name: tagName },
                create: { name: tagName, color: "blue" }
              }
            }
          }
        });
      }
    }

    // Support adding notes
    if (body.newNote) {
      await prisma.leadNote.create({
        data: {
          leadId: lead.id,
          content: body.newNote,
          authorId: session.user.id,
          authorName: session.user.name || "System"
        }
      });
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: "NOTE_ADDED",
          content: "Added a new note",
          authorId: session.user.id,
          authorName: session.user.name || "System"
        }
      });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

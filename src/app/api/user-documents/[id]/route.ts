import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const callerId = (session.user as any).id;
    const callerRole = (session.user as any).role;

    const document = await prisma.userDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const isStaff = ["SUPER_ADMIN", "ADMIN", "COORDINATOR", "INCHARGE_COORDINATOR"].includes(callerRole);
    if (document.userId !== callerId && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.userDocument.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[UserDocuments DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete document" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const callerId = (session.user as any).id;
    const callerRole = (session.user as any).role;

    const document = await prisma.userDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const isStaff = ["SUPER_ADMIN", "ADMIN", "COORDINATOR", "INCHARGE_COORDINATOR"].includes(callerRole);
    if (document.userId !== callerId && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.type !== undefined) updateData.type = body.type;
    if (body.documentNumber !== undefined) updateData.documentNumber = body.documentNumber?.trim() || null;
    if (body.issuingAuthority !== undefined) updateData.issuingAuthority = body.issuingAuthority?.trim() || null;
    if (body.expiresAt !== undefined) {
      updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
      if (body.expiresAt && new Date(body.expiresAt).getTime() < Date.now()) {
        updateData.status = "EXPIRED";
      }
    }
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;

    // Verification controls for Staff
    if (body.status !== undefined && isStaff) {
      updateData.status = body.status;
      if (body.status === "VERIFIED") {
        updateData.verifiedAt = new Date();
        updateData.verifiedById = callerId;
      } else if (body.status !== "VERIFIED") {
        updateData.verifiedAt = null;
        updateData.verifiedById = null;
      }
    }

    const updated = await prisma.userDocument.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, document: updated });
  } catch (error: any) {
    console.error("[UserDocuments PATCH] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update document" }, { status: 500 });
  }
}

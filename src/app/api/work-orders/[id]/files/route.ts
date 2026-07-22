import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const files = await prisma.fileUpload.findMany({
      where: { workOrderId: id },
      include: {
        uploader: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const resolvedFiles = files.map((file) => {
      const pathUrl = `/api/work-orders/${id}/files/${file.id}/content`;
      return {
        id: file.id,
        filename: file.originalName,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        path: pathUrl,
        category: file.category,
        workOrderId: file.workOrderId,
        uploaderId: file.uploaderId,
        createdAt: file.createdAt.toISOString(),
        uploader: file.uploader,
      };
    });

    return NextResponse.json({ files: resolvedFiles });
  } catch (error: any) {
    console.error("Prisma GET files error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workOrderId } = await params;
  const companyId = (session.user as any).companyId;
  const role = (session.user as any).role;

  const isJson = req.headers.get("content-type")?.includes("application/json");
  let originalName: string;
  let mimeType: string;
  let size: number;
  let categoryInput: string;
  let pathUrl: string;

  try {
    if (isJson) {
      const body = await req.json();
      originalName = body.originalName;
      mimeType = body.mimeType;
      size = Number(body.size) || 0;
      categoryInput = body.category || "DOCS";
      pathUrl = body.publicUrl;

      if (!originalName || !mimeType || !pathUrl) {
        return NextResponse.json({ error: "originalName, mimeType, and publicUrl are required" }, { status: 400 });
      }
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      categoryInput = (formData.get("category") as string) || "DOCS";

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
      }

      originalName = file.name;
      mimeType = file.type;
      size = file.size;

      const bytes = await file.arrayBuffer();
      let base64Str = "";
      const bytesArray = new Uint8Array(bytes);
      const len = bytesArray.byteLength;
      for (let i = 0; i < len; i++) {
        base64Str += String.fromCharCode(bytesArray[i]);
      }
      base64Str = btoa(base64Str);
      const base64 = `data:${file.type};base64,${base64Str}`;
      pathUrl = base64;
    }

    // Enforce Subscription Storage limits
    if (role !== "SUPER_ADMIN" && companyId) {
      const activeCompany = await prisma.company.findUnique({
        where: { id: companyId },
      });
      if (activeCompany) {
        const aggregations = await prisma.fileUpload.aggregate({
          where: { companyId },
          _sum: { size: true },
        });
        const currentBytes = aggregations._sum.size || 0;
        const currentMB = currentBytes / (1024 * 1024);

        if (currentMB + (size / (1024 * 1024)) > activeCompany.maxStorage) {
          return NextResponse.json(
            { error: `Storage limit reached (${activeCompany.maxStorage} MB). Please upgrade your subscription plan.` },
            { status: 403 }
          );
        }
      }
    }

    // Validate category
    const validCategories = ["BEFORE", "DURING", "AFTER", "BID", "INSPECTION", "DOCS"];
    const fileCategory = validCategories.includes(categoryInput) ? categoryInput : "DOCS";

    const fileId = crypto.randomUUID();

    // Verify work order ownership
    const woExists = await prisma.workOrder.findFirst({
      where: { id: workOrderId },
    });

    if (!woExists) {
      return NextResponse.json({ error: `Work order not found: ${workOrderId}` }, { status: 404 });
    }

    // Save using Prisma Client
    const fileUpload = await prisma.fileUpload.create({
      data: {
        id: fileId,
        filename: originalName,
        originalName,
        mimeType,
        size,
        path: pathUrl,
        category: fileCategory,
        workOrderId,
        uploaderId: session.user.id,
        companyId,
      },
      include: {
        uploader: { select: { id: true, name: true } },
      },
    });

    // Log Activity safely
    await prisma.activityLog.create({
      data: {
        action: "FILE_UPLOADED",
        details: `Uploaded "${originalName}" (${fileCategory})`,
        userId: session.user.id,
        workOrderId,
        companyId,
      },
    });

    const signedPath = `/api/work-orders/${workOrderId}/files/${fileId}/content`;

    return NextResponse.json({
      id: fileId,
      filename: originalName,
      originalName,
      mimeType,
      size,
      path: signedPath,
      category: fileCategory,
      workOrderId,
      uploaderId: session.user.id,
      createdAt: fileUpload.createdAt.toISOString(),
      uploader: fileUpload.uploader,
    }, { status: 201 });

  } catch (error: any) {
    console.error("Prisma POST file error:", error.message);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workOrderId } = await params;
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");
  const companyId = (session.user as any).companyId;

  if (!fileId) {
    return NextResponse.json({ error: "fileId required" }, { status: 400 });
  }

  try {
    const file = await prisma.fileUpload.findFirst({
      where: { id: fileId, workOrderId },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await prisma.fileUpload.delete({
      where: { id: fileId },
    });

    await prisma.activityLog.create({
      data: {
        action: "FILE_DELETED",
        details: `Deleted "${file.originalName}"`,
        userId: session.user.id,
        workOrderId,
        companyId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Prisma DELETE file error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

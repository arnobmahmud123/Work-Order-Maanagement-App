import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── GPS Photo Upload ────────────────────────────────────────────────────────
// Accepts photos with GPS metadata and stores them with full EXIF data.
// Photos are stored as base64 in the database for cross-platform persistence.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const category = (formData.get("category") as string) || "DURING";
    const workOrderId = formData.get("workOrderId") as string | null;
    const latitude = formData.get("latitude") as string | null;
    const longitude = formData.get("longitude") as string | null;
    const altitude = formData.get("altitude") as string | null;
    const accuracy = formData.get("accuracy") as string | null;
    const capturedAt = formData.get("capturedAt") as string | null;
    const address = formData.get("address") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Enforce Subscription Storage limits
    const companyId = (session.user as any).companyId;
    const role = (session.user as any).role;

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

        if (currentMB + (file.size / (1024 * 1024)) > activeCompany.maxStorage) {
          return NextResponse.json(
            { error: `Storage limit reached (${activeCompany.maxStorage} MB). Please upgrade your subscription plan.` },
            { status: 403 }
          );
        }
      }
    }

    // Max 20MB for GPS photos
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 20MB)" },
        { status: 400 }
      );
    }

    // Convert to base64 for persistent storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:image/jpeg;base64,${buffer.toString("base64")}`;

    // Generate unique filename
    const filename = `gps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

    // Build metadata JSON
    const metadata: Record<string, any> = {
      capturedAt: capturedAt || new Date().toISOString(),
      uploadedBy: (session.user as any).id,
    };

    if (latitude && longitude) {
      metadata.gps = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        altitude: altitude ? parseFloat(altitude) : null,
        accuracy: accuracy ? parseFloat(accuracy) : null,
      };
    }

    if (address) {
      metadata.address = address;
    }

    // Create FileUpload record with base64 data
    const fileUpload = await prisma.fileUpload.create({
      data: {
        filename,
        originalName: file.name,
        mimeType: "image/jpeg",
        size: file.size,
        path: base64,
        data: base64,
        category: category as any,
        workOrderId: workOrderId || null,
        uploaderId: (session.user as any).id,
        companyId,
      },
    });

    // Log activity if linked to work order
    if (workOrderId) {
      await prisma.activityLog.create({
        data: {
          action: "GPS_PHOTO_UPLOADED",
          details: `GPS photo uploaded${metadata.gps ? ` at (${metadata.gps.latitude.toFixed(6)}, ${metadata.gps.longitude.toFixed(6)})` : ""}${address ? ` — ${address}` : ""}`,
          userId: (session.user as any).id,
          workOrderId,
          companyId,
        },
      });
    }

    return NextResponse.json({
      id: fileUpload.id,
      url: base64,
      filename,
      size: file.size,
      metadata,
    });
  } catch (error) {
    console.error("GPS photo upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}

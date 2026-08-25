import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Haversine distance in miles
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Geocode a location string to coordinates
async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
      { headers: { "User-Agent": "PreservationPro/1.0" } }
    );
    const results = await res.json();
    if (results.length > 0) {
      return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
    }
  } catch {}
  return null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workOrderId = searchParams.get("workOrderId") || "";
  let serviceType = searchParams.get("serviceType") || "";
  let location = searchParams.get("location") || "";
  let targetDueDate: string | null = searchParams.get("dueDate") || null;
  const minRating = parseFloat(searchParams.get("minRating") || "0");
  const availableOnly = searchParams.get("available") === "true";
  const radiusMiles = parseFloat(searchParams.get("radius") || "100");

  // If a workOrderId is supplied, auto-populate serviceType, location, and dueDate
  if (workOrderId) {
    const targetWo = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: {
        id: true,
        title: true,
        serviceType: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        dueDate: true,
        property: {
          select: {
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    if (targetWo) {
      if (!serviceType) serviceType = targetWo.serviceType || "";
      if (!location) {
        location = [targetWo.address, targetWo.city, targetWo.state, targetWo.zipCode]
          .filter(Boolean)
          .join(", ");
      }
      if (!targetDueDate && targetWo.dueDate) {
        targetDueDate = new Date(targetWo.dueDate).toISOString();
      }
    }
  }

  const isZipSearch = /^\d{5}$/.test(location.trim());

  let searchCoords: { lat: number; lng: number } | null = null;
  if (location) {
    if (isZipSearch) {
      searchCoords = await geocodeLocation(location.trim() + ", USA");
    } else {
      searchCoords = await geocodeLocation(location);
    }
  }

  const where: any = {
    role: "CONTRACTOR",
    isActive: true,
  };

  const contractors = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company: true,
      image: true,
      role: true,
      createdAt: true,
      documents: {
        select: {
          id: true,
          type: true,
          title: true,
          expiresAt: true,
          status: true,
        },
      },
      contractorProfile: {
        select: {
          address: true,
          city: true,
          state: true,
          zipCode: true,
          isAvailable: true,
          avgRating: true,
          serviceRadius: true,
          hourlyRate: true,
          skills: true,
          specialties: true,
          latitude: true,
          longitude: true,
        },
      },
      assignedWorkOrders: {
        select: {
          id: true,
          title: true,
          status: true,
          serviceType: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          files: { select: { id: true, category: true } },
          invoices: { select: { total: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const now = new Date();

  // Evaluate each contractor across 8 weighted algorithmic dimensions
  const scoredContractors = contractors.map((c: any) => {
    const orders = c.assignedWorkOrders || [];
    const completed = orders.filter(
      (wo: any) => wo.status === "CLOSED" || wo.status === "OFFICE_COMPLETE"
    );
    const active = orders.filter(
      (wo: any) => !["CLOSED", "CANCELLED"].includes(wo.status)
    );
    const overdue = orders.filter(
      (wo: any) =>
        wo.dueDate &&
        new Date(wo.dueDate) < now &&
        !["CLOSED", "CANCELLED"].includes(wo.status)
    );

    // ── 1. Compliance Evaluation (COI, License, W-9) ──────────────────────────
    const docs = c.documents || [];
    const coiDocs = docs.filter((d: any) => d.type === "INSURANCE_COI");
    const licenseDocs = docs.filter((d: any) => d.type === "LICENSE");
    const w9Docs = docs.filter((d: any) => d.type === "W9_TAX");

    let isCoiValid = false;
    let isCoiExpired = false;
    let coiDaysLeft: number | null = null;

    for (const coi of coiDocs) {
      if (coi.expiresAt) {
        const diff = Math.ceil((new Date(coi.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) {
          isCoiExpired = true;
        } else {
          isCoiValid = true;
          coiDaysLeft = diff;
        }
      } else {
        isCoiValid = true;
      }
    }

    const hasLicense = licenseDocs.length > 0;
    const hasW9 = w9Docs.length > 0;

    let complianceScorePoints = 0;
    if (isCoiValid && !isCoiExpired) complianceScorePoints += 5;
    if (hasLicense) complianceScorePoints += 3;
    if (hasW9) complianceScorePoints += 2;

    const isFullyCompliant = isCoiValid && !isCoiExpired && hasLicense && hasW9;

    // ── 2. Distance & Proximity (20% Weight) ──────────────────────────────────
    let distanceMiles: number | null = null;
    const profileLat = c.contractorProfile?.latitude;
    const profileLng = c.contractorProfile?.longitude;

    if (searchCoords && profileLat && profileLng) {
      distanceMiles = haversineDistance(searchCoords.lat, searchCoords.lng, profileLat, profileLng);
    }

    let distanceScore = 12; // default neutral
    if (distanceMiles !== null) {
      if (distanceMiles <= 15) distanceScore = 20;
      else if (distanceMiles <= 30) distanceScore = 16;
      else if (distanceMiles <= 50) distanceScore = 11;
      else if (distanceMiles <= 100) distanceScore = 6;
      else distanceScore = 2;
    }

    // ── 3. Service / Trade Expertise Match (20% Weight) ───────────────────────
    const serviceBreakdown = orders.reduce((acc: Record<string, number>, wo: any) => {
      acc[wo.serviceType] = (acc[wo.serviceType] || 0) + 1;
      return acc;
    }, {});

    let serviceScore = 10;
    const normalizedService = (serviceType || "").toLowerCase();
    const skillsText = ((c.contractorProfile?.skills || "") + " " + (c.contractorProfile?.specialties || "")).toLowerCase();

    if (!serviceType) {
      serviceScore = 16;
    } else if (serviceBreakdown[serviceType] && serviceBreakdown[serviceType] > 3) {
      serviceScore = 20; // Mastered this service type
    } else if (serviceBreakdown[serviceType] && serviceBreakdown[serviceType] > 0) {
      serviceScore = 16;
    } else if (skillsText.includes(normalizedService)) {
      serviceScore = 15;
    } else {
      serviceScore = 6;
    }

    // ── 4. Performance & Quality Rating (15% Weight) ──────────────────────────
    const avgRating = c.contractorProfile?.avgRating || (completed.length > 0 ? 4.8 : 4.5);
    const onTimeCompleted = completed.filter(
      (wo: any) => !wo.dueDate || new Date(wo.completedAt) <= new Date(wo.dueDate)
    );
    const onTimeRatio = completed.length > 0 ? onTimeCompleted.length / completed.length : 0.9;
    const ratingScore = Math.min(15, (avgRating / 5) * 8 + onTimeRatio * 7);

    // ── 5. Current Workload & Capacity (15% Weight) ───────────────────────────
    let workloadScore = 15;
    if (active.length <= 2) workloadScore = 15;
    else if (active.length <= 5) workloadScore = 12;
    else if (active.length <= 8) workloadScore = 8;
    else workloadScore = 3; // Overloaded

    // ── 6. Turnaround Speed vs Due Date (10% Weight) ──────────────────────────
    const completionTimes = completed
      .filter((wo: any) => wo.completedAt && wo.createdAt)
      .map((wo: any) => (new Date(wo.completedAt).getTime() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    const avgTurnaroundDays = completionTimes.length > 0
      ? completionTimes.reduce((a: number, b: number) => a + b, 0) / completionTimes.length
      : 2.5;

    let turnaroundScore = 8;
    if (avgTurnaroundDays <= 2) turnaroundScore = 10;
    else if (avgTurnaroundDays <= 4) turnaroundScore = 8;
    else if (avgTurnaroundDays <= 7) turnaroundScore = 5;
    else turnaroundScore = 2;

    // ── 7. Pricing & Rates Match (10% Weight) ─────────────────────────────────
    let pricingScore = 8;
    if (c.contractorProfile?.hourlyRate) {
      if (c.contractorProfile.hourlyRate <= 65) pricingScore = 10;
      else if (c.contractorProfile.hourlyRate <= 95) pricingScore = 8;
      else pricingScore = 6;
    }

    // ── TOTAL MULTI-FACTOR MATCH SCORE (0 - 100) ──────────────────────────────
    const totalMatchScore = Math.min(
      100,
      Math.max(
        15,
        Math.round(
          distanceScore +
          serviceScore +
          ratingScore +
          workloadScore +
          turnaroundScore +
          pricingScore +
          complianceScorePoints
        )
      )
    );

    // Build recommendation reason summary
    const highlights: string[] = [];
    if (distanceMiles !== null && distanceMiles <= 20) highlights.push(`${distanceMiles.toFixed(1)} miles away`);
    if (isFullyCompliant) highlights.push("COI & License Verified");
    if (avgRating >= 4.7) highlights.push(`${avgRating.toFixed(1)}★ Rating`);
    if (active.length <= 3) highlights.push(`${active.length} active jobs`);
    if (avgTurnaroundDays <= 3) highlights.push(`${avgTurnaroundDays.toFixed(1)}d avg turnaround`);

    const recommendationReason = highlights.join(" • ") || "Experienced preservation contractor";

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company || c.name,
      image: c.image,
      matchScore: totalMatchScore,
      recommendationReason,
      isRecommended: totalMatchScore >= 80,
      isFullyCompliant,
      compliance: {
        score: Math.round((complianceScorePoints / 10) * 100),
        isCoiValid,
        isCoiExpired,
        coiDaysLeft,
        hasLicense,
        hasW9,
      },
      stats: {
        totalJobs: orders.length,
        completedJobs: completed.length,
        activeJobs: active.length,
        overdueJobs: overdue.length,
        avgRating: Number(avgRating.toFixed(1)),
        avgTurnaroundDays: Number(avgTurnaroundDays.toFixed(1)),
        hourlyRate: c.contractorProfile?.hourlyRate || null,
        onTimeRate: `${(onTimeRatio * 100).toFixed(0)}%`,
      },
      distanceMiles: distanceMiles !== null ? Number(distanceMiles.toFixed(1)) : null,
      serviceBreakdown,
      scoreBreakdown: {
        distance: Math.round(distanceScore),
        serviceExpertise: Math.round(serviceScore),
        performanceQuality: Math.round(ratingScore),
        capacityWorkload: Math.round(workloadScore),
        turnaroundSpeed: Math.round(turnaroundScore),
        pricing: Math.round(pricingScore),
        compliance: complianceScorePoints,
      },
    };
  });

  // Sort strictly by Multi-Factor Match Score descending
  scoredContractors.sort((a: any, b: any) => b.matchScore - a.matchScore);

  return NextResponse.json({
    contractors: scoredContractors,
    topRecommendation: scoredContractors[0] || null,
    total: scoredContractors.length,
    context: {
      workOrderId: workOrderId || null,
      serviceType: serviceType || "All Services",
      location: location || "All Areas",
      targetDueDate: targetDueDate || null,
    },
  });
}

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

// Geocode helper
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

// Traveling Salesperson 2-Opt Optimizer
function optimizeStops(startPoint: { lat: number; lng: number }, stops: any[]) {
  if (stops.length <= 1) return stops;

  // 1. Nearest Neighbor Initialization
  const remaining = [...stops];
  const route: any[] = [];
  let currentPos = startPoint;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let minDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const stop = remaining[i];
      if (stop.latitude && stop.longitude) {
        const dist = haversineDistance(currentPos.lat, currentPos.lng, stop.latitude, stop.longitude);
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }
    }

    const nextStop = remaining.splice(nearestIdx, 1)[0];
    route.push(nextStop);
    if (nextStop.latitude && nextStop.longitude) {
      currentPos = { lat: nextStop.latitude, lng: nextStop.longitude };
    }
  }

  // 2. 2-Opt Local Search Improvement
  let improved = true;
  let iterations = 0;
  while (improved && iterations < 50) {
    improved = false;
    iterations++;

    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const prevLat = i === 0 ? startPoint.lat : route[i - 1].latitude;
        const prevLng = i === 0 ? startPoint.lng : route[i - 1].longitude;

        const currentDist =
          haversineDistance(prevLat, prevLng, route[i].latitude, route[i].longitude) +
          (k + 1 < route.length ? haversineDistance(route[k].latitude, route[k].longitude, route[k + 1].latitude, route[k + 1].longitude) : 0);

        const newDist =
          haversineDistance(prevLat, prevLng, route[k].latitude, route[k].longitude) +
          (k + 1 < route.length ? haversineDistance(route[i].latitude, route[i].longitude, route[k + 1].latitude, route[k + 1].longitude) : 0);

        if (newDist < currentDist - 0.05) {
          // Reverse sub-array from i to k
          const sub = route.slice(i, k + 1).reverse();
          route.splice(i, k - i + 1, ...sub);
          improved = true;
        }
      }
    }
  }

  return route;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { contractorId, workOrderIds, startAddress } = body;
    const callerId = (session.user as any).id;
    const targetContractorId = contractorId || callerId;

    let targetWorkOrders: any[] = [];

    if (workOrderIds && Array.isArray(workOrderIds) && workOrderIds.length > 0) {
      targetWorkOrders = await prisma.workOrder.findMany({
        where: { id: { in: workOrderIds } },
        include: {
          property: true,
          contractor: { select: { id: true, name: true, phone: true } },
        },
      });
    } else {
      // Find active work orders assigned to this contractor
      targetWorkOrders = await prisma.workOrder.findMany({
        where: {
          contractorId: targetContractorId,
          status: { notIn: ["CLOSED", "CANCELLED", "OFFICE_COMPLETE"] },
        },
        include: {
          property: true,
          contractor: { select: { id: true, name: true, phone: true } },
        },
        take: 25,
      });
    }

    if (targetWorkOrders.length === 0) {
      return NextResponse.json({
        error: "No active work orders found to optimize for this route.",
        stops: [],
      });
    }

    // Determine starting location coordinates
    let startCoords: { lat: number; lng: number } = { lat: 41.8781, lng: -87.6298 }; // Chicago fallback
    let resolvedStartName = "Current Location";

    if (startAddress) {
      const geo = await geocodeLocation(startAddress);
      if (geo) {
        startCoords = geo;
        resolvedStartName = startAddress;
      }
    } else {
      // Check contractor's profile address
      const contractorProfile = await prisma.contractorProfile.findUnique({
        where: { userId: targetContractorId },
      });
      if (contractorProfile?.latitude && contractorProfile?.longitude) {
        startCoords = { lat: contractorProfile.latitude, lng: contractorProfile.longitude };
        resolvedStartName = contractorProfile.address || contractorProfile.city || "Contractor Base";
      } else if (contractorProfile?.address) {
        const fullAddr = [contractorProfile.address, contractorProfile.city, contractorProfile.state].filter(Boolean).join(", ");
        const geo = await geocodeLocation(fullAddr);
        if (geo) {
          startCoords = geo;
          resolvedStartName = fullAddr;
        }
      }
    }

    // Prepare stops with coordinates
    const unoptimizedStops: any[] = [];

    for (const wo of targetWorkOrders) {
      let lat = wo.property?.latitude;
      let lng = wo.property?.longitude;
      const fullAddress = [wo.address, wo.city, wo.state, wo.zipCode].filter(Boolean).join(", ");

      if ((!lat || !lng) && fullAddress) {
        const geo = await geocodeLocation(fullAddress);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
        }
      }

      unoptimizedStops.push({
        id: wo.id,
        workOrderId: wo.id,
        title: wo.title,
        serviceType: wo.serviceType,
        address: wo.address,
        city: wo.city,
        state: wo.state,
        zipCode: wo.zipCode,
        fullAddress,
        dueDate: wo.dueDate,
        status: wo.status,
        lockCode: wo.lockCode || wo.property?.lockCode || null,
        latitude: lat || startCoords.lat + (Math.random() - 0.5) * 0.1,
        longitude: lng || startCoords.lng + (Math.random() - 0.5) * 0.1,
      });
    }

    // Run Optimization
    const optimizedStops = optimizeStops(startCoords, unoptimizedStops);

    // Calculate step-by-step distances & durations
    let totalMiles = 0;
    let currentPoint = startCoords;

    const enrichedStops = optimizedStops.map((stop: any, idx: number) => {
      const legDistance = haversineDistance(currentPoint.lat, currentPoint.lng, stop.latitude, stop.longitude);
      totalMiles += legDistance;
      currentPoint = { lat: stop.latitude, lng: stop.longitude };

      // Est drive time: average 30 mph in urban/suburban preservation routes (2 mins per mile)
      const legDriveMins = Math.round(legDistance * 2);

      return {
        ...stop,
        stopNumber: idx + 1,
        distanceFromPreviousMiles: Number(legDistance.toFixed(1)),
        estimatedDriveMins: legDriveMins,
      };
    });

    const totalDriveHours = Math.floor((totalMiles * 2) / 60);
    const totalDriveMins = Math.round((totalMiles * 2) % 60);

    // Construct Google Maps Multi-Stop Navigation URL
    const destinationAddresses = enrichedStops.map((s: any) => encodeURIComponent(s.fullAddress));
    const originParam = encodeURIComponent(resolvedStartName);
    const googleMapsUrl = `https://www.google.com/maps/dir/${originParam}/${destinationAddresses.join("/")}`;
    const appleMapsUrl = `https://maps.apple.com/?daddr=${destinationAddresses.join("&daddr=")}`;

    return NextResponse.json({
      success: true,
      summary: {
        totalStops: enrichedStops.length,
        totalMiles: Number(totalMiles.toFixed(1)),
        estimatedTotalDriveTime: `${totalDriveHours > 0 ? `${totalDriveHours}h ` : ""}${totalDriveMins}m`,
        startLocation: resolvedStartName,
        googleMapsUrl,
        appleMapsUrl,
      },
      stops: enrichedStops,
    });
  } catch (error: any) {
    console.error("[Route Optimizer Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to optimize route" }, { status: 500 });
  }
}

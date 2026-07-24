import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// This forces Vercel to let this specific API route run for up to 60 seconds
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let { phone, work_order_id, conversation_id, company_id } = body;

    if (!phone && !work_order_id) {
      return NextResponse.json({ error: "Missing required parameters phone or work_order_id" }, { status: 400 });
    }

    let workOrder = null;
    let targetWorkOrderId = work_order_id;

    if (targetWorkOrderId && targetWorkOrderId.toUpperCase().startsWith("WO-")) {
      const suffix = targetWorkOrderId.slice(3).toLowerCase();
      const match = await prisma.workOrder.findFirst({
        where: {
          id: { endsWith: suffix },
          ...(company_id ? { companyId: company_id } : {})
        },
        select: { id: true }
      });
      if (match) {
        targetWorkOrderId = match.id;
      }
    }

    // Reassign work_order_id so other logs/uses are correct
    work_order_id = targetWorkOrderId;

    if (work_order_id) {
      workOrder = await prisma.workOrder.findFirst({
        where: {
          id: work_order_id,
          ...(company_id ? { companyId: company_id } : {})
        },
        include: {
          contractor: { select: { name: true, phone: true } },
        },
      });
    } else if (phone) {
      // Find the contractor by phone matching within the specified tenant
      const contractors = await prisma.user.findMany({
        where: {
          role: "CONTRACTOR",
          ...(company_id ? { companyId: company_id } : {})
        },
        select: { id: true, name: true, phone: true },
      });

      const cleanTarget = phone.replace(/\D/g, "");
      const target10 = cleanTarget.length === 11 && cleanTarget.startsWith("1") ? cleanTarget.slice(1) : cleanTarget;

      const contractor = contractors.find((c) => {
        if (!c.phone) return false;
        const cleanDb = c.phone.replace(/\D/g, "");
        const db10 = cleanDb.length === 11 && cleanDb.startsWith("1") ? cleanDb.slice(1) : cleanDb;
        return db10 === target10;
      });

      if (contractor) {
        // Find latest active work order (status not CLOSED or CANCELLED)
        workOrder = await prisma.workOrder.findFirst({
          where: {
            contractorId: contractor.id,
            ...(company_id ? { companyId: company_id } : {}),
            status: {
              notIn: ["CLOSED", "CANCELLED"],
            },
          },
          include: {
            contractor: { select: { name: true, phone: true } },
          },
          orderBy: {
            createdAt: "desc",
          },
        });
      }
    }

    if (!workOrder) {
      return NextResponse.json({
        success: false,
        message: "No active work order found for the provided information.",
      });
    }

    // Create a call log if conversation_id is provided and doesn't exist
    if (conversation_id) {
      const existingCall = await prisma.callLog.findUnique({
        where: { id: conversation_id },
      });

      if (!existingCall) {
        const fallbackAdmin = await prisma.user.findFirst({
          where: { role: "ADMIN" },
          select: { id: true },
        }) || await prisma.user.findFirst({
          select: { id: true },
        });

        if (fallbackAdmin) {
          await prisma.callLog.create({
            data: {
              id: conversation_id,
              initiatorId: fallbackAdmin.id,
              recipientPhone: phone || workOrder.contractor?.phone || "Unknown",
              recipientName: workOrder.contractor?.name || "Contractor",
              recipientId: workOrder.contractorId,
              status: "IN_PROGRESS",
              startedAt: new Date(),
              purpose: `Inbound inquiry: ${workOrder.title}`,
            },
          }).catch((err) => {
            console.error("Failed to pre-create CallLog:", err);
          });
        }
      }
    }

    // Return filtered work order details without pricing/financial details
    return NextResponse.json({
      success: true,
      workOrder: {
        id: workOrder.id,
        title: workOrder.title,
        description: workOrder.description,
        address: workOrder.address,
        city: workOrder.city,
        state: workOrder.state,
        zipCode: workOrder.zipCode,
        serviceType: workOrder.serviceType,
        status: workOrder.status,
        dueDate: workOrder.dueDate ? workOrder.dueDate.toISOString() : null,
        lockCode: workOrder.lockCode,
        lockboxLocation: workOrder.lockboxLocation,
        gateCode: workOrder.gateCode,
        keyCode: workOrder.keyCode,
        keycodeLocation: workOrder.keycodeLocation,
        specialInstructions: workOrder.specialInstructions,
        tasks: workOrder.tasks,
        contractorName: workOrder.contractor?.name || "Unassigned",
      },
    });
  } catch (error: any) {
    console.error("Error in get_active_work_order webhook tool:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

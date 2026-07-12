import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  if (secret !== "seed123") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get some users (preferably contractors)
    const users = await prisma.user.findMany({ take: 3 });
    if (users.length === 0) {
      return NextResponse.json({ error: "No users found in DB to attach data to." }, { status: 400 });
    }

    let createdWOs = 0;
    let createdInvoices = 0;
    let createdTxs = 0;
    let createdWithdrawals = 0;

    // We'll create 10 demo work orders with client invoices over the last 30 days
    const serviceTypes: any[] = ["WINTERIZATION", "WINTERIZATION", "GRASS_CUT", "DEBRIS_REMOVAL", "BOARD_UP"];
    const cities = ["Dallas", "Houston", "Miami", "Atlanta", "Phoenix"];

    for (let i = 0; i < 15; i++) {
      const contractor = users[i % users.length];
      const randomDaysAgo = Math.floor(Math.random() * 45);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - randomDaysAgo);

      // Create Work Order
      const wo = await prisma.workOrder.create({
        data: {
          title: `${serviceTypes[i % serviceTypes.length].replace("_", " ")} at ${100 + i} Main St`,
          address: `${100 + i} Main St`,
          city: cities[i % cities.length],
          state: ["TX", "TX", "FL", "GA", "AZ"][i % 5],
          zipCode: `700${i}`,
          serviceType: serviceTypes[i % serviceTypes.length],
          status: "CLOSED",
          priority: 0,
          contractorId: contractor.id,
          createdAt: pastDate,
          updatedAt: pastDate,
        }
      });
      createdWOs++;

      // Create Client Invoice for Accounting Dashboard (Revenue)
      const invoiceTotal = Math.floor(Math.random() * 800) + 200;
      const statusOptions: any[] = ["PAID", "PAID", "PAID", "SENT", "DRAFT", "OVERDUE"];
      const invStatus = statusOptions[i % statusOptions.length];

      await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${1000 + i}`,
          workOrderId: wo.id,
          clientId: contractor.id,
          type: "CLIENT",
          status: invStatus,
          subtotal: invoiceTotal,
          total: invoiceTotal,
          createdAt: pastDate,
          updatedAt: pastDate,
          items: {
            create: [
              {
                taskName: "Labor",
                description: "General labor and prep",
                quantity: 2,
                unitPrice: invoiceTotal * 0.4 / 2,
                amount: invoiceTotal * 0.4
              },
              {
                taskName: "Materials",
                description: "Hardware and supplies",
                quantity: 1,
                unitPrice: invoiceTotal * 0.3,
                amount: invoiceTotal * 0.3
              },
              {
                taskName: "Trip Charge",
                description: "Mobilization",
                quantity: 1,
                unitPrice: invoiceTotal * 0.15,
                amount: invoiceTotal * 0.15
              },
              {
                taskName: "Debris Disposal",
                description: "Haul away and dump fee",
                quantity: 1,
                unitPrice: invoiceTotal * 0.15,
                amount: invoiceTotal * 0.15
              }
            ]
          }
        }
      });
      createdInvoices++;

      // Create Balance Transactions for the Contractor
      // e.g., They got credited for the job
      await prisma.balanceTransaction.create({
        data: {
          contractorId: contractor.id,
          type: "CREDIT",
          amount: invoiceTotal * 0.6, // Contractor keeps 60%
          description: `Payment for Work Order: ${wo.title}`,
          referenceId: wo.id,
          balanceAfter: 0, // Simplified for demo
          createdAt: pastDate,
        }
      });
      createdTxs++;

      // Randomly create some withdrawals
      if (i % 3 === 0) {
        await prisma.withdrawal.create({
          data: {
            contractorId: contractor.id,
            amount: Math.floor(Math.random() * 500) + 100,
            method: ["ACH", "WIRE", "ZELLE", "PAYPAL"][i % 4],
            status: ["COMPLETED", "PENDING", "PROCESSING"][i % 3],
            createdAt: pastDate,
            updatedAt: pastDate,
          }
        });
        createdWithdrawals++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully seeded ${createdWOs} Work Orders, ${createdInvoices} Invoices, ${createdTxs} Transactions, and ${createdWithdrawals} Withdrawals.` 
    });

  } catch (err: any) {
    console.error("Failed to seed finance data:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

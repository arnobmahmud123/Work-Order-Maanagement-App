import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const callerRole = (session.user as any).role;
    const isStaff = ["SUPER_ADMIN", "ADMIN", "COORDINATOR", "INCHARGE_COORDINATOR"].includes(callerRole);

    // Fetch all active contractors for the company (or specific contractor if not staff)
    const contractorWhere: any = {
      role: "CONTRACTOR",
      isActive: true,
    };
    if (companyId) {
      contractorWhere.companyId = companyId;
    }
    if (!isStaff) {
      contractorWhere.id = (session.user as any).id;
    }

    const contractors = await prisma.user.findMany({
      where: contractorWhere,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        documents: {
          select: {
            id: true,
            type: true,
            title: true,
            documentNumber: true,
            issuingAuthority: true,
            expiresAt: true,
            status: true,
            fileUrl: true,
          },
        },
      },
    });

    const now = new Date();
    const alerts: any[] = [];
    const contractorCompliance: any[] = [];

    for (const contractor of contractors) {
      const docs = contractor.documents || [];
      const coiDocs = docs.filter((d: any) => d.type === "INSURANCE_COI");
      const licenseDocs = docs.filter((d: any) => d.type === "LICENSE");
      const w9Docs = docs.filter((d: any) => d.type === "W9_TAX");

      let hasValidCoi = false;
      let coiStatus = "MISSING";
      let coiExpiry: Date | null = null;
      let coiDaysLeft: number | null = null;

      // Evaluate COI
      for (const coi of coiDocs) {
        if (coi.expiresAt) {
          const exp = new Date(coi.expiresAt);
          const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0) {
            coiStatus = "EXPIRED";
            alerts.push({
              contractorId: contractor.id,
              contractorName: contractor.name,
              documentType: "INSURANCE_COI",
              documentTitle: coi.title,
              severity: "CRITICAL",
              message: `Insurance COI (${coi.title}) expired ${Math.abs(diffDays)} days ago on ${exp.toLocaleDateString()}.`,
              daysLeft: diffDays,
            });
          } else if (diffDays <= 30) {
            hasValidCoi = true;
            coiStatus = "EXPIRING_SOON";
            coiExpiry = exp;
            coiDaysLeft = diffDays;
            alerts.push({
              contractorId: contractor.id,
              contractorName: contractor.name,
              documentType: "INSURANCE_COI",
              documentTitle: coi.title,
              severity: diffDays <= 7 ? "HIGH" : "MEDIUM",
              message: `Insurance COI (${coi.title}) will expire in ${diffDays} days on ${exp.toLocaleDateString()}.`,
              daysLeft: diffDays,
            });
          } else {
            hasValidCoi = true;
            coiStatus = "ACTIVE";
            coiExpiry = exp;
            coiDaysLeft = diffDays;
          }
        } else {
          hasValidCoi = true;
          coiStatus = "ACTIVE";
        }
      }

      // Evaluate License
      let hasValidLicense = false;
      let licenseStatus = "MISSING";
      for (const lic of licenseDocs) {
        if (lic.expiresAt) {
          const exp = new Date(lic.expiresAt);
          const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            licenseStatus = "EXPIRED";
            alerts.push({
              contractorId: contractor.id,
              contractorName: contractor.name,
              documentType: "LICENSE",
              documentTitle: lic.title,
              severity: "CRITICAL",
              message: `Trade License (${lic.title}) expired on ${exp.toLocaleDateString()}.`,
              daysLeft: diffDays,
            });
          } else if (diffDays <= 30) {
            hasValidLicense = true;
            licenseStatus = "EXPIRING_SOON";
            alerts.push({
              contractorId: contractor.id,
              contractorName: contractor.name,
              documentType: "LICENSE",
              documentTitle: lic.title,
              severity: "MEDIUM",
              message: `Trade License (${lic.title}) expires in ${diffDays} days.`,
              daysLeft: diffDays,
            });
          } else {
            hasValidLicense = true;
            licenseStatus = "ACTIVE";
          }
        } else {
          hasValidLicense = true;
          licenseStatus = "ACTIVE";
        }
      }

      // Evaluate W-9
      const hasW9 = w9Docs.length > 0;
      const isW9Verified = w9Docs.some((d: any) => d.status === "VERIFIED");

      // Calculate overall compliance score (0-100)
      let complianceScore = 0;
      if (hasValidCoi && coiStatus !== "EXPIRED") complianceScore += 45;
      if (hasValidLicense && licenseStatus !== "EXPIRED") complianceScore += 35;
      if (hasW9) complianceScore += 20;

      const isFullyCompliant = hasValidCoi && coiStatus !== "EXPIRED" && hasValidLicense && hasW9;

      contractorCompliance.push({
        id: contractor.id,
        name: contractor.name,
        email: contractor.email,
        phone: contractor.phone,
        company: contractor.company,
        complianceScore,
        isFullyCompliant,
        coi: {
          hasCoi: coiDocs.length > 0,
          status: coiStatus,
          expiry: coiExpiry,
          daysLeft: coiDaysLeft,
          document: coiDocs[0] || null,
        },
        license: {
          hasLicense: licenseDocs.length > 0,
          status: licenseStatus,
          document: licenseDocs[0] || null,
        },
        w9: {
          hasW9,
          isVerified: isW9Verified,
          document: w9Docs[0] || null,
        },
        totalDocuments: docs.length,
      });
    }

    return NextResponse.json({
      summary: {
        totalContractors: contractors.length,
        fullyCompliantCount: contractorCompliance.filter((c) => c.isFullyCompliant).length,
        totalAlerts: alerts.length,
        criticalAlertsCount: alerts.filter((a) => a.severity === "CRITICAL").length,
      },
      contractorCompliance,
      alerts,
    });
  } catch (error: any) {
    console.error("[Compliance API Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to calculate compliance" }, { status: 500 });
  }
}

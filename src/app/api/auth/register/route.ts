import { NextResponse } from "next/server";
import { hashSync } from "bcrypt-edge";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role, company, companyName, phone } = body;
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!name || !normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = hashSync(password, 8);
    const finalCompanyName = companyName || company || "My Company Preservation";

    const defaultBranding = JSON.stringify({
      logo: null,
      primaryColor: "#06b6d4",
      secondaryColor: "#3b82f6",
      name: finalCompanyName,
    });
    
    const defaultTheme = JSON.stringify({
      mode: "dark",
      colors: {
        background: "#090d16",
        card: "#0f172a",
      },
    });

    const defaultWOFormat = JSON.stringify({
      prefix: "WO-",
      counter: 1001,
    });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Company (tenant)
      const newCompany = await tx.company.create({
        data: {
          name: finalCompanyName,
          branding: defaultBranding,
          theme: defaultTheme,
          workOrderNumbering: defaultWOFormat,
          plan: "TRIAL",
          maxUsers: 5,
          maxVendors: 10,
          maxWorkOrders: 100,
        },
      });

      // 2. Create the User linked to the company
      const newUser = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          hashedPassword,
          role: "ADMIN", // Registering user is the Admin of their company
          company: finalCompanyName,
          companyId: newCompany.id,
          phone: phone || null,
        },
      });

      return { user: newUser, company: newCompany };
    });

    return NextResponse.json(
      { 
        id: result.user.id, 
        email: result.user.email, 
        name: result.user.name,
        companyId: result.company.id,
        companyName: result.company.name 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

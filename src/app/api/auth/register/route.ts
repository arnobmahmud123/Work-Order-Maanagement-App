import { NextResponse } from "next/server";
import { hashSync } from "bcrypt-edge";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role, company, phone } = body;
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

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        hashedPassword,
        role: [
          "CLIENT",
          "CONTRACTOR",
          "COORDINATOR",
          "PROCESSOR",
          "ADMIN",
        ].includes(role)
          ? role
          : "CLIENT",
        company: company || null,
        phone: phone || null,
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
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

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  context: any
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = context?.params ? await context.params : null;
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing work order ID" }, { status: 400 });
  }

  const submissions = await prisma.workOrderFormSubmission.findMany({
    where: { workOrderId: id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      formType: true,
      formName: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(submissions);
}

export async function POST(
  req: NextRequest,
  context: any
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = context?.params ? await context.params : null;
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing work order ID" }, { status: 400 });
  }

  const body = await req.json();
  const { formType, formName, formData } = body;

  if (!formType || !formName) {
    return NextResponse.json({ error: "formType and formName are required" }, { status: 400 });
  }

  const submission = await prisma.workOrderFormSubmission.create({
    data: {
      workOrderId: id,
      formType,
      formName,
      formData: formData ? JSON.stringify(formData) : "{}",
    },
  });

  return NextResponse.json(submission, { status: 201 });
}

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
  const formId = params?.formId;

  if (!id || !formId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const submission = await prisma.workOrderFormSubmission.findFirst({
    where: { id: formId, workOrderId: id },
  });

  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...submission,
    formData: (() => { try { return JSON.parse(submission.formData); } catch { return {}; } })(),
  });
}

export async function PUT(
  req: NextRequest,
  context: any
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = context?.params ? await context.params : null;
  const id = params?.id;
  const formId = params?.formId;

  if (!id || !formId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const body = await req.json();
  const { formData } = body;

  const submission = await prisma.workOrderFormSubmission.updateMany({
    where: { id: formId, workOrderId: id },
    data: { formData: JSON.stringify(formData ?? {}) },
  });

  if (submission.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  context: any
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = context?.params ? await context.params : null;
  const id = params?.id;
  const formId = params?.formId;

  if (!id || !formId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  await prisma.workOrderFormSubmission.deleteMany({
    where: { id: formId, workOrderId: id },
  });

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";

import { getTemplate } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  const template = await getTemplate(templateId);

  if (!template) {
    return NextResponse.json({ message: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

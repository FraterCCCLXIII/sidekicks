import { NextResponse } from "next/server";

import { getRun } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const run = await getRun(runId);

  if (!run) {
    return NextResponse.json({ message: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}

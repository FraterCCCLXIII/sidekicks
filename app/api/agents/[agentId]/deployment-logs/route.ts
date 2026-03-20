import { NextResponse } from "next/server";

import { getDeploymentLogs } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  return NextResponse.json(await getDeploymentLogs(agentId));
}

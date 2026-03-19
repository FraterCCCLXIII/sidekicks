import { NextResponse } from "next/server";

import { getAgent } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const agent = await getAgent(agentId);

  if (!agent) {
    return NextResponse.json({ message: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json(agent);
}

import { NextResponse } from "next/server";

import { getAgent, redeployAgent, removeAgent } from "@/lib/server/services";

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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const result = await removeAgent(agentId);

  if (!result.deleted) {
    return NextResponse.json({ message: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };

  if (body.action !== "redeploy") {
    return NextResponse.json({ message: "Unsupported agent action" }, { status: 400 });
  }

  const result = await redeployAgent(agentId);

  if (!result.queued) {
    return NextResponse.json({ message: result.message ?? "Redeploy failed" }, { status: 404 });
  }

  return NextResponse.json(result);
}

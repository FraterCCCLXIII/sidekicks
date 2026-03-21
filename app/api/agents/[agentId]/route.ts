import { NextResponse } from "next/server";

import { getAgent, redeployAgent, removeAgent, setAgentPaused } from "@/lib/server/services";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const body = (await request.json().catch(() => ({}))) as { paused?: boolean; mode?: "now" | "after" };

  if (typeof body.paused !== "boolean") {
    return NextResponse.json({ message: "Invalid pause state" }, { status: 400 });
  }

  const force = body.mode === "now";
  const agent = await setAgentPaused(agentId, body.paused, force);

  if (!agent) {
    return NextResponse.json({ message: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json(agent);
}

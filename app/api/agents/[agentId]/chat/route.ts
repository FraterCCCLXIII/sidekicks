import { NextResponse } from "next/server";

import { listChatMessages, sendChatMessage } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  return NextResponse.json(await listChatMessages(agentId));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const body = (await request.json()) as { content: string };

  return NextResponse.json(await sendChatMessage(agentId, body.content), { status: 201 });
}

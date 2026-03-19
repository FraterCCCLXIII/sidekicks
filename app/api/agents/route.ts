import { NextResponse } from "next/server";

import { type DeployRequest } from "@/lib/domain/types";
import { createAgent, listAgents } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listAgents());
}

export async function POST(request: Request) {
  const body = (await request.json()) as DeployRequest;
  return NextResponse.json(await createAgent(body), { status: 201 });
}

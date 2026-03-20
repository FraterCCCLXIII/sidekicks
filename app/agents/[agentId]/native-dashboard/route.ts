import { NextResponse } from "next/server";

import { getAgent } from "@/lib/server/services";

export const dynamic = "force-dynamic";

function toHostDashboardUrl(endpoint: string, token: string) {
  const upstream = new URL(endpoint);
  const host = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : "localhost";
  const port = upstream.port || "80";
  return `http://${host}:${port}/#token=${encodeURIComponent(token)}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const agent = await getAgent(agentId);

  if (!agent?.deployment) {
    return NextResponse.json({ message: "Deployment not found" }, { status: 404 });
  }

  const deployment = agent.deployment;

  if (
    deployment.runtimeAdapter !== "openclaw-upstream" ||
    !deployment.endpoint ||
    !deployment.nativeDashboardToken
  ) {
    return NextResponse.json({ message: "Native dashboard unavailable" }, { status: 404 });
  }

  return NextResponse.redirect(toHostDashboardUrl(deployment.endpoint, deployment.nativeDashboardToken));
}

import { NextResponse } from "next/server";

import { listState } from "@/lib/server/backend";

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
  const state = await listState();
  const deployment = state.deployments.find((item) => item.agentId === agentId) ?? null;

  if (!deployment) {
    return NextResponse.json({ message: "Deployment not found" }, { status: 404 });
  }

  if (
    (deployment.runtimeAdapter !== "openclaw-upstream" && deployment.runtimeAdapter !== "nemoclaw") ||
    !deployment.endpoint ||
    !deployment.runtimeAuth?.token
  ) {
    return NextResponse.json({ message: "Native dashboard unavailable" }, { status: 404 });
  }

  return NextResponse.redirect(toHostDashboardUrl(deployment.endpoint, deployment.runtimeAuth.token));
}

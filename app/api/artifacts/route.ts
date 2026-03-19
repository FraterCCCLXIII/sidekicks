import { NextResponse } from "next/server";

import { getArtifactById, listArtifacts } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listArtifacts());
}

export async function POST(request: Request) {
  const body = (await request.json()) as { artifactId: string };
  const artifact = await getArtifactById(body.artifactId);

  if (!artifact) {
    return NextResponse.json({ message: "Artifact not found" }, { status: 404 });
  }

  return NextResponse.json(artifact);
}

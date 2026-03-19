import { NextResponse } from "next/server";

import { getArtifactById } from "@/lib/server/services";
import { getArtifactObject } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ artifactId: string }> }
) {
  const { artifactId } = await params;
  const artifact = await getArtifactById(artifactId);

  if (!artifact) {
    return NextResponse.json({ message: "Artifact not found" }, { status: 404 });
  }

  const object = await getArtifactObject(artifact.storageKey);

  if (!object?.Body) {
    return NextResponse.json({ message: "Artifact file not found" }, { status: 404 });
  }

  const bytes = await object.Body.transformToByteArray();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": object.ContentType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${artifact.name}"`
    }
  });
}

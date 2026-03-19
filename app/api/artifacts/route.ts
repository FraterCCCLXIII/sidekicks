import { NextResponse } from "next/server";

import { listArtifacts } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listArtifacts());
}

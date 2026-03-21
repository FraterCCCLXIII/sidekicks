import { NextResponse } from "next/server";

import { getClusterSummary } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getClusterSummary());
}


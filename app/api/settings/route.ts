import { NextResponse } from "next/server";

import { getSettings } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getSettings());
}

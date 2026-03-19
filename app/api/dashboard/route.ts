import { NextResponse } from "next/server";

import { getDashboard } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getDashboard());
}

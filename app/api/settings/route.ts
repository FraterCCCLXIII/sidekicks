import { NextResponse } from "next/server";

import { type LlmProfileInput } from "@/lib/domain/types";
import { addLlmProfile, getSettings } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getSettings());
}

export async function POST(request: Request) {
  const body = (await request.json()) as LlmProfileInput;
  return NextResponse.json(await addLlmProfile(body), { status: 201 });
}

import { NextResponse } from "next/server";

import { type LlmProfileInput, type LlmProfileUpdateInput } from "@/lib/domain/types";
import { addLlmProfile, editLlmProfile, getSettings, removeLlmProfile } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getSettings());
}

export async function POST(request: Request) {
  const body = (await request.json()) as LlmProfileInput;
  return NextResponse.json(await addLlmProfile(body), { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as LlmProfileUpdateInput;
  return NextResponse.json(await editLlmProfile(body));
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const profileId = url.searchParams.get("profileId");

  if (!profileId) {
    return NextResponse.json({ message: "profileId is required" }, { status: 400 });
  }

  return NextResponse.json(await removeLlmProfile(profileId));
}

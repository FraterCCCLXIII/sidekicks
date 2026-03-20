import { NextResponse } from "next/server";

import { createJob, listJobs } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listJobs());
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    agentId: string;
    agentName?: string;
    title: string;
    input: {
      prompt: string;
      files?: string[];
      params?: Record<string, string>;
    };
  };

  return NextResponse.json(await createJob(body), { status: 201 });
}

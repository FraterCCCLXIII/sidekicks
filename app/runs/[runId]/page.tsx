import { RunDetailPage } from "@/components/runs/run-detail-page";

export default async function Page({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;

  return <RunDetailPage runId={runId} />;
}

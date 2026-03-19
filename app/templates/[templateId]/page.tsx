import { TemplateDetailPage } from "@/components/templates/template-detail-page";

export default async function Page({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;

  return <TemplateDetailPage templateId={templateId} />;
}

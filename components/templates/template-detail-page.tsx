"use client";

import { ArrowLeft, Box, Code2, Container, Cpu, FileSearch, GitBranch, Rocket, WandSparkles } from "lucide-react";
import Link from "next/link";

import { DeployAgentDialog } from "@/components/deploy-agent-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTemplate } from "@/hooks/use-sidekicks-data";

const templateIcons: Record<string, typeof FileSearch> = {
  OpenClaw: FileSearch,
  NanoClaw: Cpu,
  NemoClaw: Rocket,
  AppClaw: Code2,
  MarketingClaw: WandSparkles,
  DataClaw: Box
};

export function TemplateDetailPage({ templateId }: { templateId: string }) {
  const { data } = useTemplate(templateId);

  if (!data) {
    return null;
  }

  const Icon = templateIcons[data.name] ?? FileSearch;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/templates" className="text-sm text-foreground/70 hover:text-foreground">
          <ArrowLeft className="mr-1 inline h-4 w-4" />
          Back to templates
        </Link>
      </div>

      <section className="panel overflow-hidden">
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <Badge>{data.kind === "runtime" ? "Runtime Package" : "Preset Template"}</Badge>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{data.name}</h1>
            <p className="mt-3 max-w-3xl text-base text-muted-foreground">{data.description}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <Badge key={tag} tone="muted">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="mt-6">
              <DeployAgentDialog template={data} triggerLabel="Deploy Runtime" />
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Package</div>
              <div className="mt-2 font-mono text-sm">{data.packageName}</div>
              <div className="mt-1 text-sm text-muted-foreground">v{data.packageVersion}</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Runtime Image</div>
              <div className="mt-2 font-mono text-sm break-all">{data.runtimeImage}</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Execution</div>
              <div className="mt-2 text-sm">
                {data.runtimeType} runtime • {data.isolationMode} isolation
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Deployment Contract</CardTitle>
            <CardDescription>What this runtime expects when the control plane schedules a worker run.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GitBranch className="h-4 w-4" />
                  Source repo
                </div>
                <div className="mt-2 text-sm">{data.sourceRepo}</div>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Rocket className="h-4 w-4" />
                  Queue target
                </div>
                <div className="mt-2 text-sm">{data.deploymentConfig.workerQueue}</div>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Container className="h-4 w-4" />
                  Startup command
                </div>
                <div className="mt-2 font-mono text-sm">{data.deploymentConfig.startupCommand}</div>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="text-sm text-muted-foreground">Recommended concurrency</div>
                <div className="mt-2 text-xl font-semibold">{data.deploymentConfig.recommendedConcurrency}</div>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="text-sm text-muted-foreground">Example use cases</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.exampleUseCases.map((useCase) => (
                  <Badge key={useCase} tone="muted">
                    {useCase}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Required Config</CardTitle>
            <CardDescription>Environment fields and runtime prerequisites surfaced to the operator.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.configSchema.env.map((field) => (
              <div key={field.key} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-mono text-sm">{field.key}</div>
                  <Badge tone={field.required ? "warning" : "muted"}>{field.required ? "Required" : "Optional"}</Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{field.description}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { ExternalLink, FileText, Gauge, Link2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRunDetail } from "@/hooks/use-sidekicks-data";
import { statusLabel, statusTone } from "@/lib/presentation";

export function RunDetailPage({ runId }: { runId: string }) {
  const { data } = useRunDetail(runId);

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.3fr_0.8fr] lg:px-8">
          <div>
            <Badge>Observability</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Run: {data.id}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge tone={statusTone(data.status)}>{statusLabel(data.status)}</Badge>
              <span>Agent: {data.template}</span>
              <span>Duration: {data.duration}</span>
              <span>Started: {data.startedAt}</span>
            </div>
          </div>

          <div className="panel-muted grid gap-3 p-5">
            <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div>
                <div className="text-sm text-muted-foreground">Model</div>
                <div className="mt-1 font-medium">{data.model}</div>
              </div>
              <Gauge className="h-5 w-5 text-foreground" />
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="text-sm text-muted-foreground">Tools</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.tools.map((tool) => (
                  <Badge key={tool} tone="muted">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="output">Output</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs</CardTitle>
              <CardDescription>Streaming execution output for live debugging.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-white/[0.08] bg-slate-950/80 p-4">
                <div className="space-y-3 font-mono text-sm">
                  {data.logs.map((line) => (
                    <div key={line} className="text-white/[0.72]">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="steps">
          <Card>
            <CardHeader>
              <CardTitle>Steps</CardTitle>
              <CardDescription>Structured execution phases with current state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
                >
                  <div>
                    <div className="font-medium">{step.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{step.detail}</div>
                  </div>
                  <Badge
                    tone={statusTone(
                      step.state === "done"
                        ? "completed"
                        : step.state === "active"
                          ? "running"
                          : step.state === "failed"
                            ? "failed"
                            : "queued"
                    )}
                  >
                    {step.state}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="output">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>{data.output.title}</CardTitle>
                <CardDescription>Markdown report / files / links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <div className="flex items-center gap-3 text-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Report summary</span>
                  </div>
                  <p className="mt-3 leading-7 text-muted-foreground">{data.output.summary}</p>
                </div>
                <div className="space-y-3">
                  {data.output.highlights.map((highlight) => (
                    <div key={highlight} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                      {highlight}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Artifacts & Links</CardTitle>
                <CardDescription>Shareable outputs generated by this run.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.output.links.map((link) => (
                  <div
                    key={link.label}
                    className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Link2 className="h-4 w-4 text-foreground" />
                      <span>{link.label}</span>
                    </div>
                    <a href={link.href} className="text-sm text-foreground/80 hover:text-foreground">
                      Open
                      <ExternalLink className="ml-1 inline h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

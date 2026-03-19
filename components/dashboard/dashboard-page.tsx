"use client";

import { Activity, ArrowRight, Bot, CheckCircle2, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DeployAgentDialog } from "@/components/deploy-agent-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDashboardData } from "@/hooks/use-sidekicks-data";
import { statusLabel, statusTone } from "@/lib/presentation";

const statCards = [
  { key: "activeAgents", label: "Active Agents", icon: Bot },
  { key: "jobsRunning", label: "Jobs Running", icon: Activity },
  { key: "successRate", label: "Success Rate", icon: CheckCircle2 }
] as const;

export function DashboardPage() {
  const { data } = useDashboardData();
  const [lastDeployment, setLastDeployment] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden">
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.4fr_0.8fr] lg:px-8">
          <div>
            <Badge>Control Plane</Badge>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Deploy and manage AI agents as easily as deploying an app.
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              Sidekicks keeps templates, agents, runs, and artifacts in one fast operator view, with
              observability built into every launch.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <DeployAgentDialog triggerLabel="Deploy Agent" onDeployed={setLastDeployment} />
              <Link
                href="/templates"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-medium text-foreground transition hover:bg-white/[0.04]"
              >
                Browse Templates
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="panel-muted flex flex-col justify-between p-5">
            <div>
              <div className="text-sm text-muted-foreground">Live cluster snapshot</div>
              <div className="mt-2 text-2xl font-semibold">4 running jobs across 3 regions</div>
            </div>
            <div className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                Median deployment time <span className="block pt-1 text-lg text-foreground">38s</span>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                Artifact retention <span className="block pt-1 text-lg text-foreground">14 days</span>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                {lastDeployment ? (
                  <>
                    Last deployed <span className="block pt-1 text-lg text-foreground">{lastDeployment}</span>
                  </>
                ) : (
                  <>
                    Ready to deploy <span className="block pt-1 text-lg text-foreground">5 templates</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {statCards.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="mt-2 text-3xl">
                  {data ? data.stats[key] : "--"}
                </CardTitle>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent Runs</CardTitle>
              <CardDescription>Click into a run for logs, steps, and output.</CardDescription>
            </div>
            <Link href="/runs" className="text-sm text-foreground/80 hover:text-foreground">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-white/[0.08]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run ID</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">
                        <Link href={`/runs/${run.id}`} className="hover:text-foreground">
                          {run.id}
                        </Link>
                      </TableCell>
                      <TableCell>{run.agent}</TableCell>
                      <TableCell>
                        <Badge tone={statusTone(run.status)}>{statusLabel(run.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{run.startedAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Quick Templates</CardTitle>
              <CardDescription>Jump-start the most common workloads.</CardDescription>
            </div>
            <PlayCircle className="h-5 w-5 text-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.templates.map((template) => (
              <div
                key={template.id}
                className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{template.description}</div>
                  </div>
                  <Badge tone="muted">{template.model}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <Badge key={tag} tone="muted">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <DeployAgentDialog template={template} triggerLabel="Deploy" />
                  <Link href="/templates" className="text-sm font-medium text-foreground/80 hover:text-foreground">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

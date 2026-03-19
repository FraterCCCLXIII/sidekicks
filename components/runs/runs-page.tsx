"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRuns } from "@/hooks/use-sidekicks-data";
import { statusLabel, statusTone } from "@/lib/presentation";

export function RunsPage() {
  const { data } = useRuns();
  const [status, setStatus] = useState("all");
  const [agent, setAgent] = useState("all");
  const [date, setDate] = useState("");

  const agents = useMemo(
    () => Array.from(new Set((data ?? []).map((run) => run.agent))),
    [data]
  );

  const filteredRuns = useMemo(() => {
    return (data ?? []).filter((run) => {
      if (status !== "all" && run.status !== status) {
        return false;
      }

      if (agent !== "all" && run.agent !== agent) {
        return false;
      }

      if (date && !run.startedAt.toLowerCase().includes(date.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [agent, data, date, status]);

  return (
    <div className="space-y-6">
      <div>
        <Badge>Jobs</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Runs</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Trace every execution across status, duration, and downstream output.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Status, agent, and date shortcuts for operational triage.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <select
              className="flex h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm outline-none"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All</option>
              <option value="running">Running</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="queued">Queued</option>
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Agent</span>
            <select
              className="flex h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm outline-none"
              value={agent}
              onChange={(event) => setAgent(event.target.value)}
            >
              <option value="all">All agents</option>
              {agents.map((agentOption) => (
                <option key={agentOption} value={agentOption}>
                  {agentOption}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Date</span>
            <Input placeholder="e.g. 1 hr ago" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Runs</CardTitle>
          <CardDescription>Run ID, agent, status, duration, and direct observability links.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-white/[0.08]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run ID</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.id}</TableCell>
                    <TableCell>{run.agent}</TableCell>
                    <TableCell>
                      <Badge tone={statusTone(run.status)}>{statusLabel(run.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{run.duration}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/runs/${run.id}`}
                        className="text-sm font-medium text-foreground/80 hover:text-foreground"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

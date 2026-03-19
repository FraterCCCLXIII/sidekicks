"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAgents } from "@/hooks/use-sidekicks-data";
import { statusLabel, statusTone } from "@/lib/presentation";

export function AgentsPage() {
  const { data } = useAgents();

  return (
    <div className="space-y-6">
      <div>
        <Badge>Fleet</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Agents</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Inspect deployed agents, current job pressure, and runtime health across templates.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deployed Agents</CardTitle>
          <CardDescription>Name, template, status, queued jobs, and quick links.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-white/[0.08]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Jobs</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>{agent.template}</TableCell>
                    <TableCell>
                      <Badge tone={statusTone(agent.status)}>{statusLabel(agent.status)}</Badge>
                    </TableCell>
                    <TableCell>{agent.jobs}</TableCell>
                    <TableCell className="text-muted-foreground">{agent.region}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/agents/${agent.id}`}
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

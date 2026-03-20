"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteAgent, useAgents } from "@/hooks/use-sidekicks-data";
import { statusLabel, statusTone } from "@/lib/presentation";

export function AgentsPage() {
  const { data } = useAgents();
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteAgent,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["agents"] }),
        queryClient.invalidateQueries({ queryKey: ["runs"] }),
        queryClient.invalidateQueries({ queryKey: ["artifacts"] })
      ]);
    }
  });

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
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/agents/${agent.id}`}
                          className="text-sm font-medium text-foreground/80 hover:text-foreground"
                        >
                          View
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-300 hover:bg-red-500/10 hover:text-red-200"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (!window.confirm(`Delete agent \"${agent.name}\" and its runtime container?`)) {
                              return;
                            }

                            deleteMutation.mutate(agent.id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
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

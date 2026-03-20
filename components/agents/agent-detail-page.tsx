"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Clock3, ExternalLink, MessageSquareText, PlayCircle, Send, Server, TerminalSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createJob, deleteAgent, redeployAgent, sendAgentChatMessage, useAgent, useAgentChat } from "@/hooks/use-sidekicks-data";
import { statusLabel, statusTone } from "@/lib/presentation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AgentDetailPage({ agentId }: { agentId: string }) {
  const { data } = useAgent(agentId);
  const { data: chatMessages } = useAgentChat(agentId);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [title, setTitle] = useState("New run");
  const [prompt, setPrompt] = useState("");
  const [chatInput, setChatInput] = useState("");

  const jobMutation = useMutation({
    mutationFn: createJob,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["agents"] }),
        queryClient.invalidateQueries({ queryKey: ["agents", agentId] }),
        queryClient.invalidateQueries({ queryKey: ["agents", agentId, "chat"] }),
        queryClient.invalidateQueries({ queryKey: ["runs"] }),
        queryClient.invalidateQueries({ queryKey: ["artifacts"] })
      ]);
      router.push(`/runs/${result.run.id}`);
    }
  });
  const chatMutation = useMutation({
    mutationFn: (content: string) => sendAgentChatMessage(agentId, content),
    onSuccess: async () => {
      setChatInput("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agents", agentId] }),
        queryClient.invalidateQueries({ queryKey: ["agents", agentId, "chat"] })
      ]);
    }
  });
  const deleteMutation = useMutation({
    mutationFn: deleteAgent,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["agents"] }),
        queryClient.invalidateQueries({ queryKey: ["runs"] }),
        queryClient.invalidateQueries({ queryKey: ["artifacts"] })
      ]);
      router.push("/agents");
    }
  });
  const redeployMutation = useMutation({
    mutationFn: redeployAgent,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["agents"] }),
        queryClient.invalidateQueries({ queryKey: ["agents", agentId] }),
        queryClient.invalidateQueries({ queryKey: ["agents", agentId, "chat"] }),
        queryClient.invalidateQueries({ queryKey: ["runs"] }),
        queryClient.invalidateQueries({ queryKey: ["artifacts"] })
      ]);
    }
  });

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/agents" className="text-sm text-foreground/70 hover:text-foreground">
          Back to agents
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={redeployMutation.isPending}
            onClick={() => redeployMutation.mutate(agentId)}
          >
            Redeploy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-300 hover:bg-red-500/10 hover:text-red-200"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (!window.confirm(`Delete agent \"${data.name}\" and its runtime container?`)) {
                return;
              }

              deleteMutation.mutate(agentId);
            }}
          >
            Delete Agent
          </Button>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <Badge>Agent Instance</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{data.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge tone={statusTone(data.status)}>{statusLabel(data.status)}</Badge>
              <span>{data.template}</span>
              <span>{data.runtimeType} runtime</span>
              <span>{data.region}</span>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="text-sm text-muted-foreground">Model</div>
              <div className="mt-2 font-medium">{data.model}</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="text-sm text-muted-foreground">Memory</div>
              <div className="mt-2 font-medium">{data.memory}</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="text-sm text-muted-foreground">Created</div>
              <div className="mt-2 font-medium">{data.createdAt}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Agent Interaction</CardTitle>
            <CardDescription>Chat with the deployed runtime or queue a structured run.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="chat">
              <TabsList>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="job">Create Job</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="space-y-4">
                <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  {(chatMessages ?? data.chatMessages).map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[88%] rounded-xl border px-4 py-3 text-sm ${
                        message.role === "user"
                          ? "ml-auto border-white/[0.14] bg-white/[0.08] text-foreground"
                          : "border-white/[0.08] bg-black/20 text-foreground/90"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        <span>{message.role}</span>
                        <span>{message.createdAt}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <textarea
                    className="min-h-32 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-white/20 focus:ring-2 focus:ring-white/10"
                    placeholder="Message this agent..."
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                  />
                  <Button onClick={() => chatMutation.mutate(chatInput)} disabled={chatMutation.isPending || !chatInput.trim()}>
                    <Send className="h-4 w-4" />
                    {chatMutation.isPending ? "Sending..." : "Send message"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="job" className="space-y-4">
                <label className="space-y-2 text-sm">
                  <span className="text-muted-foreground">Job title</span>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-muted-foreground">Prompt</span>
                  <textarea
                    className="min-h-40 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-white/20 focus:ring-2 focus:ring-white/10"
                    placeholder="Describe the task to execute..."
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                  />
                </label>
                <Button
                  onClick={() =>
                    jobMutation.mutate({
                      agentId: data.id,
                      agentName: data.name,
                      title,
                      input: {
                        prompt
                      }
                    })
                  }
                  disabled={jobMutation.isPending || !title.trim() || !prompt.trim()}
                >
                  <PlayCircle className="h-4 w-4" />
                  {jobMutation.isPending ? "Queuing..." : "Create Job"}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deployment</CardTitle>
            <CardDescription>Runtime health, endpoint, and configuration for this deployed agent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquareText className="h-4 w-4" />
                Deployment status
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Badge tone={data.deployment ? statusTone(data.deployment.status) : "muted"}>
                  {data.deployment ? statusLabel(data.deployment.status) : "Unavailable"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {data.deployment?.endpoint ?? "No runtime endpoint attached"}
                </span>
                {data.deployment?.nativeDashboardUrl ? (
                  <a
                    href={data.deployment.nativeDashboardUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground"
                  >
                    Open Native Dashboard
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
              {data.deployment ? (
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <div>
                    Image: <span className="text-foreground/80">{data.deployment.image}</span>
                  </div>
                  <div>
                    Container: <span className="font-mono text-foreground/80">{data.deployment.containerId ?? "pending"}</span>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Server className="h-4 w-4" />
                Runtime
              </div>
              <div className="mt-2">{data.runtimeType}</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bot className="h-4 w-4" />
                Tools
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.tools.map((tool) => (
                  <Badge key={tool} tone="muted">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TerminalSquare className="h-4 w-4" />
                Env Vars
              </div>
              <div className="mt-3 space-y-2">
                {data.envVars.map((envVar) => (
                  <div key={envVar.key} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{envVar.key}</span>
                    <span className="text-muted-foreground">{envVar.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
          <CardDescription>The latest runs for this agent, refreshed automatically while jobs are active.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.recentRuns.map((run) => (
            <div
              key={run.id}
              className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="font-medium">{run.id}</div>
                <div className="mt-1 text-sm text-muted-foreground">{run.template}</div>
              </div>
              <div className="flex items-center gap-4">
                <Badge tone={statusTone(run.status)}>{statusLabel(run.status)}</Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                  {run.startedAt}
                </div>
                <Link href={`/runs/${run.id}`} className="text-sm font-medium text-foreground/80 hover:text-foreground">
                  View
                </Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

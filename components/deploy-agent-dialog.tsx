"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Rocket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { createAgent } from "@/hooks/use-sidekicks-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { type AgentMemoryType, type AgentTool } from "@/lib/domain/types";
import { type TemplateListItemView } from "@/lib/server/presenters";

const toolOptions: { label: string; value: AgentTool }[] = [
  { label: "Web", value: "web" },
  { label: "Browser", value: "browser" },
  { label: "Files", value: "files" },
  { label: "Code", value: "code" },
  { label: "Filesystem", value: "filesystem" },
  { label: "Python", value: "python" },
  { label: "Charts", value: "charts" },
  { label: "API", value: "api" },
  { label: "Webhooks", value: "webhooks" }
];

const memoryOptions: AgentMemoryType[] = ["redis", "postgres", "in-memory"];

function labelize(value: string) {
  if (value === "api") {
    return "API";
  }

  if (value === "filesystem") {
    return "Filesystem";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function DeployAgentDialog({
  template,
  triggerLabel = "Deploy Agent",
  onDeployed
}: {
  template?: TemplateListItemView;
  triggerLabel?: string;
  onDeployed?: (name: string) => void;
}) {
  const baseName = useMemo(
    () => template?.name.toLowerCase().replace(/\s+/g, "-") ?? "research-agent",
    [template]
  );
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`${baseName}-1`);
  const [model, setModel] = useState(template?.model ?? "GPT-4o");
  const [memory, setMemory] = useState<AgentMemoryType>("redis");
  const [tools, setTools] = useState<AgentTool[]>(template?.tools ?? ["web", "files"]);
  const [envVars, setEnvVars] = useState([
    { key: "REPORT_MODE", value: "verbose" },
    { key: "CACHE_TTL", value: "300" }
  ]);

  useEffect(() => {
    setName(`${baseName}-1`);
    setModel(template?.model ?? "GPT-4o");
    setTools(template?.tools ?? ["web", "files"]);
  }, [baseName, template]);

  const mutation = useMutation({
    mutationFn: createAgent,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["agents"] })
      ]);
      onDeployed?.(result.name);
      setOpen(false);
    }
  });

  function toggleTool(tool: AgentTool) {
    setTools((current) =>
      current.includes(tool) ? current.filter((item) => item !== tool) : [...current, tool]
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deploy: {template?.name ?? "Research Agent"}</DialogTitle>
          <DialogDescription>
            Launch an agent instance with production defaults and queue-ready runtime settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 pb-2">
          {template ? (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <div className="font-mono text-sm">{template.packageName}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                v{template.packageVersion} • image {template.runtimeImage}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Name</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Model</span>
              <select
                className="flex h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-white/20"
                value={model}
                onChange={(event) => setModel(event.target.value)}
              >
                <option>GPT-4o</option>
                <option>GPT-4.1</option>
                <option>GPT-4o mini</option>
                <option>Claude 3.5 Sonnet</option>
              </select>
            </label>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Tools</div>
            <div className="flex flex-wrap gap-2">
              {toolOptions.map((tool) => {
                const selected = tools.includes(tool.value);

                return (
                  <button
                    key={tool.value}
                    type="button"
                    onClick={() => toggleTool(tool.value)}
                    className={`rounded-md border px-3 py-2 text-sm transition ${
                      selected
                        ? "border-white/[0.16] bg-white/[0.08] text-foreground"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground"
                    }`}
                  >
                    {tool.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Memory</span>
            <select
              className="flex h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-white/20"
              value={memory}
              onChange={(event) => setMemory(event.target.value as AgentMemoryType)}
            >
              {memoryOptions.map((option) => (
                <option key={option} value={option}>
                  {labelize(option)}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Execution plane</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Runtime type: {template?.runtimeType ?? "node"} • Queue target prepared for worker dispatch
                </div>
              </div>
              <Badge tone="muted">{template?.runtimeType ?? "node"}</Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Advanced: env vars</div>
              <Badge tone="muted">key/value</Badge>
            </div>
            <div className="space-y-3">
              {envVars.map((pair, index) => (
                <div key={`${pair.key}-${index}`} className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={pair.key}
                    onChange={(event) =>
                      setEnvVars((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, key: event.target.value } : entry
                        )
                      )
                    }
                  />
                  <Input
                    value={pair.value}
                    onChange={(event) =>
                      setEnvVars((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, value: event.target.value } : entry
                        )
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-white/[0.08]">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              mutation.mutate({
                templateId: template?.id ?? "tpl_research",
                agentName: name,
                model,
                tools,
                memory,
                runtimeType: template?.runtimeType ?? "node",
                envVars
              })
            }
            disabled={mutation.isPending || !name.trim()}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deploying
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Deploy
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

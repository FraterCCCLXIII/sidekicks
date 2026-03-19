"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Rocket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
import { deployAgent, type Template } from "@/lib/mock-data";

const toolOptions = ["Web", "Files", "Shell", "Cloud", "Browser"];

export function DeployAgentDialog({
  template,
  triggerLabel = "Deploy Agent",
  onDeployed
}: {
  template?: Template;
  triggerLabel?: string;
  onDeployed?: (name: string) => void;
}) {
  const baseName = useMemo(
    () => template?.name.toLowerCase().replace(/\s+/g, "-") ?? "research-agent",
    [template]
  );
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`${baseName}-1`);
  const [model, setModel] = useState(template?.model ?? "GPT-4o");
  const [memory, setMemory] = useState("Redis");
  const [tools, setTools] = useState<string[]>(template?.tools ?? ["Web", "Files"]);
  const [envVars, setEnvVars] = useState([
    { key: "REPORT_MODE", value: "verbose" },
    { key: "CACHE_TTL", value: "300" }
  ]);

  useEffect(() => {
    setName(`${baseName}-1`);
    setModel(template?.model ?? "GPT-4o");
    setTools(template?.tools ?? ["Web", "Files"]);
  }, [baseName, template]);

  const mutation = useMutation({
    mutationFn: deployAgent,
    onSuccess: (result) => {
      onDeployed?.(result.name);
      setOpen(false);
    }
  });

  function toggleTool(tool: string) {
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
            Launch an agent instance with production defaults and inspect its runs immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 pb-2">
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
              </select>
            </label>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Tools</div>
            <div className="flex flex-wrap gap-2">
              {toolOptions.map((tool) => {
                const selected = tools.includes(tool);

                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => toggleTool(tool)}
                    className={`rounded-md border px-3 py-2 text-sm transition ${
                      selected
                        ? "border-white/[0.16] bg-white/[0.08] text-foreground"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground"
                    }`}
                  >
                    {tool}
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
              onChange={(event) => setMemory(event.target.value)}
            >
              <option>Redis</option>
              <option>Postgres</option>
              <option>In-memory</option>
            </select>
          </label>

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
                name,
                model,
                tools,
                memory,
                envVars
              })
            }
            disabled={mutation.isPending}
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

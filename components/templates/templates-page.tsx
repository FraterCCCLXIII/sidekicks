"use client";

import { Blocks, Code2, FileSearch, Rocket, Search, WandSparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { DeployAgentDialog } from "@/components/deploy-agent-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTemplates } from "@/hooks/use-sidekicks-data";
import { type TemplateListItemView } from "@/lib/server/presenters";

const templateIcons: Record<string, typeof FileSearch> = {
  "Research Agent": FileSearch,
  "Code Builder": Code2,
  "SEO Writer": WandSparkles,
  "Deploy Agent": Rocket,
  "Support Triage": Blocks
};

function TemplateCard({ template }: { template: TemplateListItemView }) {
  const Icon = templateIcons[template.name] ?? FileSearch;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <Icon className="h-5 w-5 text-foreground" />
          </div>
          <Badge tone="muted">{template.category}</Badge>
        </div>
        <CardTitle className="mt-4">{template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-5">
        <div className="flex flex-wrap gap-2">
          {template.tags.map((tag) => (
            <Badge key={tag} tone="muted">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <DeployAgentDialog template={template} triggerLabel="Deploy" />
          <Link href="/agents" className="text-sm font-medium text-foreground/80 hover:text-foreground">
            View
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function TemplatesPage() {
  const { data } = useTemplates();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.filter((template) => {
      const haystack = `${template.name} ${template.description} ${template.tags.join(" ")}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [data, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge>Templates</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Templates</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Browse deployable agent blueprints, inspect capabilities, and launch new instances in a few clicks.
          </p>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-11"
          placeholder="Search templates by name, tools, or use case"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </div>
  );
}

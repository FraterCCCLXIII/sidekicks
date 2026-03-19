"use client";

import {
  BellRing,
  Bot,
  Database,
  KeyRound,
  Layers3,
  Plus,
  Rocket,
  Settings2,
  ShieldCheck
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/hooks/use-sidekicks-data";
import { type LlmProfile } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type DraftProfile = {
  name: string;
  provider: string;
  model: string;
  authType: string;
  apiKey: string;
};

const navItems = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "profiles", label: "LLM Profiles", icon: KeyRound },
  { id: "routing", label: "Routing", icon: Bot },
  { id: "storage", label: "Storage", icon: Database },
  { id: "deployments", label: "Deployments", icon: Rocket },
  { id: "security", label: "Security", icon: ShieldCheck }
] as const;

const fieldClassName =
  "flex h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-foreground outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10";

const providerModels: Record<string, string[]> = {
  OpenAI: ["GPT-4o", "GPT-4.1", "GPT-4o mini"],
  Anthropic: ["Claude 3.5 Sonnet", "Claude 3 Opus"],
  "Azure OpenAI": ["GPT-4o", "GPT-4o mini"],
  Groq: ["Llama 3.3 70B", "Mixtral 8x7B"]
};

function SectionCard({
  id,
  title,
  description,
  children
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onToggle
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div>
        <div className="font-medium">{label}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "relative h-7 w-12 rounded-full border transition",
          value ? "border-white/[0.16] bg-white/[0.14]" : "border-white/[0.08] bg-white/[0.04]"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
            value ? "left-6" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { data } = useSettings();
  const [profiles, setProfiles] = useState<LlmProfile[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [fallbackModel, setFallbackModel] = useState("");
  const [routingStrategy, setRoutingStrategy] = useState("");
  const [storage, setStorage] = useState("");
  const [memoryStore, setMemoryStore] = useState("");
  const [region, setRegion] = useState("");
  const [autoDeploy, setAutoDeploy] = useState(false);
  const [warmContainers, setWarmContainers] = useState(false);
  const [auditLogging, setAuditLogging] = useState(false);
  const [artifactRetentionDays, setArtifactRetentionDays] = useState("14");
  const [maxConcurrency, setMaxConcurrency] = useState("6");
  const [draftProfile, setDraftProfile] = useState<DraftProfile>({
    name: "",
    provider: "OpenAI",
    model: "GPT-4o",
    authType: "API key",
    apiKey: ""
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    setProfiles(data.llmProfiles);
    setDefaultModel(data.defaultModel);
    setFallbackModel(data.fallbackModel);
    setRoutingStrategy(data.routingStrategy);
    setStorage(data.storage);
    setMemoryStore(data.memoryStore);
    setRegion(data.region);
    setAutoDeploy(data.autoDeploy);
    setWarmContainers(data.warmContainers);
    setAuditLogging(data.auditLogging);
    setArtifactRetentionDays(String(data.artifactRetentionDays));
    setMaxConcurrency(String(data.maxConcurrency));
  }, [data]);

  function updateDraft<K extends keyof DraftProfile>(key: K, value: DraftProfile[K]) {
    setDraftProfile((current) => ({ ...current, [key]: value }));
  }

  function addProfile() {
    if (!draftProfile.name.trim() || !draftProfile.apiKey.trim()) {
      return;
    }

    const nextProfile: LlmProfile = {
      id: `profile_${Date.now()}`,
      name: draftProfile.name.trim(),
      provider: draftProfile.provider,
      model: draftProfile.model,
      authType: draftProfile.authType,
      status: "active",
      scopes: ["Runs", "Templates"],
      lastUsed: "just now",
      apiKeyPreview: `${draftProfile.apiKey.slice(0, 4)}...${draftProfile.apiKey.slice(-4)}`
    };

    setProfiles((current) => [nextProfile, ...current]);
    setDraftProfile({
      name: "",
      provider: draftProfile.provider,
      model: providerModels[draftProfile.provider][0],
      authType: "API key",
      apiKey: ""
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Badge>Configuration</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Configure workspace defaults, authenticated model providers, routing behavior, and control-plane policies.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Profiles</div>
            <div className="mt-2 text-xl font-semibold">{profiles.length}</div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Default Region</div>
            <div className="mt-2 text-xl font-semibold">{region || "--"}</div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Environment</div>
            <div className="mt-2 text-xl font-semibold">{data?.environment ?? "--"}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2">
            <div className="px-3 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Settings Nav
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="space-y-6">
          <SectionCard
            id="general"
            title="General"
            description="Workspace identity and control-plane defaults applied across the Sidekicks environment."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Workspace name</span>
                <Input defaultValue={data?.workspaceName} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Environment</span>
                <select className={fieldClassName} defaultValue={data?.environment}>
                  <option>Production</option>
                  <option>Staging</option>
                  <option>Development</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Default region</span>
                <select className={fieldClassName} value={region} onChange={(event) => setRegion(event.target.value)}>
                  <option>us-west-2</option>
                  <option>us-east-1</option>
                  <option>eu-central-1</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Max concurrency per agent</span>
                <Input value={maxConcurrency} onChange={(event) => setMaxConcurrency(event.target.value)} />
              </label>
            </div>
          </SectionCard>

          <SectionCard
            id="profiles"
            title="LLM Profiles"
            description="Manage authenticated providers and model credentials available to Sidekicks deployments."
          >
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{profile.name}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {profile.provider} • {profile.model} • {profile.authType}
                        </div>
                      </div>
                      <Badge tone={profile.status === "active" ? "success" : "warning"}>
                        {profile.status === "active" ? "Active" : "Limited"}
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Credential</div>
                        <div className="mt-2 font-mono text-sm">{profile.apiKeyPreview}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Scopes</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {profile.scopes.map((scope) => (
                            <Badge key={scope} tone="muted">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Last used</div>
                        <div className="mt-2 text-sm text-foreground">{profile.lastUsed}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">Add LLM profile</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Register an authenticated provider for routing, fallback, or environment-specific usage.
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-2">
                    <Plus className="h-4 w-4 text-foreground" />
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <label className="space-y-2 text-sm">
                    <span className="text-muted-foreground">Profile name</span>
                    <Input
                      placeholder="e.g. OpenAI Production"
                      value={draftProfile.name}
                      onChange={(event) => updateDraft("name", event.target.value)}
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="text-muted-foreground">Provider</span>
                      <select
                        className={fieldClassName}
                        value={draftProfile.provider}
                        onChange={(event) => {
                          const provider = event.target.value;
                          setDraftProfile((current) => ({
                            ...current,
                            provider,
                            model: providerModels[provider][0]
                          }));
                        }}
                      >
                        {Object.keys(providerModels).map((provider) => (
                          <option key={provider}>{provider}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm">
                      <span className="text-muted-foreground">Model</span>
                      <select
                        className={fieldClassName}
                        value={draftProfile.model}
                        onChange={(event) => updateDraft("model", event.target.value)}
                      >
                        {providerModels[draftProfile.provider].map((model) => (
                          <option key={model}>{model}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="text-muted-foreground">Auth method</span>
                      <select
                        className={fieldClassName}
                        value={draftProfile.authType}
                        onChange={(event) => updateDraft("authType", event.target.value)}
                      >
                        <option>API key</option>
                        <option>Managed identity</option>
                        <option>OAuth client</option>
                      </select>
                    </label>

                    <label className="space-y-2 text-sm">
                      <span className="text-muted-foreground">Credential</span>
                      <Input
                        placeholder="Paste token, secret, or identifier"
                        value={draftProfile.apiKey}
                        onChange={(event) => updateDraft("apiKey", event.target.value)}
                      />
                    </label>
                  </div>

                  <Button onClick={addProfile} className="w-full">
                    <Plus className="h-4 w-4" />
                    Add authenticated profile
                  </Button>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id="routing"
            title="Model Routing"
            description="Define how Sidekicks chooses models for new agents, retries, and fallback behavior."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Default model</span>
                <select className={fieldClassName} value={defaultModel} onChange={(event) => setDefaultModel(event.target.value)}>
                  {profiles.map((profile) => (
                    <option key={`${profile.id}-default`} value={profile.model}>
                      {profile.model}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Fallback model</span>
                <select className={fieldClassName} value={fallbackModel} onChange={(event) => setFallbackModel(event.target.value)}>
                  {profiles.map((profile) => (
                    <option key={`${profile.id}-fallback`} value={profile.model}>
                      {profile.model}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm lg:col-span-2">
                <span className="text-muted-foreground">Routing strategy</span>
                <select
                  className={fieldClassName}
                  value={routingStrategy}
                  onChange={(event) => setRoutingStrategy(event.target.value)}
                >
                  <option>Latency-aware</option>
                  <option>Cost-aware</option>
                  <option>Provider pinning</option>
                </select>
              </label>
            </div>
          </SectionCard>

          <SectionCard
            id="storage"
            title="Storage & Memory"
            description="Configure persistence for artifacts, run state, and agent memory."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Artifact storage</span>
                <select className={fieldClassName} value={storage} onChange={(event) => setStorage(event.target.value)}>
                  <option>Redis</option>
                  <option>S3 + Redis</option>
                  <option>Postgres</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Default memory store</span>
                <select
                  className={fieldClassName}
                  value={memoryStore}
                  onChange={(event) => setMemoryStore(event.target.value)}
                >
                  <option>Redis</option>
                  <option>Postgres</option>
                  <option>In-memory</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Artifact retention (days)</span>
                <Input
                  value={artifactRetentionDays}
                  onChange={(event) => setArtifactRetentionDays(event.target.value)}
                />
              </label>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Layers3 className="h-4 w-4" />
                  Storage policy summary
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div>Artifacts persist for {artifactRetentionDays || "--"} days.</div>
                  <div>Agent memory defaults to {memoryStore || "--"}.</div>
                  <div>Primary backing service is {storage || "--"}.</div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id="deployments"
            title="Deployment Policies"
            description="Control launch behavior, container warming, and runtime readiness."
          >
            <div className="space-y-4">
              <ToggleRow
                label="Auto deploy after creation"
                description="Immediately start new agent instances after the deploy action completes."
                value={autoDeploy}
                onToggle={() => setAutoDeploy((current) => !current)}
              />
              <ToggleRow
                label="Warm standby containers"
                description="Keep a small warm pool available to reduce cold starts for frequent runs."
                value={warmContainers}
                onToggle={() => setWarmContainers((current) => !current)}
              />
            </div>
          </SectionCard>

          <SectionCard
            id="security"
            title="Security & Audit"
            description="Set guardrails for logging, secret exposure, and operator notifications."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <ToggleRow
                label="Audit logging"
                description="Capture routing, deployment, and execution metadata for operator review."
                value={auditLogging}
                onToggle={() => setAuditLogging((current) => !current)}
              />
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <BellRing className="h-4 w-4" />
                  Operator alerts
                </div>
                <div className="mt-3 text-sm">
                  Notify the platform team when provider auth fails, fallback routing activates, or deploys exceed concurrency limits.
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

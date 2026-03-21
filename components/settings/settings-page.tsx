"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit3, KeyRound, Plus, Settings2, Trash2 } from "lucide-react";
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
import { addLlmProfile, deleteLlmProfile, updateLlmProfile, useSettings } from "@/hooks/use-sidekicks-data";
import { type LlmProfile } from "@/lib/domain/types";

type DraftProfile = {
  name: string;
  provider: string;
  model: string;
  authType: string;
  apiKey: string;
  baseUrl: string;
};

const fieldClassName =
  "flex h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-foreground outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10";

const providerModels: Record<string, string[]> = {
  OpenAI: ["GPT-4o", "GPT-4.1", "GPT-4o mini"],
  Anthropic: ["Claude 3.5 Sonnet", "Claude 3 Opus"],
  "Azure OpenAI": ["GPT-4o", "GPT-4o mini"],
  Groq: ["Llama 3.3 70B", "Mixtral 8x7B"]
};

function blankDraft(): DraftProfile {
  return {
    name: "",
    provider: "OpenAI",
    model: "GPT-4o",
    authType: "API key",
    apiKey: "",
    baseUrl: ""
  };
}

function ProfileDialog({
  mode,
  profile,
  onSave,
  trigger
}: {
  mode: "add" | "edit";
  profile?: LlmProfile;
  onSave: (draft: DraftProfile) => Promise<void>;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftProfile>(blankDraft());

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && profile) {
      setDraft({
        name: profile.name,
        provider: profile.provider,
        model: profile.model,
        authType: profile.authType,
        apiKey: "",
        baseUrl: profile.baseUrl ?? ""
      });
      return;
    }

    setDraft(blankDraft());
  }, [mode, open, profile]);

  async function handleSave() {
    await onSave(draft);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add LLM profile" : "Edit LLM profile"}</DialogTitle>
          <DialogDescription>
            Register an authenticated provider for routing, fallback, or environment-specific usage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-2">
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Profile name</span>
            <Input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. OpenAI Production"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Provider</span>
              <select
                className={fieldClassName}
                value={draft.provider}
                onChange={(event) => {
                  const provider = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    provider,
                    model: providerModels[provider]?.[0] ?? current.model
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
                value={draft.model}
                onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
              >
                {(providerModels[draft.provider] ?? []).map((model) => (
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
                value={draft.authType}
                onChange={(event) => setDraft((current) => ({ ...current, authType: event.target.value }))}
              >
                <option>API key</option>
                <option>Managed identity</option>
                <option>OAuth client</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Credential</span>
              <Input
                type="password"
                value={draft.apiKey}
                onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))}
                placeholder={mode === "edit" ? "Leave blank to keep existing key" : "Paste token, secret, or identifier"}
              />
            </label>
          </div>
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Base URL (optional)</span>
            <Input
              value={draft.baseUrl}
              onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))}
              placeholder="https://example.openai.azure.com"
            />
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!draft.name.trim() || (mode === "add" && !draft.apiKey.trim())}>
            {mode === "add" ? "Add authenticated profile" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProfileButton({ profileId, onDelete }: { profileId: string; onDelete: (profileId: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);

  async function confirmDelete() {
    await onDelete(profileId);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-red-300 hover:bg-red-500/10 hover:text-red-200">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete LLM profile</DialogTitle>
          <DialogDescription>This removes the saved credential from Sidekicks.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="bg-red-500 text-white hover:bg-red-500/90" onClick={confirmDelete}>
            Delete profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsPage() {
  const { data } = useSettings();
  const queryClient = useQueryClient();
  const [profiles, setProfiles] = useState<LlmProfile[]>([]);

  const syncSettings = useMemo(
    () => async (nextSettings: { llmProfiles: LlmProfile[] }) => {
      setProfiles(nextSettings.llmProfiles);
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    [queryClient]
  );

  const addProfileMutation = useMutation({
    mutationFn: addLlmProfile,
    onSuccess: syncSettings
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateLlmProfile,
    onSuccess: syncSettings
  });

  const deleteProfileMutation = useMutation({
    mutationFn: deleteLlmProfile,
    onSuccess: syncSettings
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    setProfiles(data.llmProfiles);
  }, [data]);

  async function createProfile(draft: DraftProfile) {
    await addProfileMutation.mutateAsync({
      name: draft.name,
      provider: draft.provider,
      model: draft.model,
      authType: draft.authType,
      apiKey: draft.apiKey,
      baseUrl: draft.baseUrl || undefined
    });
  }

  async function editProfile(profileId: string, draft: DraftProfile) {
    await updateProfileMutation.mutateAsync({
      id: profileId,
      name: draft.name,
      provider: draft.provider,
      model: draft.model,
      authType: draft.authType,
      apiKey: draft.apiKey || undefined,
      baseUrl: draft.baseUrl || undefined
    });
  }

  async function removeProfile(profileId: string) {
    await deleteProfileMutation.mutateAsync(profileId);
  }

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <Badge>Settings</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">OpenClaw MVP Settings</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Keep only the provider credentials and defaults required to deploy one upstream OpenClaw runtime.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="text-sm text-muted-foreground">Default model</div>
              <div className="mt-2 font-medium">{data?.defaultModel ?? "GPT-4o"}</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="text-sm text-muted-foreground">Region</div>
              <div className="mt-2 font-medium">{data?.region ?? "us-west-2"}</div>
            </div>
          </div>
        </div>
      </section>

      <section id="profiles" className="scroll-mt-8">
        <div className="panel">
          <div className="flex items-center justify-between gap-4 p-6 pb-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">LLM Profiles</h3>
              <p className="text-sm text-muted-foreground">
                Manage authenticated providers and model credentials available to Sidekicks deployments.
              </p>
            </div>
            <ProfileDialog
              mode="add"
              onSave={createProfile}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  Add Profile
                </Button>
              }
            />
          </div>
          <div className="p-6 pt-0">
            {profiles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                  <Settings2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="mt-4 font-medium">No LLM profiles yet</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add one real provider credential to deploy the OpenClaw MVP runtime.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {profiles.map((profile) => (
                  <div key={profile.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="font-medium">{profile.name}</div>
                          <Badge tone={profile.status === "active" ? "success" : "warning"}>
                            {profile.status === "active" ? "Active" : "Limited"}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {profile.provider} • {profile.model} • {profile.authType}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-6 text-sm text-muted-foreground">
                          <div>
                            <span className="font-mono text-foreground">{profile.apiKeyPreview}</span>
                            <span className="ml-2">Credential</span>
                          </div>
                          <div>
                            <span className="font-mono text-foreground">{profile.keyEnvVar}</span>
                            <span className="ml-2">Env var</span>
                          </div>
                          <div>
                            <span className="text-foreground">{profile.lastUsed}</span>
                            <span className="ml-2">Last used</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 lg:min-w-[180px]">
                        <ProfileDialog
                          mode="edit"
                          profile={profile}
                          onSave={(draft) => editProfile(profile.id, draft)}
                          trigger={
                            <Button variant="ghost" size="sm">
                              <Edit3 className="h-4 w-4" />
                              Edit
                            </Button>
                          }
                        />
                        <DeleteProfileButton profileId={profile.id} onDelete={removeProfile} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

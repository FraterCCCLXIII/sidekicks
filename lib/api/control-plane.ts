import { type DeployRequest, type LlmProfileInput, type SettingsData } from "@/lib/domain/types";
import { fetchJson } from "@/lib/api/client";
import {
  type AgentDetailView,
  type AgentListItemView,
  type ArtifactListItemView,
  type ChatMessageView,
  type DashboardView,
  type RunDetailView,
  type RunListItemView,
  type TemplateDetailView,
  type TemplateListItemView
} from "@/lib/server/presenters";

export function getDashboardData() {
  return fetchJson<DashboardView>("/api/dashboard");
}

export function getTemplates() {
  return fetchJson<TemplateListItemView[]>("/api/templates");
}

export function getTemplate(templateId: string) {
  return fetchJson<TemplateDetailView>(`/api/templates/${templateId}`);
}

export function getAgents() {
  return fetchJson<AgentListItemView[]>("/api/agents");
}

export function getAgent(agentId: string) {
  return fetchJson<AgentDetailView>(`/api/agents/${agentId}`);
}

export function deleteAgent(agentId: string) {
  return fetchJson<{ deleted: boolean; id?: string; name?: string }>(`/api/agents/${agentId}`, {
    method: "DELETE"
  });
}

export function redeployAgent(agentId: string) {
  return fetchJson<{ queued: boolean; request?: { deploymentId: string } }>(`/api/agents/${agentId}`, {
    method: "POST",
    body: JSON.stringify({ action: "redeploy" })
  });
}

export function createAgent(input: DeployRequest) {
  return fetchJson<AgentListItemView>("/api/agents", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getAgentChat(agentId: string) {
  return fetchJson<ChatMessageView[]>(`/api/agents/${agentId}/chat`);
}

export function sendAgentChatMessage(agentId: string, content: string) {
  return fetchJson<{ userMessage: ChatMessageView; assistantMessage: ChatMessageView }>(`/api/agents/${agentId}/chat`, {
    method: "POST",
    body: JSON.stringify({ content })
  });
}

export function getRuns() {
  return fetchJson<RunListItemView[]>("/api/runs");
}

export function createJob(input: {
  agentId: string;
  agentName?: string;
  title: string;
  input: {
    prompt: string;
    files?: string[];
    params?: Record<string, string>;
  };
}) {
  return fetchJson<{ job: { id: string }; run: RunListItemView }>("/api/jobs", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getRunDetail(runId: string) {
  return fetchJson<RunDetailView>(`/api/runs/${runId}`);
}

export function getArtifacts() {
  return fetchJson<ArtifactListItemView[]>("/api/artifacts");
}

export function getSettings() {
  return fetchJson<SettingsData>("/api/settings");
}

export function addLlmProfile(input: LlmProfileInput) {
  return fetchJson<SettingsData>("/api/settings", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

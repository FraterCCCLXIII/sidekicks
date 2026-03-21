import { type DeployRequest, type DeploymentLogEntry, type LlmProfileInput, type LlmProfileUpdateInput, type SettingsData } from "@/lib/domain/types";
import { fetchJson } from "@/lib/api/client";
import {
  type AgentDetailView,
  type AgentListItemView,
  type ArtifactListItemView,
  type ChatMessageView,
  type ClusterSummaryView,
  type DashboardView,
  type RunDetailView,
  type RunListItemView,
  type TemplateDetailView,
  type TemplateListItemView
} from "@/lib/server/presenters";

export function getClusterSummary() {
  return fetchJson<ClusterSummaryView>("/api/cluster");
}

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

export function setAgentPaused(agentId: string, paused: boolean, mode?: "now" | "after") {
  return fetchJson<AgentDetailView>(`/api/agents/${agentId}`, {
    method: "PATCH",
    body: JSON.stringify({ paused, mode })
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

export function getAgentDeploymentLogs(agentId: string) {
  return fetchJson<DeploymentLogEntry[]>(`/api/agents/${agentId}/deployment-logs`);
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

export function updateLlmProfile(input: LlmProfileUpdateInput) {
  return fetchJson<SettingsData>("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function deleteLlmProfile(profileId: string) {
  return fetchJson<SettingsData>(`/api/settings?profileId=${encodeURIComponent(profileId)}`, {
    method: "DELETE"
  });
}

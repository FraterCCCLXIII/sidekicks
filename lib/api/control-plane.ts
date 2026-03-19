import { type DeployRequest, type SettingsData } from "@/lib/domain/types";
import { fetchJson } from "@/lib/api/client";
import {
  type AgentListItemView,
  type ArtifactListItemView,
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

export function createAgent(input: DeployRequest) {
  return fetchJson<AgentListItemView>("/api/agents", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getRuns() {
  return fetchJson<RunListItemView[]>("/api/runs");
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

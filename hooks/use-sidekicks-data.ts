"use client";

import { useQuery } from "@tanstack/react-query";

import {
  addLlmProfile,
  createAgent,
  deleteLlmProfile,
  deleteAgent,
  getAgentDeploymentLogs,
  redeployAgent,
  getAgentChat,
  createJob,
  getAgent,
  getAgents,
  getArtifacts,
  getDashboardData,
  getTemplate,
  getRunDetail,
  getRuns,
  getSettings,
  sendAgentChatMessage,
  getTemplates,
  updateLlmProfile
} from "@/lib/api/control-plane";

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboardData,
    refetchInterval: 2000
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: getTemplates
  });
}

export function useTemplate(templateId: string) {
  return useQuery({
    queryKey: ["templates", templateId],
    queryFn: () => getTemplate(templateId)
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: getAgents,
    refetchInterval: 2000
  });
}

export function useAgent(agentId: string) {
  return useQuery({
    queryKey: ["agents", agentId],
    queryFn: () => getAgent(agentId),
    refetchInterval: 2000
  });
}

export function useAgentChat(agentId: string) {
  return useQuery({
    queryKey: ["agents", agentId, "chat"],
    queryFn: () => getAgentChat(agentId),
    refetchInterval: 2000
  });
}

export function useAgentDeploymentLogs(agentId: string, enabled = true) {
  return useQuery({
    queryKey: ["agents", agentId, "deployment-logs"],
    queryFn: () => getAgentDeploymentLogs(agentId),
    refetchInterval: enabled ? 2000 : false,
    enabled
  });
}

export function useRuns() {
  return useQuery({
    queryKey: ["runs"],
    queryFn: getRuns,
    refetchInterval: 2000
  });
}

export function useRunDetail(runId: string) {
  return useQuery({
    queryKey: ["runs", runId],
    queryFn: () => getRunDetail(runId),
    refetchInterval: 2000
  });
}

export function useArtifacts() {
  return useQuery({
    queryKey: ["artifacts"],
    queryFn: getArtifacts,
    refetchInterval: 2000
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: getSettings
  });
}

export { createAgent, createJob, deleteAgent, redeployAgent, sendAgentChatMessage };
export { addLlmProfile, updateLlmProfile, deleteLlmProfile };

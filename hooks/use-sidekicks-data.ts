"use client";

import { useQuery } from "@tanstack/react-query";

import {
  createAgent,
  getAgents,
  getArtifacts,
  getDashboardData,
  getTemplate,
  getRunDetail,
  getRuns,
  getSettings,
  getTemplates
} from "@/lib/api/control-plane";

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboardData
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
    queryFn: getAgents
  });
}

export function useRuns() {
  return useQuery({
    queryKey: ["runs"],
    queryFn: getRuns
  });
}

export function useRunDetail(runId: string) {
  return useQuery({
    queryKey: ["runs", runId],
    queryFn: () => getRunDetail(runId)
  });
}

export function useArtifacts() {
  return useQuery({
    queryKey: ["artifacts"],
    queryFn: getArtifacts
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: getSettings
  });
}

export { createAgent };

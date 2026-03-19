"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getAgents,
  getArtifacts,
  getDashboardData,
  getRunDetail,
  getRuns,
  getSettings,
  getTemplates
} from "@/lib/mock-data";

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

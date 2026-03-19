import { type DeployRequest } from "@/lib/domain/types";
import { presentAgent, presentArtifact, presentDashboard, presentRun, presentRunDetail, presentSettings, presentTemplate, presentTemplateDetail } from "@/lib/server/presenters";
import { createAgentInstance, createJobRecord, listState } from "@/lib/server/store";

function wait<T>(value: T, delay = 120): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delay);
  });
}

export async function listTemplates() {
  return wait(listState().templates.map(presentTemplate));
}

export async function getTemplate(templateId: string) {
  const template = listState().templates.find((item) => item.id === templateId || item.slug === templateId);
  return wait(template ? presentTemplateDetail(template) : null);
}

export async function listAgents() {
  return wait(listState().agents.map(presentAgent));
}

export async function getAgent(agentId: string) {
  const agent = listState().agents.find((item) => item.id === agentId);
  return wait(agent ? presentAgent(agent) : null);
}

export async function createAgent(input: DeployRequest) {
  return wait(presentAgent(createAgentInstance(input)), 220);
}

export async function listJobs() {
  return wait(listState().jobs);
}

export async function createJob(input: {
  agentId: string;
  agentName: string;
  title: string;
  input: {
    prompt: string;
    files?: string[];
    params?: Record<string, string>;
  };
}) {
  return wait(createJobRecord(input), 180);
}

export async function listRuns() {
  const state = listState();
  return wait(state.runs.map((run) => presentRun(state, run)));
}

export async function getRun(runId: string) {
  const state = listState();
  const run = state.runs.find((item) => item.id === runId);
  return wait(run ? presentRunDetail(state, run) : null);
}

export async function listArtifacts() {
  return wait(listState().artifacts.map(presentArtifact));
}

export async function getDashboard() {
  return wait(presentDashboard(listState()));
}

export async function getSettings() {
  return wait(presentSettings(listState().settings));
}

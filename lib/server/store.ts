import { type ControlPlaneState, type DeployRequest, type Job } from "@/lib/domain/types";
import { createSeedState } from "@/lib/server/seed";

type GlobalState = typeof globalThis & {
  __sidekicksControlPlaneState?: ControlPlaneState;
};

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getGlobalState() {
  return globalThis as GlobalState;
}

export function getControlPlaneState() {
  const globalState = getGlobalState();

  if (!globalState.__sidekicksControlPlaneState) {
    globalState.__sidekicksControlPlaneState = cloneState(createSeedState());
  }

  return globalState.__sidekicksControlPlaneState;
}

export function listState() {
  return getControlPlaneState();
}

export function createAgentInstance(input: DeployRequest) {
  const state = getControlPlaneState();
  const template = state.templates.find((item) => item.id === input.templateId);

  if (!template) {
    throw new Error("Template not found");
  }

  const now = new Date().toISOString();
  const nextAgent = {
    id: `agent_${Math.random().toString(36).slice(2, 10)}`,
    name: input.agentName,
    templateId: template.id,
    templateName: template.name,
    status: "idle" as const,
    model: input.model,
    tools: input.tools,
    memory: input.memory,
    runtimeType: input.runtimeType,
    envVars: input.envVars,
    jobsCount: 0,
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
    region: state.settings.region
  };

  state.agents.unshift(nextAgent);

  return nextAgent;
}

export function createJobRecord(input: Omit<Job, "id" | "createdAt" | "startedAt" | "completedAt" | "status">) {
  const state = getControlPlaneState();
  const agent = state.agents.find((item) => item.id === input.agentId);

  if (!agent) {
    throw new Error("Agent not found");
  }

  const nextJob: Job = {
    id: `job_${Math.random().toString(36).slice(2, 10)}`,
    agentId: input.agentId,
    agentName: input.agentName,
    title: input.title,
    input: input.input,
    status: "queued",
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null
  };

  state.jobs.unshift(nextJob);
  agent.jobsCount += 1;
  agent.updatedAt = new Date().toISOString();

  return nextJob;
}

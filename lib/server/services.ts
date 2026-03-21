import { type DeployRequest, type LlmProfileInput, type LlmProfileUpdateInput } from "@/lib/domain/types";
import { isPostgresBackend } from "@/lib/server/config";
import { getDeployQueue } from "@/lib/server/deploy-queue";
import { type ClusterSummaryView, presentAgent, presentAgentDetail, presentArtifact, presentChatMessage, presentDashboard, presentRun, presentRunDetail, presentSettings, presentTemplate, presentTemplateDetail } from "@/lib/server/presenters";
import {
  createAgentInstance,
  createChatExchange,
  createJobAndRun,
  createLlmProfile,
  deleteAgentInstance,
  deleteLlmProfile,
  listDeploymentLogs,
  listState,
  redeployAgentInstance,
  setAgentPaused as setAgentPausedBackend,
  updateLlmProfile
} from "@/lib/server/backend";
import { getRunQueue } from "@/lib/server/run-queue";

function wait<T>(value: T, delay = 120): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delay);
  });
}

export async function listTemplates() {
  const state = await listState();
  return wait(state.templates.map(presentTemplate));
}

export async function getTemplate(templateId: string) {
  const template = (await listState()).templates.find((item) => item.id === templateId || item.slug === templateId);
  return wait(template ? presentTemplateDetail(template) : null);
}

export async function listAgents() {
  const state = await listState();
  return wait(state.agents.map(presentAgent));
}

export async function getAgent(agentId: string) {
  const state = await listState();
  const agent = state.agents.find((item) => item.id === agentId);
  return wait(agent ? presentAgentDetail(state, agent) : null);
}

export async function getAgentListItem(agentId: string) {
  const agent = (await listState()).agents.find((item) => item.id === agentId);
  return wait(agent ? presentAgent(agent) : null);
}

export async function createAgent(input: DeployRequest) {
  return wait(presentAgent(await createAgentInstance(input)), 220);
}

export async function listJobs() {
  return wait((await listState()).jobs);
}

export async function createJob(input: {
  agentId: string;
  agentName?: string;
  title: string;
  input: {
    prompt: string;
    files?: string[];
    params?: Record<string, string>;
  };
}) {
  const { job, run } = await createJobAndRun(input);
  const state = await listState();

  return wait(
    {
      job,
      run: presentRun(state, run)
    },
    180
  );
}

export async function listRuns() {
  const state = await listState();
  return wait(state.runs.map((run) => presentRun(state, run)));
}

export async function getRun(runId: string) {
  const state = await listState();
  const run = state.runs.find((item) => item.id === runId);
  return wait(run ? presentRunDetail(state, run) : null);
}

export async function listArtifacts() {
  const state = await listState();
  return wait(state.artifacts.map(presentArtifact));
}

export async function getArtifactById(artifactId: string) {
  const artifact = (await listState()).artifacts.find((item) => item.id === artifactId);
  return wait(artifact ?? null);
}

export async function listChatMessages(agentId: string) {
  const state = await listState();
  return wait(state.messages.filter((item) => item.agentId === agentId).map(presentChatMessage));
}

export async function sendChatMessage(agentId: string, content: string) {
  const result = await createChatExchange(agentId, content);

  return wait(
    {
      userMessage: presentChatMessage(result.userMessage),
      assistantMessage: presentChatMessage(result.assistantMessage)
    },
    120
  );
}

export async function getDashboard() {
  const state = await listState();
  const base = presentDashboard(state);
  let jobsRunning = base.stats.jobsRunning;
  const activeAgentIds = new Set<string>();

  state.agents.forEach((agent) => {
    if (agent.status === "running") {
      activeAgentIds.add(agent.id);
    }
  });

  state.jobs.forEach((job) => {
    if (job.status === "running" || job.status === "queued") {
      activeAgentIds.add(job.agentId);
    }
  });

  state.deployments.forEach((deployment) => {
    if (deployment.status === "healthy" || deployment.status === "provisioning" || deployment.status === "degraded") {
      activeAgentIds.add(deployment.agentId);
    }
  });

  if (isPostgresBackend()) {
    try {
      const runQueue = getRunQueue();
      const runJobCounts = await runQueue.getJobCounts("waiting", "active", "delayed");
      jobsRunning = (runJobCounts.waiting ?? 0) + (runJobCounts.active ?? 0) + (runJobCounts.delayed ?? 0);
    } catch {
      // Keep state-based count if queue lookup fails.
    }
  }

  return wait({
    ...base,
    stats: {
      ...base.stats,
      activeAgents: activeAgentIds.size,
      jobsRunning
    }
  });
}

export async function getClusterSummary(): Promise<ClusterSummaryView> {
  const updatedAt = new Date().toISOString();

  if (isPostgresBackend()) {
    try {
      const runQueue = getRunQueue();
      const deployQueue = getDeployQueue();

      const [runJobCounts, deployJobCounts, runWorkers, deployWorkers] = await Promise.all([
        runQueue.getJobCounts("waiting", "delayed"),
        deployQueue.getJobCounts("waiting", "delayed"),
        runQueue.getWorkersCount(),
        deployQueue.getWorkersCount()
      ]);

      return wait({
        nodesOnline: runWorkers + deployWorkers,
        queuedJobs:
          (runJobCounts.waiting ?? 0) +
          (runJobCounts.delayed ?? 0) +
          (deployJobCounts.waiting ?? 0) +
          (deployJobCounts.delayed ?? 0),
        source: "queue",
        updatedAt
      });
    } catch {
      // Fall through to state-based snapshot.
    }
  }

  const state = await listState();

  return wait({
    nodesOnline: state.runtimes.filter((runtime) => runtime.status === "online").length,
    queuedJobs: state.jobs.filter((job) => job.status === "queued").length,
    source: "state",
    updatedAt
  });
}

export async function getSettings() {
  return wait(presentSettings((await listState()).settings));
}

export async function addLlmProfile(input: LlmProfileInput) {
  return wait(presentSettings(await createLlmProfile(input)), 120);
}

export async function editLlmProfile(input: LlmProfileUpdateInput) {
  return wait(presentSettings(await updateLlmProfile(input)), 120);
}

export async function removeLlmProfile(profileId: string) {
  return wait(presentSettings(await deleteLlmProfile(profileId)), 120);
}

export async function removeAgent(agentId: string) {
  return wait(await deleteAgentInstance(agentId), 120);
}

export async function redeployAgent(agentId: string) {
  return wait(await redeployAgentInstance(agentId), 120);
}

export async function setAgentPaused(agentId: string, paused: boolean, force = false) {
  const updated = await setAgentPausedBackend(agentId, paused, force);

  if (!updated) {
    return null;
  }

  const state = await listState();
  const agent = state.agents.find((item) => item.id === agentId);
  return wait(agent ? presentAgentDetail(state, agent) : null, 120);
}

export async function getDeploymentLogs(agentId: string) {
  return wait(await listDeploymentLogs(agentId), 80);
}

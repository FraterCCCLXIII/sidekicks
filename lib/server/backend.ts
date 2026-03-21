import { type DeployRequest, type Job, type LlmProfileInput, type LlmProfileUpdateInput } from "@/lib/domain/types";
import { isPostgresBackend } from "@/lib/server/config";
import { enqueueAgentDeployment } from "@/lib/server/deploy-queue";
import {
  addLlmProfile as addMemoryLlmProfile,
  createAgentInstance as createMemoryAgentInstance,
  createJobAndRun as createMemoryJobAndRun,
  deleteAgentInstance as deleteMemoryAgentInstance,
  listState as listMemoryState,
  setAgentPaused as setMemoryAgentPaused
} from "@/lib/server/store";
import {
  createPostgresAgentInstance,
  createPostgresChatExchange,
  createPostgresJobAndRun,
  createPostgresLlmProfile,
  deletePostgresAgent,
  deletePostgresLlmProfile,
  listDeploymentLogsForAgent as listPostgresDeploymentLogsForAgent,
  listPostgresState,
  redeployPostgresAgent,
  setPostgresAgentPaused,
  updatePostgresLlmProfile
} from "@/lib/server/postgres-store";
import { enqueueRunExecution } from "@/lib/server/run-queue";

export async function listState() {
  if (isPostgresBackend()) {
    return listPostgresState();
  }

  return listMemoryState();
}

export async function createAgentInstance(input: DeployRequest) {
  if (isPostgresBackend()) {
    const created = await createPostgresAgentInstance(input);

    if (created.deploymentRequest) {
      await enqueueAgentDeployment(created.deploymentRequest);
    }

    return created.agent;
  }

  return createMemoryAgentInstance(input);
}

export async function createJobAndRun(
  input: {
    agentId: string;
    agentName?: string;
    title: string;
    input: Job["input"];
  }
) {
  if (!isPostgresBackend()) {
    const state = await listMemoryState();
    const agent = state.agents.find((item) => item.id === input.agentId);

    if (!agent) {
      throw new Error("Agent not found");
    }

    return createMemoryJobAndRun({
      ...input,
      agentName: input.agentName?.trim() || agent.name
    });
  }

  const created = await createPostgresJobAndRun(input);
  await enqueueRunExecution(created.request);

  return {
    job: created.job,
    run: created.run
  };
}

export async function createChatExchange(agentId: string, content: string) {
  if (!isPostgresBackend()) {
    throw new Error("Chat exchange requires the postgres backend");
  }

  return createPostgresChatExchange(agentId, content);
}

export async function createLlmProfile(input: LlmProfileInput) {
  if (isPostgresBackend()) {
    return createPostgresLlmProfile(input);
  }

  return addMemoryLlmProfile(input);
}

export async function updateLlmProfile(input: LlmProfileUpdateInput) {
  if (isPostgresBackend()) {
    return updatePostgresLlmProfile(input);
  }

  throw new Error("LLM profile updates are only supported in the postgres backend");
}

export async function deleteLlmProfile(profileId: string) {
  if (isPostgresBackend()) {
    return deletePostgresLlmProfile(profileId);
  }

  throw new Error("LLM profile deletion is only supported in the postgres backend");
}

export async function deleteAgentInstance(agentId: string) {
  if (isPostgresBackend()) {
    return deletePostgresAgent(agentId);
  }

  return deleteMemoryAgentInstance(agentId);
}

export async function setAgentPaused(agentId: string, paused: boolean, force = false) {
  if (isPostgresBackend()) {
    return setPostgresAgentPaused(agentId, paused, force);
  }

  return setMemoryAgentPaused(agentId, paused, force);
}

export async function redeployAgentInstance(agentId: string) {
  if (!isPostgresBackend()) {
    throw new Error("Redeploy requires the postgres backend");
  }

  const result = await redeployPostgresAgent(agentId);

  if (result.queued && result.request) {
    await enqueueAgentDeployment(result.request);
  }

  return result;
}

export async function listDeploymentLogs(agentId: string) {
  if (!isPostgresBackend()) {
    return [];
  }

  return listPostgresDeploymentLogsForAgent(agentId);
}

import { type DeployRequest, type Job } from "@/lib/domain/types";
import { isPostgresBackend } from "@/lib/server/config";
import { enqueueAgentDeployment } from "@/lib/server/deploy-queue";
import { createAgentInstance as createMemoryAgentInstance, createJobAndRun as createMemoryJobAndRun, listState as listMemoryState } from "@/lib/server/store";
import { createPostgresAgentInstance, createPostgresChatExchange, createPostgresJobAndRun, listPostgresState } from "@/lib/server/postgres-store";
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

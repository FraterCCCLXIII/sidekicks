import { type DeployRequest, type Job } from "@/lib/domain/types";
import { isPostgresBackend } from "@/lib/server/config";
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
    return createPostgresAgentInstance(input);
  }

  return createMemoryAgentInstance(input);
}

export async function createJobAndRun(
  input: Omit<Job, "id" | "createdAt" | "startedAt" | "completedAt" | "status">
) {
  if (!isPostgresBackend()) {
    return createMemoryJobAndRun(input);
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

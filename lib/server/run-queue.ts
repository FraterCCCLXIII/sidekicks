import { Queue } from "bullmq";

import { type RunExecutionRequest } from "@/lib/server/queue";
import { getRedisConnectionOptions, getWorkerQueueName } from "@/lib/server/config";

type GlobalState = typeof globalThis & {
  __sidekicksRunQueue?: Queue;
};

function getGlobalState() {
  return globalThis as GlobalState;
}

export function getRunQueue() {
  const globalState = getGlobalState();

  if (!globalState.__sidekicksRunQueue) {
    globalState.__sidekicksRunQueue = new Queue(getWorkerQueueName(), {
      connection: getRedisConnectionOptions()
    });
  }

  return globalState.__sidekicksRunQueue as Queue<RunExecutionRequest>;
}

export async function enqueueRunExecution(request: RunExecutionRequest) {
  await getRunQueue().add("execute-run", request, {
    jobId: request.runId,
    removeOnComplete: 100,
    removeOnFail: 100
  });
}

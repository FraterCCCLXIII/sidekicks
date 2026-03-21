import { Queue } from "bullmq";

import { getDeployQueueName, getRedisConnectionOptions } from "@/lib/server/config";
import { type DeploymentRequest } from "@/lib/server/queue";

type GlobalState = typeof globalThis & {
  __sidekicksDeployQueue?: Queue;
};

function getGlobalState() {
  return globalThis as GlobalState;
}

export function getDeployQueue() {
  const globalState = getGlobalState();

  if (!globalState.__sidekicksDeployQueue) {
    globalState.__sidekicksDeployQueue = new Queue(getDeployQueueName(), {
      connection: getRedisConnectionOptions()
    });
  }

  return globalState.__sidekicksDeployQueue as Queue<DeploymentRequest>;
}

export async function enqueueAgentDeployment(request: DeploymentRequest) {
  await getDeployQueue().add("deploy-agent", request, {
    jobId: request.deploymentId,
    removeOnComplete: 100,
    removeOnFail: 100
  });
}

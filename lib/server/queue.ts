import { type AgentTool, type RuntimeType, type WorkerRuntime, type WorkerRuntimeStatus } from "@/lib/domain/types";

export type RunExecutionRequest = {
  runId: string;
  jobId: string;
  agentId: string;
  agentName: string;
  deploymentId: string | null;
  runtimeType: RuntimeType;
  templateId: string;
  requestedAt: string;
};

export type WorkerExecutionContext = {
  request: RunExecutionRequest;
  artifactBucket: string;
};

export type WorkerExecutor = {
  runtimeType: RuntimeType;
  execute: (context: WorkerExecutionContext) => Promise<void>;
};

export function defineWorkerRuntime(input: {
  id: string;
  name: string;
  runtimeType: RuntimeType;
  image: string;
  supportedTools: AgentTool[];
  status: WorkerRuntimeStatus;
}): WorkerRuntime {
  return input;
}

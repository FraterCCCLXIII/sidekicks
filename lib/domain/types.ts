export type RuntimeType = "node" | "python";
export type TemplateKind = "runtime" | "preset";
export type AgentTool =
  | "web"
  | "browser"
  | "files"
  | "code"
  | "filesystem"
  | "python"
  | "charts"
  | "api"
  | "webhooks";
export type AgentMemoryType = "redis" | "postgres" | "in-memory";
export type AgentInstanceStatus = "idle" | "running" | "paused" | "error";
export type JobStatus = "queued" | "running" | "completed" | "failed";
export type RunStatus = JobStatus;
export type RunStepState = "pending" | "active" | "completed" | "failed";
export type WorkerRuntimeStatus = "online" | "offline" | "degraded";
export type ArtifactType = "report" | "build" | "dataset" | "markdown" | "log" | "app";
export type DeploymentStatus = "provisioning" | "healthy" | "degraded" | "stopped" | "failed";
export type ChatRole = "user" | "assistant" | "system";
export type RuntimeAdapter = "sidekicks-native" | "openclaw-upstream" | "nemoclaw";

export type AgentEnvVar = {
  key: string;
  value: string;
};

export type AgentTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  kind: TemplateKind;
  category: string;
  tags: string[];
  packageName: string;
  packageVersion: string;
  sourceRepo: string;
  runtimeImage: string;
  runtimeAdapter: RuntimeAdapter;
  isolationMode: "process" | "container";
  supportedTools: AgentTool[];
  defaultModel: string;
  defaultMemory: AgentMemoryType;
  runtimeType: RuntimeType;
  deploymentConfig: {
    recommendedConcurrency: number;
    artifactStrategy: string;
    workerQueue: string;
    startupCommand: string;
  };
  featured: boolean;
  exampleUseCases: string[];
  configSchema: {
    env: { key: string; required: boolean; description: string }[];
  };
};

export type AgentInstance = {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  status: AgentInstanceStatus;
  isPaused: boolean;
  model: string;
  tools: AgentTool[];
  memory: AgentMemoryType;
  runtimeType: RuntimeType;
  envVars: AgentEnvVar[];
  jobsCount: number;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  region: string;
};

export type Job = {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  input: {
    prompt: string;
    files?: string[];
    params?: Record<string, string>;
  };
  status: JobStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type RunLogEntry = {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
};

export type RunStep = {
  id: string;
  title: string;
  state: RunStepState;
  detail: string;
};

export type RunOutput = {
  title: string;
  summary: string;
  highlights: string[];
  markdown: string;
  links: { label: string; href: string }[];
};

export type Run = {
  id: string;
  jobId: string;
  agentId: string;
  agentName: string;
  status: RunStatus;
  durationMs: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  logs: RunLogEntry[];
  steps: RunStep[];
  output: RunOutput | null;
  artifactIds: string[];
};

export type Artifact = {
  id: string;
  runId: string;
  agentId: string;
  name: string;
  type: ArtifactType;
  size: number;
  storageKey: string;
  downloadUrl: string;
  createdAt: string;
};

export type WorkerRuntime = {
  id: string;
  name: string;
  runtimeType: RuntimeType;
  image: string;
  supportedTools: AgentTool[];
  status: WorkerRuntimeStatus;
};

export type RenderedRuntimeFile = {
  path: string;
  content: string;
};

export type RenderedRuntimeLaunch = {
  env: AgentEnvVar[];
  files: RenderedRuntimeFile[];
  command: string[] | null;
  metadata?: Record<string, unknown>;
};

export type DeploymentRuntimeAuth = {
  token?: string;
};

export type DeploymentLogEntry = {
  id: string;
  deploymentId: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
};

export type AgentDeployment = {
  id: string;
  agentId: string;
  templateId: string;
  image: string;
  runtimeAdapter: RuntimeAdapter;
  containerId: string | null;
  endpoint: string | null;
  runtimeSource: "local-service" | "container";
  status: DeploymentStatus;
  renderedLaunch: RenderedRuntimeLaunch | null;
  runtimeAuth: DeploymentRuntimeAuth | null;
  createdAt: string;
  updatedAt: string;
  lastHealthAt: string | null;
};

export type ChatMessage = {
  id: string;
  agentId: string;
  deploymentId: string | null;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type DeployRequest = {
  templateId: string;
  agentName: string;
  model: string;
  tools: AgentTool[];
  memory: AgentMemoryType;
  runtimeType: RuntimeType;
  llmProfileId: string | null;
  envVars: AgentEnvVar[];
};

export type LlmProfile = {
  id: string;
  name: string;
  provider: string;
  model: string;
  authType: string;
  status: "active" | "limited";
  scopes: string[];
  lastUsed: string;
  apiKeyPreview: string;
  keyEnvVar: string;
  baseUrlEnvVar?: string;
  apiKeySecret: string;
  baseUrl?: string;
};

export type LlmProfileInput = {
  name: string;
  provider: string;
  model: string;
  authType: string;
  apiKey: string;
  baseUrl?: string;
};

export type LlmProfileUpdateInput = {
  id: string;
  name: string;
  provider: string;
  model: string;
  authType: string;
  apiKey?: string;
  baseUrl?: string;
};

export type SettingsData = {
  workspaceName: string;
  environment: string;
  defaultModel: string;
  fallbackModel: string;
  routingStrategy: string;
  storage: string;
  memoryStore: AgentMemoryType;
  region: string;
  autoDeploy: boolean;
  warmContainers: boolean;
  auditLogging: boolean;
  artifactRetentionDays: number;
  maxConcurrency: number;
  llmProfiles: LlmProfile[];
};

export type ControlPlaneState = {
  templates: AgentTemplate[];
  agents: AgentInstance[];
  deployments: AgentDeployment[];
  deploymentLogs: DeploymentLogEntry[];
  jobs: Job[];
  runs: Run[];
  artifacts: Artifact[];
  messages: ChatMessage[];
  runtimes: WorkerRuntime[];
  settings: SettingsData;
};

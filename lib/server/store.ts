import { type Artifact, type ControlPlaneState, type DeployRequest, type Job, type LlmProfile, type LlmProfileInput, type Run, type RunOutput, type RunStep, type SettingsData } from "@/lib/domain/types";
import { type RunExecutionRequest } from "@/lib/server/queue";
import { createSeedState } from "@/lib/server/seed";

type GlobalState = typeof globalThis & {
  __sidekicksControlPlaneState?: ControlPlaneState;
  __sidekicksScheduledRuns?: Set<string>;
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

function buildProfileSecretPreview(secret: string) {
  const trimmed = secret.trim();

  if (!trimmed) {
    return "configured";
  }

  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}...${trimmed.slice(-2)}`;
  }

  return `${trimmed.slice(0, 7)}...${trimmed.slice(-4)}`;
}

function envVarForProvider(provider: string) {
  if (provider === "Anthropic") {
    return { keyEnvVar: "ANTHROPIC_API_KEY" };
  }

  if (provider === "Azure OpenAI") {
    return {
      keyEnvVar: "AZURE_OPENAI_API_KEY",
      baseUrlEnvVar: "AZURE_OPENAI_BASE_URL"
    };
  }

  if (provider === "OpenRouter") {
    return { keyEnvVar: "OPENROUTER_API_KEY" };
  }

  return { keyEnvVar: "OPENAI_API_KEY" };
}

export function updateSettings(update: Partial<SettingsData>) {
  const state = getControlPlaneState();
  state.settings = {
    ...state.settings,
    ...update
  };

  return state.settings;
}

export function addLlmProfile(input: LlmProfileInput): SettingsData {
  const state = getControlPlaneState();
  const providerEnv = envVarForProvider(input.provider);
  const nextProfile: LlmProfile = {
    id: `profile_${Math.random().toString(36).slice(2, 10)}`,
    name: input.name.trim(),
    provider: input.provider,
    model: input.model,
    authType: input.authType,
    status: "active",
    scopes: ["Deployments", "Runs"],
    lastUsed: "never",
    apiKeyPreview: buildProfileSecretPreview(input.apiKey),
    keyEnvVar: providerEnv.keyEnvVar,
    baseUrlEnvVar: providerEnv.baseUrlEnvVar,
    apiKeySecret: input.apiKey.trim(),
    baseUrl: input.baseUrl?.trim() || undefined
  };

  state.settings = {
    ...state.settings,
    llmProfiles: [nextProfile, ...state.settings.llmProfiles]
  };

  return state.settings;
}

function getScheduledRuns() {
  const globalState = getGlobalState();

  if (!globalState.__sidekicksScheduledRuns) {
    globalState.__sidekicksScheduledRuns = new Set<string>();
  }

  return globalState.__sidekicksScheduledRuns;
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
    isPaused: false,
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

export function deleteAgentInstance(agentId: string) {
  const state = getControlPlaneState();
  const index = state.agents.findIndex((item) => item.id === agentId);

  if (index === -1) {
    return { deleted: false as const };
  }

  const [agent] = state.agents.splice(index, 1);
  state.messages = state.messages.filter((item) => item.agentId !== agentId);
  state.artifacts = state.artifacts.filter((item) => item.agentId !== agentId);
  state.runs = state.runs.filter((item) => item.agentId !== agentId);
  state.jobs = state.jobs.filter((item) => item.agentId !== agentId);

  return {
    deleted: true as const,
    id: agent.id,
    name: agent.name
  };
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

function buildInitialSteps(): RunStep[] {
  return [
    { id: `step_${Math.random().toString(36).slice(2, 8)}`, title: "Queue run", state: "completed", detail: "Run accepted by control plane." },
    { id: `step_${Math.random().toString(36).slice(2, 8)}`, title: "Start worker", state: "pending", detail: "Waiting for available worker runtime." },
    { id: `step_${Math.random().toString(36).slice(2, 8)}`, title: "Execute task", state: "pending", detail: "Task execution has not started yet." },
    { id: `step_${Math.random().toString(36).slice(2, 8)}`, title: "Persist outputs", state: "pending", detail: "Artifacts and metadata will be stored after execution." }
  ];
}

function appendRunLog(run: Run, message: string, level: "info" | "warn" | "error" = "info") {
  run.logs.push({
    id: `log_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    level,
    message
  });
}

function createArtifact(run: Run, agentId: string, name: string, type: Artifact["type"], size: number): Artifact {
  const artifactId = `artifact_${Math.random().toString(36).slice(2, 10)}`;

  return {
    id: artifactId,
    runId: run.id,
    agentId,
    name,
    type,
    size,
    storageKey: `runs/${run.id}/${name}`,
    downloadUrl: "#",
    createdAt: new Date().toISOString()
  };
}

function createRunOutput(run: Run, agentName: string, title: string): RunOutput {
  return {
    title,
    summary: `Run ${run.id} completed successfully for ${agentName}. The worker produced logs, structured steps, and a saved output bundle.`,
    highlights: [
      "The control plane created the job and scheduled it to the worker queue.",
      "Execution progressed through queue, worker startup, task execution, and artifact persistence.",
      "Artifacts are now available in storage and linked back to this run."
    ],
    markdown: `# ${title}\n\nExecution finished successfully for ${agentName}.`,
    links: [
      { label: "output.md", href: "#" },
      { label: "run-log.txt", href: "#" }
    ]
  };
}

function scheduleRunExecution(request: RunExecutionRequest) {
  const scheduledRuns = getScheduledRuns();

  if (scheduledRuns.has(request.runId)) {
    return;
  }

  scheduledRuns.add(request.runId);

  setTimeout(() => {
    const state = getControlPlaneState();
    const run = state.runs.find((item) => item.id === request.runId);
    const job = state.jobs.find((item) => item.id === request.jobId);
    const agent = state.agents.find((item) => item.id === request.agentId);

    if (!run || !job || !agent) {
      scheduledRuns.delete(request.runId);
      return;
    }

    run.status = "running";
    run.startedAt = new Date().toISOString();
    job.status = "running";
    job.startedAt = run.startedAt;
    agent.status = "running";
    agent.lastRunAt = run.startedAt;
    agent.updatedAt = run.startedAt;
    run.steps[1].state = "active";
    appendRunLog(run, `Worker claimed run on ${request.runtimeType} runtime.`);
  }, 700);

  setTimeout(() => {
    const state = getControlPlaneState();
    const run = state.runs.find((item) => item.id === request.runId);

    if (!run) {
      scheduledRuns.delete(request.runId);
      return;
    }

    run.steps[1].state = "completed";
    run.steps[2].state = "active";
    appendRunLog(run, "Execution started inside isolated worker context.");
  }, 1600);

  setTimeout(() => {
    const state = getControlPlaneState();
    const run = state.runs.find((item) => item.id === request.runId);

    if (!run) {
      scheduledRuns.delete(request.runId);
      return;
    }

    appendRunLog(run, "Collected outputs, compiling final result bundle.");
    run.steps[2].detail = "Primary task execution completed. Finalizing output package.";
  }, 2600);

  setTimeout(() => {
    const state = getControlPlaneState();
    const run = state.runs.find((item) => item.id === request.runId);
    const job = state.jobs.find((item) => item.id === request.jobId);
    const agent = state.agents.find((item) => item.id === request.agentId);

    if (!run || !job || !agent) {
      scheduledRuns.delete(request.runId);
      return;
    }

    const shouldFail = job.input.prompt.toLowerCase().includes("fail");
    const completedAt = new Date().toISOString();
    const startedAt = run.startedAt ? new Date(run.startedAt).getTime() : Date.now();
    run.completedAt = completedAt;
    run.durationMs = new Date(completedAt).getTime() - startedAt;
    job.completedAt = completedAt;

    if (shouldFail) {
      run.status = "failed";
      job.status = "failed";
      agent.status = "error";
      run.steps[2].state = "failed";
      run.steps[3].state = "failed";
      run.output = {
        title: "Run failed",
        summary: "Execution stopped because the prompt explicitly requested a failure path for testing.",
        highlights: ["This is a simulated worker failure for MVP testing."],
        markdown: "# Run failed\n\nThis failure was intentionally simulated.",
        links: [{ label: "failure-log.txt", href: "#" }]
      };
      appendRunLog(run, "Worker marked run as failed during simulated execution.", "error");
    } else {
      run.status = "completed";
      job.status = "completed";
      agent.status = agent.isPaused ? "paused" : "idle";
      run.steps[2].state = "completed";
      run.steps[3].state = "completed";
      run.steps[3].detail = "Artifacts persisted to storage metadata.";
      run.output = createRunOutput(run, request.agentName, job.title);

      const markdownArtifact = createArtifact(run, request.agentId, `${job.title.toLowerCase().replace(/\s+/g, "-")}.md`, "markdown", 18240);
      const logArtifact = createArtifact(run, request.agentId, `${run.id}-log.txt`, "log", 8420);
      state.artifacts.unshift(logArtifact, markdownArtifact);
      run.artifactIds.push(markdownArtifact.id, logArtifact.id);
      appendRunLog(run, "Persisted output bundle and run log artifacts.");
    }

    agent.updatedAt = completedAt;
    scheduledRuns.delete(request.runId);
  }, 3800);
}

export function createJobAndRun(input: Omit<Job, "id" | "createdAt" | "startedAt" | "completedAt" | "status">) {
  const state = getControlPlaneState();
  const agent = state.agents.find((item) => item.id === input.agentId);

  if (!agent) {
    throw new Error("Agent not found");
  }

  if (agent.isPaused) {
    throw new Error("Agent is paused");
  }

  const nextJob = createJobRecord(input);
  const createdAt = new Date().toISOString();
  const nextRun: Run = {
    id: `run_${Math.random().toString(36).slice(2, 8)}`,
    jobId: nextJob.id,
    agentId: input.agentId,
    agentName: input.agentName,
    status: "queued",
    durationMs: null,
    createdAt,
    startedAt: null,
    completedAt: null,
    logs: [
      {
        id: `log_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: createdAt,
        level: "info",
        message: "Run queued by control plane."
      }
    ],
    steps: buildInitialSteps(),
    output: null,
    artifactIds: []
  };

  state.runs.unshift(nextRun);

  scheduleRunExecution({
    runId: nextRun.id,
    jobId: nextJob.id,
    agentId: input.agentId,
    agentName: input.agentName,
    deploymentId: null,
    runtimeType: agent.runtimeType,
    templateId: agent.templateId,
    requestedAt: createdAt
  });

  return { job: nextJob, run: nextRun };
}

export function setAgentPaused(agentId: string, paused: boolean, force = false) {
  const state = getControlPlaneState();
  const agent = state.agents.find((item) => item.id === agentId);

  if (!agent) {
    return null;
  }

  agent.isPaused = paused;

  if (!paused && agent.status === "paused") {
    agent.status = "idle";
  } else if (paused) {
    if (force || agent.status !== "running") {
      agent.status = "paused";
    }
  }

  agent.updatedAt = new Date().toISOString();

  return agent;
}

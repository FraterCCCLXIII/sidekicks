import { type Artifact, type ControlPlaneState, type DeployRequest, type Job, type Run, type RunOutput, type RunStep } from "@/lib/domain/types";
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
      agent.status = "idle";
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
    runtimeType: agent.runtimeType,
    templateId: agent.templateId,
    requestedAt: createdAt
  });

  return { job: nextJob, run: nextRun };
}

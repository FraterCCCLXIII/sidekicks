import {
  type AgentInstance,
  type AgentDeployment,
  type AgentTemplate,
  type Artifact,
  type ChatMessage,
  type ControlPlaneState,
  type LlmProfile,
  type Run,
  type SettingsData
} from "@/lib/domain/types";

export type DashboardView = {
  stats: {
    activeAgents: number;
    jobsRunning: number;
    successRate: string;
  };
  runs: RunListItemView[];
  templates: TemplateListItemView[];
};

export type TemplateListItemView = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: AgentTemplate["kind"];
  category: string;
  tags: string[];
  packageName: string;
  packageVersion: string;
  sourceRepo: string;
  runtimeImage: string;
  isolationMode: AgentTemplate["isolationMode"];
  model: string;
  tools: AgentTemplate["supportedTools"];
  runtimeType: AgentTemplate["runtimeType"];
};

export type TemplateDetailView = TemplateListItemView & {
  deploymentConfig: AgentTemplate["deploymentConfig"];
  exampleUseCases: string[];
  configSchema: AgentTemplate["configSchema"];
};

export type AgentListItemView = {
  id: string;
  name: string;
  template: string;
  status: AgentInstance["status"];
  jobs: number;
  region: string;
  lastRunAt: string | null;
};

export type AgentDetailView = AgentListItemView & {
  model: string;
  memory: AgentInstance["memory"];
  runtimeType: AgentInstance["runtimeType"];
  tools: AgentInstance["tools"];
  envVars: AgentInstance["envVars"];
  createdAt: string;
  deployment: DeploymentView | null;
  chatMessages: ChatMessageView[];
  recentRuns: RunListItemView[];
};

export type DeploymentView = {
  id: string;
  status: AgentDeployment["status"];
  containerId: string | null;
  endpoint: string | null;
  image: string;
  runtimeSource: AgentDeployment["runtimeSource"];
  runtimeAdapter: AgentDeployment["runtimeAdapter"];
  nativeDashboardUrl: string | null;
  nativeDashboardToken: string | null;
  lastHealthAt: string | null;
};

export type ChatMessageView = {
  id: string;
  role: ChatMessage["role"];
  content: string;
  createdAt: string;
};

export type RunListItemView = {
  id: string;
  agent: string;
  template: string;
  status: Run["status"];
  startedAt: string;
  duration: string;
};

export type RunDetailView = {
  id: string;
  agent: string;
  template: string;
  status: Run["status"];
  startedAt: string;
  duration: string;
  model: string;
  tools: AgentInstance["tools"];
  logs: string[];
  steps: { id: string; title: string; state: "done" | "active" | "pending" | "failed"; detail: string }[];
  output: {
    title: string;
    summary: string;
    highlights: string[];
    links: { label: string; href: string }[];
  };
};

export type ArtifactListItemView = {
  id: string;
  name: string;
  size: string;
  updatedAt: string;
  kind: string;
  runId: string;
  agentId: string;
  downloadUrl: string;
};

function formatRelativeTime(dateString: string | null) {
  if (!dateString) {
    return "--";
  }

  const diffMs = new Date(dateString).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 60) {
    return `${absMinutes} min ago`;
  }

  const absHours = Math.round(absMinutes / 60);

  if (absHours < 24) {
    return `${absHours} hr ago`;
  }

  const absDays = Math.round(absHours / 24);

  return `${absDays} day ago`;
}

function formatDuration(durationMs: number | null) {
  if (!durationMs) {
    return "--";
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatBytes(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

function agentTemplateName(state: ControlPlaneState, agentId: string) {
  return state.agents.find((agent) => agent.id === agentId)?.templateName ?? "Unknown Template";
}

function findDeployment(state: ControlPlaneState, agentId: string) {
  return state.deployments.find((deployment) => deployment.agentId === agentId) ?? null;
}

function maskEnvValue(key: string, value: string) {
  if (/key|token|secret|password/i.test(key)) {
    if (!value) {
      return "configured";
    }

    if (value.length <= 8) {
      return `${value.slice(0, 2)}...${value.slice(-2)}`;
    }

    return `${value.slice(0, 7)}...${value.slice(-4)}`;
  }

  return value;
}

function presentDeployment(deployment: AgentDeployment, agentId?: string): DeploymentView {
  const nativeDashboardUrl =
    deployment.runtimeAdapter === "openclaw-upstream" && agentId
      ? `/agents/${agentId}/native-dashboard`
      : null;

  return {
    id: deployment.id,
    status: deployment.status,
    containerId: deployment.containerId,
    endpoint: deployment.endpoint,
    image: deployment.image,
    runtimeSource: deployment.runtimeSource,
    runtimeAdapter: deployment.runtimeAdapter,
    nativeDashboardUrl,
    // Never send raw runtime auth tokens to the browser.
    nativeDashboardToken: null,
    lastHealthAt: deployment.lastHealthAt ? formatRelativeTime(deployment.lastHealthAt) : null
  };
}

export function presentChatMessage(message: ChatMessage): ChatMessageView {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: formatRelativeTime(message.createdAt)
  };
}

export function presentTemplate(template: AgentTemplate): TemplateListItemView {
  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    description: template.description,
    kind: template.kind,
    category: template.category,
    tags: template.tags,
    packageName: template.packageName,
    packageVersion: template.packageVersion,
    sourceRepo: template.sourceRepo,
    runtimeImage: template.runtimeImage,
    isolationMode: template.isolationMode,
    model: template.defaultModel,
    tools: template.supportedTools,
    runtimeType: template.runtimeType
  };
}

export function presentTemplateDetail(template: AgentTemplate): TemplateDetailView {
  return {
    ...presentTemplate(template),
    deploymentConfig: template.deploymentConfig,
    exampleUseCases: template.exampleUseCases,
    configSchema: template.configSchema
  };
}

export function presentAgent(agent: AgentInstance): AgentListItemView {
  return {
    id: agent.id,
    name: agent.name,
    template: agent.templateName,
    status: agent.status,
    jobs: agent.jobsCount,
    region: agent.region,
    lastRunAt: agent.lastRunAt
  };
}

export function presentAgentDetail(state: ControlPlaneState, agent: AgentInstance): AgentDetailView {
  const deployment = findDeployment(state, agent.id);

  return {
    ...presentAgent(agent),
    model: agent.model,
    memory: agent.memory,
    runtimeType: agent.runtimeType,
    tools: agent.tools,
    envVars: agent.envVars.map((envVar) => ({
      ...envVar,
      value: maskEnvValue(envVar.key, envVar.value)
    })),
    createdAt: formatRelativeTime(agent.createdAt),
    deployment: deployment ? presentDeployment(deployment, agent.id) : null,
    chatMessages: state.messages
      .filter((message) => message.agentId === agent.id)
      .slice(-20)
      .map(presentChatMessage),
    recentRuns: state.runs
      .filter((run) => run.agentId === agent.id)
      .slice(0, 5)
      .map((run) => presentRun(state, run))
  };
}

export function presentRun(state: ControlPlaneState, run: Run): RunListItemView {
  return {
    id: run.id,
    agent: run.agentName,
    template: agentTemplateName(state, run.agentId),
    status: run.status,
    startedAt: formatRelativeTime(run.startedAt ?? run.createdAt),
    duration: formatDuration(run.durationMs)
  };
}

export function presentRunDetail(state: ControlPlaneState, run: Run): RunDetailView {
  const agent = state.agents.find((item) => item.id === run.agentId);

  return {
    id: run.id,
    agent: run.agentName,
    template: agentTemplateName(state, run.agentId),
    status: run.status,
    startedAt: formatRelativeTime(run.startedAt ?? run.createdAt),
    duration: formatDuration(run.durationMs),
    model: agent?.model ?? state.settings.defaultModel,
    tools: agent?.tools ?? [],
    logs: run.logs.map((entry) => `> ${entry.message}`),
    steps: run.steps.map((step) => ({
      id: step.id,
      title: step.title,
      state:
        step.state === "completed"
          ? "done"
          : step.state === "active"
            ? "active"
            : step.state === "failed"
              ? "failed"
              : "pending",
      detail: step.detail
    })),
    output: run.output ?? {
      title: "Pending output",
      summary: "This run has not produced an output bundle yet.",
      highlights: ["Execution is still waiting to complete."],
      links: []
    }
  };
}

export function presentArtifact(artifact: Artifact): ArtifactListItemView {
  return {
    id: artifact.id,
    name: artifact.name,
    size: formatBytes(artifact.size),
    updatedAt: formatRelativeTime(artifact.createdAt),
    kind: artifact.type.charAt(0).toUpperCase() + artifact.type.slice(1),
    runId: artifact.runId,
    agentId: artifact.agentId,
    downloadUrl: artifact.downloadUrl
  };
}

export function presentDashboard(state: ControlPlaneState): DashboardView {
  const totalFinishedRuns = state.runs.filter((run) => run.status === "completed" || run.status === "failed");
  const completedRuns = totalFinishedRuns.filter((run) => run.status === "completed");
  const successRate =
    totalFinishedRuns.length === 0
      ? "0%"
      : `${((completedRuns.length / totalFinishedRuns.length) * 100).toFixed(1)}%`;

  return {
    stats: {
      activeAgents: state.agents.filter((agent) => agent.status === "running").length,
      jobsRunning: state.jobs.filter((job) => job.status === "running" || job.status === "queued").length,
      successRate
    },
    runs: state.runs.slice(0, 4).map((run) => presentRun(state, run)),
    templates: state.templates.filter((template) => template.featured).slice(0, 3).map(presentTemplate)
  };
}

export function presentSettings(settings: SettingsData) {
  return {
    ...settings,
    llmProfiles: settings.llmProfiles.map((profile: LlmProfile) => ({
      ...profile,
      apiKeySecret: ""
    }))
  };
}

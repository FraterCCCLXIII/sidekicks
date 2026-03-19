import {
  type AgentInstance,
  type AgentTemplate,
  type Artifact,
  type ControlPlaneState,
  type Job,
  type Run,
  type SettingsData
} from "@/lib/domain/types";
import { defineWorkerRuntime } from "@/lib/server/queue";

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60_000).toISOString();
}

const templates: AgentTemplate[] = [
  {
    id: "tpl_research",
    slug: "research-agent",
    name: "Research Agent",
    description: "Searches the web, gathers information, summarizes findings, and produces structured reports.",
    icon: "FileSearch",
    category: "Research",
    tags: ["Web", "Browser", "Files"],
    supportedTools: ["web", "browser", "files"],
    defaultModel: "GPT-4o",
    defaultMemory: "redis",
    runtimeType: "node",
    deploymentConfig: {
      recommendedConcurrency: 4,
      artifactStrategy: "report-bundle",
      workerQueue: "node:research"
    },
    featured: true,
    exampleUseCases: ["Competitive brief", "Market map", "Source-backed memo"]
  },
  {
    id: "tpl_app_builder",
    slug: "app-builder-agent",
    name: "App Builder Agent",
    description: "Builds small web apps, prototypes, landing pages, and utility tools from prompts.",
    icon: "Code2",
    category: "Development",
    tags: ["Code", "Filesystem", "Files"],
    supportedTools: ["code", "filesystem", "files"],
    defaultModel: "GPT-4.1",
    defaultMemory: "redis",
    runtimeType: "node",
    deploymentConfig: {
      recommendedConcurrency: 2,
      artifactStrategy: "app-build",
      workerQueue: "node:builder"
    },
    featured: true,
    exampleUseCases: ["Landing page", "Internal tool", "Demo app"]
  },
  {
    id: "tpl_content",
    slug: "content-agent",
    name: "Content Agent",
    description: "Creates blog posts, landing page copy, marketing drafts, and SEO-oriented content.",
    icon: "WandSparkles",
    category: "Marketing",
    tags: ["Web", "Files", "SEO"],
    supportedTools: ["web", "files"],
    defaultModel: "GPT-4o mini",
    defaultMemory: "redis",
    runtimeType: "node",
    deploymentConfig: {
      recommendedConcurrency: 4,
      artifactStrategy: "content-package",
      workerQueue: "node:content"
    },
    featured: false,
    exampleUseCases: ["Launch copy", "Blog outline", "SEO refresh"]
  },
  {
    id: "tpl_data_analyst",
    slug: "data-analyst-agent",
    name: "Data Analyst Agent",
    description: "Analyzes datasets and uploaded files, produces summaries, charts, and insights.",
    icon: "ChartColumn",
    category: "Analytics",
    tags: ["Files", "Python", "Charts"],
    supportedTools: ["files", "python", "charts"],
    defaultModel: "Claude 3.5 Sonnet",
    defaultMemory: "postgres",
    runtimeType: "python",
    deploymentConfig: {
      recommendedConcurrency: 2,
      artifactStrategy: "analysis-bundle",
      workerQueue: "python:analytics"
    },
    featured: true,
    exampleUseCases: ["CSV analysis", "KPI review", "Report with charts"]
  },
  {
    id: "tpl_automation",
    slug: "automation-agent",
    name: "Automation Agent",
    description: "Performs workflow-like actions, API tasks, and repeatable operational jobs.",
    icon: "Workflow",
    category: "Operations",
    tags: ["API", "Webhooks", "Files"],
    supportedTools: ["api", "webhooks", "files"],
    defaultModel: "GPT-4o",
    defaultMemory: "redis",
    runtimeType: "node",
    deploymentConfig: {
      recommendedConcurrency: 6,
      artifactStrategy: "action-log",
      workerQueue: "node:ops"
    },
    featured: false,
    exampleUseCases: ["Webhook relay", "Ops sync", "Scheduled workflow"]
  }
];

const agents: AgentInstance[] = [
  {
    id: "agent_research_1",
    name: "research-1",
    templateId: "tpl_research",
    templateName: "Research Agent",
    status: "running",
    model: "GPT-4o",
    tools: ["web", "browser", "files"],
    memory: "redis",
    runtimeType: "node",
    envVars: [
      { key: "REPORT_STYLE", value: "briefing" },
      { key: "SOURCE_LIMIT", value: "12" }
    ],
    jobsCount: 3,
    createdAt: isoHoursAgo(36),
    updatedAt: isoMinutesAgo(2),
    lastRunAt: isoMinutesAgo(2),
    region: "us-west-2"
  },
  {
    id: "agent_builder_1",
    name: "builder-1",
    templateId: "tpl_app_builder",
    templateName: "App Builder Agent",
    status: "idle",
    model: "GPT-4.1",
    tools: ["code", "filesystem", "files"],
    memory: "redis",
    runtimeType: "node",
    envVars: [{ key: "TARGET_STACK", value: "nextjs" }],
    jobsCount: 2,
    createdAt: isoHoursAgo(30),
    updatedAt: isoHoursAgo(1),
    lastRunAt: isoMinutesAgo(17),
    region: "us-east-1"
  },
  {
    id: "agent_content_1",
    name: "content-west",
    templateId: "tpl_content",
    templateName: "Content Agent",
    status: "paused",
    model: "GPT-4o mini",
    tools: ["web", "files"],
    memory: "redis",
    runtimeType: "node",
    envVars: [{ key: "BRAND_TONE", value: "confident" }],
    jobsCount: 1,
    createdAt: isoHoursAgo(20),
    updatedAt: isoHoursAgo(3),
    lastRunAt: isoHoursAgo(3),
    region: "us-west-2"
  },
  {
    id: "agent_data_1",
    name: "analyst-datasets",
    templateId: "tpl_data_analyst",
    templateName: "Data Analyst Agent",
    status: "running",
    model: "Claude 3.5 Sonnet",
    tools: ["files", "python", "charts"],
    memory: "postgres",
    runtimeType: "python",
    envVars: [{ key: "CHART_THEME", value: "mono" }],
    jobsCount: 4,
    createdAt: isoHoursAgo(42),
    updatedAt: isoMinutesAgo(28),
    lastRunAt: isoMinutesAgo(28),
    region: "eu-central-1"
  },
  {
    id: "agent_ops_1",
    name: "ops-automator",
    templateId: "tpl_automation",
    templateName: "Automation Agent",
    status: "error",
    model: "GPT-4o",
    tools: ["api", "webhooks", "files"],
    memory: "redis",
    runtimeType: "node",
    envVars: [{ key: "DESTINATION_ENV", value: "staging" }],
    jobsCount: 2,
    createdAt: isoHoursAgo(18),
    updatedAt: isoMinutesAgo(48),
    lastRunAt: isoMinutesAgo(48),
    region: "us-east-1"
  },
  {
    id: "agent_research_2",
    name: "research-eu",
    templateId: "tpl_research",
    templateName: "Research Agent",
    status: "idle",
    model: "GPT-4o",
    tools: ["web", "browser", "files"],
    memory: "redis",
    runtimeType: "node",
    envVars: [{ key: "LOCALE", value: "en-GB" }],
    jobsCount: 1,
    createdAt: isoHoursAgo(11),
    updatedAt: isoHoursAgo(2),
    lastRunAt: isoHoursAgo(6),
    region: "eu-central-1"
  }
];

const jobs: Job[] = [
  {
    id: "job_001",
    agentId: "agent_research_1",
    agentName: "research-1",
    title: "Competitive launch scan",
    input: { prompt: "Compare competitor launch messaging for AI app builders." },
    status: "running",
    createdAt: isoMinutesAgo(6),
    startedAt: isoMinutesAgo(5),
    completedAt: null
  },
  {
    id: "job_002",
    agentId: "agent_builder_1",
    agentName: "builder-1",
    title: "Generate product landing page",
    input: { prompt: "Create a landing page for Sidekicks." },
    status: "completed",
    createdAt: isoMinutesAgo(22),
    startedAt: isoMinutesAgo(20),
    completedAt: isoMinutesAgo(8)
  },
  {
    id: "job_003",
    agentId: "agent_ops_1",
    agentName: "ops-automator",
    title: "Replay webhook sync",
    input: { prompt: "Replay failed webhook delivery batch." },
    status: "failed",
    createdAt: isoMinutesAgo(55),
    startedAt: isoMinutesAgo(53),
    completedAt: isoMinutesAgo(50)
  },
  {
    id: "job_004",
    agentId: "agent_content_1",
    agentName: "content-west",
    title: "Homepage rewrite draft",
    input: { prompt: "Draft new homepage copy for the control plane." },
    status: "queued",
    createdAt: isoHoursAgo(1),
    startedAt: null,
    completedAt: null
  },
  {
    id: "job_005",
    agentId: "agent_data_1",
    agentName: "analyst-datasets",
    title: "Retention analysis",
    input: { prompt: "Analyze retention by cohort from uploaded CSVs." },
    status: "completed",
    createdAt: isoHoursAgo(2),
    startedAt: isoHoursAgo(2),
    completedAt: isoHoursAgo(2)
  },
  {
    id: "job_006",
    agentId: "agent_research_2",
    agentName: "research-eu",
    title: "Find self-hosted agent platforms",
    input: { prompt: "List self-hosted control planes comparable to Sidekicks." },
    status: "completed",
    createdAt: isoHoursAgo(6),
    startedAt: isoHoursAgo(6),
    completedAt: isoHoursAgo(6)
  }
];

const runs: Run[] = [
  {
    id: "run_789",
    jobId: "job_001",
    agentId: "agent_research_1",
    agentName: "research-1",
    status: "running",
    durationMs: 252000,
    createdAt: isoMinutesAgo(6),
    startedAt: isoMinutesAgo(5),
    completedAt: null,
    logs: [
      { id: "log_1", timestamp: isoMinutesAgo(5), level: "info", message: "Searching launch announcement sources..." },
      { id: "log_2", timestamp: isoMinutesAgo(4), level: "info", message: "Fetching product pages and pricing tables..." },
      { id: "log_3", timestamp: isoMinutesAgo(2), level: "info", message: "Summarizing findings into markdown report..." }
    ],
    steps: [
      { id: "step_1", title: "Collect sources", state: "completed", detail: "Indexed 12 source URLs." },
      { id: "step_2", title: "Normalize claims", state: "active", detail: "Comparing feature deltas and messaging." },
      { id: "step_3", title: "Write report", state: "pending", detail: "Preparing output bundle." }
    ],
    output: {
      title: "Competitive Launch Brief",
      summary: "Vendors that feel closest to a Vercel-for-agents narrative focus on fast deploys, observability, and worker isolation.",
      highlights: [
        "Control-plane UX matters as much as underlying models for retention.",
        "Users trust platforms that expose logs, steps, and downloadable outputs.",
        "Self-hosting stories resonate strongly with infrastructure-conscious buyers."
      ],
      markdown: "# Competitive Launch Brief\n\n- Control plane matters.\n- Isolation matters.\n- Fast deploys matter.",
      links: [
        { label: "brief.md", href: "#" },
        { label: "sources.json", href: "#" },
        { label: "market-map.pdf", href: "#" }
      ]
    },
    artifactIds: ["artifact_001", "artifact_002", "artifact_003"]
  },
  {
    id: "run_788",
    jobId: "job_002",
    agentId: "agent_builder_1",
    agentName: "builder-1",
    status: "completed",
    durationMs: 708000,
    createdAt: isoMinutesAgo(22),
    startedAt: isoMinutesAgo(20),
    completedAt: isoMinutesAgo(8),
    logs: [
      { id: "log_4", timestamp: isoMinutesAgo(20), level: "info", message: "Scaffolding Next.js application shell..." },
      { id: "log_5", timestamp: isoMinutesAgo(15), level: "info", message: "Generating components and copy..." },
      { id: "log_6", timestamp: isoMinutesAgo(8), level: "info", message: "Packaging deployable artifact." }
    ],
    steps: [
      { id: "step_4", title: "Create scaffold", state: "completed", detail: "Generated app skeleton and routes." },
      { id: "step_5", title: "Write UI", state: "completed", detail: "Created landing page components." },
      { id: "step_6", title: "Bundle app", state: "completed", detail: "Produced deployment archive." }
    ],
    output: {
      title: "Landing Page Prototype",
      summary: "Generated a deployable Next.js landing page prototype tailored to the Sidekicks positioning.",
      highlights: [
        "Includes hero, features, CTA, and FAQ.",
        "Ready for zip-based artifact deployment.",
        "Build summary and source bundle included."
      ],
      markdown: "# Landing Page Prototype\n\nArtifact bundle generated successfully.",
      links: [
        { label: "app.zip", href: "#" },
        { label: "build-log.txt", href: "#" }
      ]
    },
    artifactIds: ["artifact_004", "artifact_005"]
  },
  {
    id: "run_787",
    jobId: "job_003",
    agentId: "agent_ops_1",
    agentName: "ops-automator",
    status: "failed",
    durationMs: 177000,
    createdAt: isoMinutesAgo(55),
    startedAt: isoMinutesAgo(53),
    completedAt: isoMinutesAgo(50),
    logs: [
      { id: "log_7", timestamp: isoMinutesAgo(53), level: "info", message: "Starting webhook replay sequence..." },
      { id: "log_8", timestamp: isoMinutesAgo(51), level: "error", message: "Destination API returned 401 unauthorized." }
    ],
    steps: [
      { id: "step_7", title: "Load failed deliveries", state: "completed", detail: "Loaded 48 failed events." },
      { id: "step_8", title: "Replay batch", state: "failed", detail: "Authentication failed while replaying batch." }
    ],
    output: {
      title: "Webhook Replay Failure",
      summary: "Replay was interrupted because destination credentials expired on the target environment.",
      highlights: [
        "48 events were prepared for replay.",
        "No downstream state was mutated after auth failure."
      ],
      markdown: "# Replay Failure\n\nDestination API credentials are invalid.",
      links: [{ label: "failure-log.txt", href: "#" }]
    },
    artifactIds: ["artifact_006"]
  },
  {
    id: "run_786",
    jobId: "job_004",
    agentId: "agent_content_1",
    agentName: "content-west",
    status: "queued",
    durationMs: null,
    createdAt: isoHoursAgo(1),
    startedAt: null,
    completedAt: null,
    logs: [{ id: "log_9", timestamp: isoHoursAgo(1), level: "info", message: "Job accepted and waiting for worker." }],
    steps: [{ id: "step_9", title: "Queue for execution", state: "pending", detail: "Waiting for an available node runtime worker." }],
    output: null,
    artifactIds: []
  },
  {
    id: "run_785",
    jobId: "job_005",
    agentId: "agent_data_1",
    agentName: "analyst-datasets",
    status: "completed",
    durationMs: 504000,
    createdAt: isoHoursAgo(2),
    startedAt: isoHoursAgo(2),
    completedAt: isoHoursAgo(2),
    logs: [
      { id: "log_10", timestamp: isoHoursAgo(2), level: "info", message: "Loading CSV uploads..." },
      { id: "log_11", timestamp: isoHoursAgo(2), level: "info", message: "Generating retention visualization..." }
    ],
    steps: [
      { id: "step_10", title: "Load datasets", state: "completed", detail: "Loaded 3 CSV files." },
      { id: "step_11", title: "Generate charts", state: "completed", detail: "Created cohort retention chart." }
    ],
    output: {
      title: "Retention Analysis",
      summary: "Cohort retention improved 8% after the product onboarding changes rolled out.",
      highlights: [
        "Month-two retention climbed most for SMB accounts.",
        "The onboarding update correlates with earlier activation."
      ],
      markdown: "# Retention Analysis\n\nRetention is improving in the target segment.",
      links: [{ label: "retention-chart.png", href: "#" }]
    },
    artifactIds: ["artifact_007", "artifact_008"]
  },
  {
    id: "run_784",
    jobId: "job_006",
    agentId: "agent_research_2",
    agentName: "research-eu",
    status: "completed",
    durationMs: 330000,
    createdAt: isoHoursAgo(6),
    startedAt: isoHoursAgo(6),
    completedAt: isoHoursAgo(6),
    logs: [
      { id: "log_12", timestamp: isoHoursAgo(6), level: "info", message: "Scanning self-hosted control plane landscape..." }
    ],
    steps: [
      { id: "step_12", title: "Collect market examples", state: "completed", detail: "Collected hosting and architecture references." }
    ],
    output: {
      title: "Self-hosted Agent Platforms",
      summary: "The strongest comparison points emphasize private infrastructure, controlled runtimes, and artifact ownership.",
      highlights: ["Hetzner and self-hosting are recurring buying signals."],
      markdown: "# Self-hosted Agent Platforms\n\nPrivate deployment is a differentiator.",
      links: [{ label: "platform-landscape.md", href: "#" }]
    },
    artifactIds: ["artifact_009"]
  }
];

const artifacts: Artifact[] = [
  { id: "artifact_001", runId: "run_789", agentId: "agent_research_1", name: "competitive-brief.md", type: "markdown", size: 84213, storageKey: "runs/run_789/competitive-brief.md", downloadUrl: "#", createdAt: isoMinutesAgo(1) },
  { id: "artifact_002", runId: "run_789", agentId: "agent_research_1", name: "sources.json", type: "dataset", size: 138442, storageKey: "runs/run_789/sources.json", downloadUrl: "#", createdAt: isoMinutesAgo(1) },
  { id: "artifact_003", runId: "run_789", agentId: "agent_research_1", name: "market-map.pdf", type: "report", size: 1321440, storageKey: "runs/run_789/market-map.pdf", downloadUrl: "#", createdAt: isoMinutesAgo(1) },
  { id: "artifact_004", runId: "run_788", agentId: "agent_builder_1", name: "sidekicks-landing.zip", type: "build", size: 44721408, storageKey: "runs/run_788/sidekicks-landing.zip", downloadUrl: "#", createdAt: isoMinutesAgo(8) },
  { id: "artifact_005", runId: "run_788", agentId: "agent_builder_1", name: "build-log.txt", type: "log", size: 18422, storageKey: "runs/run_788/build-log.txt", downloadUrl: "#", createdAt: isoMinutesAgo(8) },
  { id: "artifact_006", runId: "run_787", agentId: "agent_ops_1", name: "failure-log.txt", type: "log", size: 9241, storageKey: "runs/run_787/failure-log.txt", downloadUrl: "#", createdAt: isoMinutesAgo(50) },
  { id: "artifact_007", runId: "run_785", agentId: "agent_data_1", name: "retention-chart.png", type: "report", size: 481240, storageKey: "runs/run_785/retention-chart.png", downloadUrl: "#", createdAt: isoHoursAgo(2) },
  { id: "artifact_008", runId: "run_785", agentId: "agent_data_1", name: "cohort-summary.md", type: "markdown", size: 24110, storageKey: "runs/run_785/cohort-summary.md", downloadUrl: "#", createdAt: isoHoursAgo(2) },
  { id: "artifact_009", runId: "run_784", agentId: "agent_research_2", name: "platform-landscape.md", type: "markdown", size: 16342, storageKey: "runs/run_784/platform-landscape.md", downloadUrl: "#", createdAt: isoHoursAgo(6) },
  { id: "artifact_010", runId: "run_784", agentId: "agent_research_2", name: "vendor-notes.pdf", type: "report", size: 982142, storageKey: "runs/run_784/vendor-notes.pdf", downloadUrl: "#", createdAt: isoHoursAgo(6) }
];

const settings: SettingsData = {
  workspaceName: "Sidekicks Production",
  environment: "Production",
  defaultModel: "GPT-4o",
  fallbackModel: "Claude 3.5 Sonnet",
  routingStrategy: "Latency-aware",
  storage: "MinIO (S3 compatible)",
  memoryStore: "redis",
  region: "us-west-2",
  autoDeploy: true,
  warmContainers: true,
  auditLogging: true,
  artifactRetentionDays: 14,
  maxConcurrency: 6,
  llmProfiles: [
    {
      id: "profile_openai_prod",
      name: "OpenAI Production",
      provider: "OpenAI",
      model: "GPT-4o",
      authType: "API key",
      status: "active",
      scopes: ["Deployments", "Runs", "Templates"],
      lastUsed: "2 min ago",
      apiKeyPreview: "sk-proj-...91A2"
    },
    {
      id: "profile_anthropic_ops",
      name: "Anthropic Ops",
      provider: "Anthropic",
      model: "Claude 3.5 Sonnet",
      authType: "API key",
      status: "active",
      scopes: ["Runs", "Fallback routing"],
      lastUsed: "14 min ago",
      apiKeyPreview: "sk-ant-...D7KF"
    },
    {
      id: "profile_azure_eval",
      name: "Azure OpenAI Eval",
      provider: "Azure OpenAI",
      model: "GPT-4o mini",
      authType: "Managed identity",
      status: "limited",
      scopes: ["Staging", "Evaluations"],
      lastUsed: "3 hr ago",
      apiKeyPreview: "managed identity"
    }
  ]
};

export function createSeedState(): ControlPlaneState {
  return {
    templates,
    agents,
    jobs,
    runs,
    artifacts,
    runtimes: [
      defineWorkerRuntime({
        id: "runtime_node_default",
        name: "Node Worker Pool",
        runtimeType: "node",
        image: "ghcr.io/sidekicks/node-worker:prototype",
        supportedTools: ["web", "browser", "files", "code", "filesystem", "api", "webhooks"],
        status: "online"
      }),
      defineWorkerRuntime({
        id: "runtime_python_default",
        name: "Python Worker Pool",
        runtimeType: "python",
        image: "ghcr.io/sidekicks/python-worker:prototype",
        supportedTools: ["files", "python", "charts"],
        status: "degraded"
      })
    ],
    settings
  };
}

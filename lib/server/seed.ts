import {
  type AgentInstance,
  type AgentDeployment,
  type AgentTemplate,
  type Artifact,
  type ChatMessage,
  type ControlPlaneState,
  type Job,
  type Run,
  type SettingsData
} from "@/lib/domain/types";
import { getDefaultNodeRuntimeEndpoint } from "@/lib/server/config";
import { defineWorkerRuntime } from "@/lib/server/queue";

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60_000).toISOString();
}

const templates: AgentTemplate[] = [
  {
    id: "tpl_openclaw_upstream",
    slug: "openclaw-upstream",
    name: "OpenClaw Upstream",
    description: "Deploy and manage a real upstream OpenClaw gateway through Sidekicks.",
    icon: "FileSearch",
    kind: "runtime",
    category: "Agents",
    tags: ["OpenClaw", "Gateway", "External Runtime"],
    packageName: "openclaw/openclaw",
    packageVersion: "latest",
    sourceRepo: "github.com/openclaw/openclaw",
    runtimeImage: "ghcr.io/openclaw/openclaw:latest",
    runtimeAdapter: "openclaw-upstream",
    isolationMode: "container",
    supportedTools: ["web", "browser", "files"],
    defaultModel: "GPT-4o",
    defaultMemory: "redis",
    runtimeType: "node",
    deploymentConfig: {
      recommendedConcurrency: 1,
      artifactStrategy: "gateway-managed",
      workerQueue: "external:openclaw",
      startupCommand: "docker run ghcr.io/openclaw/openclaw:latest"
    },
    featured: true,
    exampleUseCases: ["Deploy real OpenClaw", "Chat with a real gateway", "Run one managed agent runtime"],
    configSchema: {
      env: [
        { key: "OPENAI_API_KEY", required: false, description: "Provider key forwarded into the upstream runtime." },
        { key: "OPENCLAW_GATEWAY_TOKEN", required: false, description: "Optional explicit gateway token for adapter use." }
      ]
    }
  },
  {
    id: "tpl_nanobot",
    slug: "nanobot",
    name: "nanobot",
    description: "Ultra-lightweight personal AI assistant with multi-provider support and chat channels.",
    icon: "Sparkles",
    kind: "runtime",
    category: "Agents",
    tags: ["Nanobot", "Lightweight", "Personal Assistant"],
    packageName: "nanobot-ai",
    packageVersion: "v0.1.4.post5",
    sourceRepo: "github.com/HKUDS/nanobot",
    runtimeImage: "nanobot:latest",
    runtimeAdapter: "sidekicks-native",
    isolationMode: "container",
    supportedTools: ["web", "browser", "files"],
    defaultModel: "GPT-4o",
    defaultMemory: "redis",
    runtimeType: "python",
    deploymentConfig: {
      recommendedConcurrency: 1,
      artifactStrategy: "gateway-managed",
      workerQueue: "sidekicks-runs",
      startupCommand: "docker build -t nanobot ."
    },
    featured: false,
    exampleUseCases: ["Personal assistant", "Multi-channel chat bot", "Scheduled routines"],
    configSchema: {
      env: []
    }
  },
  {
    id: "tpl_nanoclaw",
    slug: "nanoclaw",
    name: "NanoClaw",
    description: "Lightweight Claude Agent SDK assistant with container-isolated runs and multi-channel messaging.",
    icon: "Shield",
    kind: "runtime",
    category: "Agents",
    tags: ["NanoClaw", "Claude", "Container Isolation"],
    packageName: "qwibitai/nanoclaw",
    packageVersion: "latest",
    sourceRepo: "github.com/qwibitai/nanoclaw",
    runtimeImage: "nanoclaw:latest",
    runtimeAdapter: "sidekicks-native",
    isolationMode: "container",
    supportedTools: ["web", "browser", "files"],
    defaultModel: "Claude 3.5 Sonnet",
    defaultMemory: "redis",
    runtimeType: "node",
    deploymentConfig: {
      recommendedConcurrency: 1,
      artifactStrategy: "gateway-managed",
      workerQueue: "sidekicks-runs",
      startupCommand: "claude"
    },
    featured: false,
    exampleUseCases: ["WhatsApp assistant", "Scheduled tasks", "Agent swarms"],
    configSchema: {
      env: [
        { key: "ANTHROPIC_AUTH_TOKEN", required: false, description: "Anthropic API token for Claude Code." },
        { key: "ANTHROPIC_BASE_URL", required: false, description: "Optional Anthropic-compatible base URL." }
      ]
    }
  }
];

const agents: AgentInstance[] = [];
const jobs: Job[] = [];
const runs: Run[] = [];
const artifacts: Artifact[] = [];
const messages: ChatMessage[] = [];

const deployments: AgentDeployment[] = [];

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
  llmProfiles: []
};

export function createSeedState(): ControlPlaneState {
  return {
    templates,
    agents,
    deployments,
    deploymentLogs: [],
    jobs,
    runs,
    artifacts,
    messages,
    runtimes: [
      defineWorkerRuntime({
        id: "runtime_openclaw_upstream",
        name: "OpenClaw Upstream Runtime",
        runtimeType: "node",
        image: "ghcr.io/openclaw/openclaw:latest",
        supportedTools: ["web", "browser", "files"],
        status: "online"
      })
    ],
    settings
  };
}

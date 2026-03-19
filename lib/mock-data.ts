export type RunStatus = "running" | "success" | "failed" | "queued";
export type AgentStatus = "running" | "idle" | "degraded";

export type Template = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  model: string;
  tools: string[];
  category: string;
};

export type Run = {
  id: string;
  agent: string;
  template: string;
  status: RunStatus;
  startedAt: string;
  duration: string;
};

export type Agent = {
  id: string;
  name: string;
  template: string;
  status: AgentStatus;
  jobs: number;
  region: string;
};

export type Artifact = {
  id: string;
  name: string;
  size: string;
  updatedAt: string;
  kind: string;
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
};

export type SettingsData = {
  workspaceName: string;
  environment: string;
  defaultModel: string;
  fallbackModel: string;
  routingStrategy: string;
  storage: string;
  memoryStore: string;
  region: string;
  autoDeploy: boolean;
  warmContainers: boolean;
  auditLogging: boolean;
  artifactRetentionDays: number;
  maxConcurrency: number;
  llmProfiles: LlmProfile[];
};

export type RunDetail = {
  id: string;
  agent: string;
  template: string;
  status: RunStatus;
  startedAt: string;
  duration: string;
  model: string;
  tools: string[];
  logs: string[];
  steps: { id: string; title: string; state: "done" | "active" | "pending"; detail: string }[];
  output: {
    title: string;
    summary: string;
    highlights: string[];
    links: { label: string; href: string }[];
  };
};

const templates: Template[] = [
  {
    id: "research-agent",
    name: "Research Agent",
    description: "Searches, summarizes, and produces reports with verifiable sources.",
    tags: ["Web", "LLM", "Files"],
    model: "GPT-4o",
    tools: ["Web", "Files"],
    category: "Knowledge"
  },
  {
    id: "code-builder",
    name: "Code Builder",
    description: "Plans tasks, writes code, runs checks, and ships patches with logs.",
    tags: ["Git", "Shell", "LLM"],
    model: "GPT-4.1",
    tools: ["Shell", "Git", "Files"],
    category: "Engineering"
  },
  {
    id: "seo-writer",
    name: "SEO Writer",
    description: "Turns product context and SERP inputs into publishable landing page drafts.",
    tags: ["Web", "CMS", "LLM"],
    model: "GPT-4o mini",
    tools: ["Web", "Files"],
    category: "Marketing"
  },
  {
    id: "deploy-agent",
    name: "Deploy Agent",
    description: "Bundles artifacts, promotes releases, and monitors rollout health.",
    tags: ["CI", "Cloud", "Logs"],
    model: "GPT-4.1",
    tools: ["Shell", "Files", "Cloud"],
    category: "Platform"
  },
  {
    id: "support-triage",
    name: "Support Triage",
    description: "Classifies incoming issues, drafts replies, and escalates broken flows.",
    tags: ["Tickets", "Policies", "LLM"],
    model: "GPT-4o",
    tools: ["Files", "Web"],
    category: "Operations"
  }
];

const runs: Run[] = [
  {
    id: "run_789",
    agent: "research-1",
    template: "Research Agent",
    status: "running",
    startedAt: "2 min ago",
    duration: "04:12"
  },
  {
    id: "run_788",
    agent: "code-1",
    template: "Code Builder",
    status: "success",
    startedAt: "17 min ago",
    duration: "11:48"
  },
  {
    id: "run_787",
    agent: "deploy-3",
    template: "Deploy Agent",
    status: "failed",
    startedAt: "48 min ago",
    duration: "02:57"
  },
  {
    id: "run_786",
    agent: "seo-west",
    template: "SEO Writer",
    status: "queued",
    startedAt: "1 hr ago",
    duration: "00:30"
  }
];

const agents: Agent[] = [
  {
    id: "agent_1",
    name: "research-1",
    template: "Research Agent",
    status: "running",
    jobs: 3,
    region: "us-west-2"
  },
  {
    id: "agent_2",
    name: "code-1",
    template: "Code Builder",
    status: "idle",
    jobs: 1,
    region: "us-east-1"
  },
  {
    id: "agent_3",
    name: "deploy-3",
    template: "Deploy Agent",
    status: "degraded",
    jobs: 2,
    region: "eu-central-1"
  }
];

const artifacts: Artifact[] = [
  {
    id: "artifact_1",
    name: "market-report.pdf",
    size: "1.3 MB",
    updatedAt: "5 min ago",
    kind: "Report"
  },
  {
    id: "artifact_2",
    name: "release-candidate.zip",
    size: "42.7 MB",
    updatedAt: "31 min ago",
    kind: "Build"
  },
  {
    id: "artifact_3",
    name: "crawl-results.json",
    size: "480 KB",
    updatedAt: "1 hr ago",
    kind: "Dataset"
  }
];

const runDetails: Record<string, RunDetail> = {
  run_789: {
    id: "run_789",
    agent: "research-1",
    template: "Research Agent",
    status: "running",
    startedAt: "2 min ago",
    duration: "04:12",
    model: "GPT-4o",
    tools: ["Web", "Files", "Browser"],
    logs: [
      "> Searching web for competitor release notes...",
      "> Fetching pricing pages and feature tables...",
      "> Extracting deltas from source documents...",
      "> Summarizing findings into markdown report..."
    ],
    steps: [
      {
        id: "step_1",
        title: "Collect sources",
        state: "done",
        detail: "12 sources indexed across product docs and changelogs."
      },
      {
        id: "step_2",
        title: "Normalize findings",
        state: "active",
        detail: "Reconciling pricing and feature claims before final output."
      },
      {
        id: "step_3",
        title: "Write report",
        state: "pending",
        detail: "Markdown summary and artifact bundle will be attached."
      }
    ],
    output: {
      title: "Q1 Competitive Brief",
      summary: "Emerging competitors are bundling retrieval, deployment, and observability into one developer workflow. Platform teams care most about traceability and time-to-deploy.",
      highlights: [
        "Fastest-moving products reduce deployment to a one-click action from a template catalog.",
        "Run-level logs and artifact links are the most retained observability views.",
        "Storage choices matter less than confidence that outputs can be replayed and audited."
      ],
      links: [
        { label: "brief.md", href: "#" },
        { label: "sources.json", href: "#" },
        { label: "report.pdf", href: "#" }
      ]
    }
  }
};

function wait<T>(value: T, delay = 180): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delay);
  });
}

export async function getDashboardData() {
  return wait({
    stats: {
      activeAgents: 12,
      jobsRunning: 4,
      successRate: "98.4%"
    },
    runs,
    templates: templates.slice(0, 3)
  });
}

export async function getTemplates() {
  return wait(templates);
}

export async function getAgents() {
  return wait(agents);
}

export async function getRuns() {
  return wait(runs);
}

export async function getRunDetail(runId: string) {
  return wait(runDetails[runId] ?? runDetails.run_789);
}

export async function getArtifacts() {
  return wait(artifacts);
}

export async function getSettings() {
  return wait<SettingsData>({
    workspaceName: "Sidekicks Production",
    environment: "Production",
    defaultModel: "GPT-4o",
    fallbackModel: "Claude 3.5 Sonnet",
    routingStrategy: "Latency-aware",
    storage: "Redis",
    memoryStore: "Redis",
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
  });
}

export async function deployAgent(input: {
  name: string;
  model: string;
  tools: string[];
  memory: string;
  envVars: { key: string; value: string }[];
}) {
  return wait(
    {
      ok: true,
      deploymentId: `deploy_${Math.floor(Math.random() * 900 + 100)}`,
      ...input
    },
    500
  );
}

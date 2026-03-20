import {
  type AgentDeployment,
  type AgentInstance,
  type AgentTemplate,
  type LlmProfile,
  type RenderedRuntimeLaunch,
  type SettingsData
} from "@/lib/domain/types";

function toPairMap(envVars: AgentInstance["envVars"]) {
  return new Map(envVars.map((pair) => [pair.key, pair.value]));
}

function jsonString(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function buildOpenClawConfig({
  agent,
  template,
  settings,
  profile,
  bindMode,
  allowUnconfigured
}: {
  agent: AgentInstance;
  template: AgentTemplate;
  settings: SettingsData;
  profile: LlmProfile | null;
  bindMode: "loopback" | "lan";
  allowUnconfigured: boolean;
}) {
  const envMap = toPairMap(agent.envVars);
  const providerName = (profile?.provider || "OpenAI").toLowerCase();
  const provider = providerName.includes("anthropic") ? "anthropic" : "openai";
  const apiKeyEnvVar = profile?.keyEnvVar || (provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY");
  const baseUrlEnvVar = profile?.baseUrlEnvVar || (provider === "openai" ? "OPENAI_BASE_URL" : undefined);

  return {
    gateway: {
      mode: allowUnconfigured ? "local" : "gateway",
      bind: bindMode,
      port: 18789,
      controlUi: {
        dangerouslyAllowHostHeaderOriginFallback: bindMode === "lan"
      }
    },
    agent: {
      name: agent.name,
      template: template.slug,
      model: profile?.model || agent.model,
      provider,
      apiKeyEnvVar,
      baseUrlEnvVar
    },
    workspace: {
      region: settings.region,
      memory: agent.memory,
      tools: agent.tools
    },
    defaults: {
      reportMode: envMap.get("REPORT_MODE") || "structured",
      cacheTtl: envMap.get("CACHE_TTL") || "900"
    }
  };
}

function buildOpenClawLaunch({
  agent,
  template,
  settings,
  profile
}: {
  agent: AgentInstance;
  template: AgentTemplate;
  settings: SettingsData;
  profile: LlmProfile | null;
}): RenderedRuntimeLaunch {
  const config = buildOpenClawConfig({
    agent,
    template,
    settings,
    profile,
    bindMode: "lan",
    allowUnconfigured: true
  });
  const env = [
    { key: "HOME", value: "/tmp/openclaw-home" },
    { key: "XDG_CONFIG_HOME", value: "/tmp/openclaw-home/.config" },
    { key: "OPENCLAW_HOME", value: "/tmp/openclaw-home" },
    { key: "OPENCLAW_CONFIG_PATH", value: "/tmp/openclaw-home/config/sidekicks-openclaw.json" }
  ];

  if (profile) {
    env.push({ key: profile.keyEnvVar, value: profile.apiKeySecret });

    if (profile.baseUrl && profile.baseUrlEnvVar) {
      env.push({ key: profile.baseUrlEnvVar, value: profile.baseUrl });
    }
  }

  return {
    env,
    files: [
      {
        path: "/tmp/openclaw-home/config/sidekicks-openclaw.json",
        content: jsonString(config)
      }
    ],
    command: [
      "node",
      "dist/index.js",
      "gateway",
      "--bind",
      "lan",
      "--port",
      "18789",
      "--allow-unconfigured"
    ],
    metadata: {
      configPath: "/tmp/openclaw-home/config/sidekicks-openclaw.json",
      configFormat: "json",
      adapter: "openclaw-upstream"
    }
  };
}

export function renderRuntimeLaunch({
  agent,
  template,
  settings,
  profile,
  deployment
}: {
  agent: AgentInstance;
  template: AgentTemplate;
  settings: SettingsData;
  profile: LlmProfile | null;
  deployment: Pick<AgentDeployment, "runtimeAdapter">;
}): RenderedRuntimeLaunch | null {
  if (deployment.runtimeAdapter === "openclaw-upstream") {
    return buildOpenClawLaunch({ agent, template, settings, profile });
  }

  return null;
}

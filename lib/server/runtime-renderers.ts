import {
  type AgentDeployment,
  type AgentInstance,
  type AgentTemplate,
  type LlmProfile,
  type RenderedRuntimeLaunch,
  type SettingsData
} from "@/lib/domain/types";

function jsonString(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function buildOpenClawConfig({
  agent,
  profile,
  bindMode,
  allowUnconfigured,
  allowedOrigins
}: {
  agent: AgentInstance;
  profile: LlmProfile | null;
  bindMode: "loopback" | "lan";
  allowUnconfigured: boolean;
  allowedOrigins: string[];
}) {
  const modelRef = profile?.model || agent.model;

  return {
    gateway: {
      mode: allowUnconfigured ? "local" : "gateway",
      bind: bindMode,
      port: 18789,
      controlUi: {
        allowInsecureAuth: true,
        dangerouslyAllowHostHeaderOriginFallback: bindMode === "lan",
        allowedOrigins
      }
    },
    agents: {
      defaults: {
        workspace: "/tmp/openclaw-home/workspace",
        model: {
          primary: modelRef,
          fallbacks: []
        },
        models: {
          [modelRef]: {
            alias: agent.name
          }
        }
      }
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
    profile,
    bindMode: "lan",
    allowUnconfigured: true,
    allowedOrigins: [
      "http://sidekicks-web-1:3000",
      "http://sidekicks-worker-1",
      "http://sidekicks-deployer-1",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ]
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

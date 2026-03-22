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

function normalizeProviderModelRef(rawModelRef: string, fallbackProvider: string) {
  const trimmed = rawModelRef.trim();
  const normalizeProvider = (value: string) => value.trim().toLowerCase();
  const normalizeModel = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-");

  if (trimmed.includes("/")) {
    const [provider, ...modelParts] = trimmed.split("/");
    return `${normalizeProvider(provider)}/${normalizeModel(modelParts.join("/"))}`;
  }

  return `${normalizeProvider(fallbackProvider)}/${normalizeModel(trimmed)}`;
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
  const rawModelRef = profile?.model || agent.model;
  const providerPrefix =
    profile?.provider === "Anthropic"
      ? "anthropic"
      : profile?.provider === "OpenAI"
        ? "openai"
        : profile?.provider === "Azure OpenAI"
          ? "openai"
          : profile?.provider === "Groq"
            ? "groq"
            : "openai";
  const modelRef = normalizeProviderModelRef(rawModelRef, providerPrefix);

  return {
    gateway: {
      mode: allowUnconfigured ? "local" : "gateway",
      bind: bindMode,
      port: 18789,
      controlUi: {
        allowInsecureAuth: true,
        dangerouslyDisableDeviceAuth: true,
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
      "http://web:3000",
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

function buildNemoClawChatUiUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!rawUrl) {
    return "http://127.0.0.1:18789";
  }

  try {
    const parsed = new URL(rawUrl);
    return `http://${parsed.hostname}:18789`;
  } catch {
    return "http://127.0.0.1:18789";
  }
}

function buildNemoClawLaunch({
  agent,
  template,
  settings,
  deployment
}: {
  agent: AgentInstance;
  template: AgentTemplate;
  settings: SettingsData;
  deployment: Pick<AgentDeployment, "id" | "runtimeAdapter">;
}): RenderedRuntimeLaunch {
  const chatUiUrl = buildNemoClawChatUiUrl();
  const env = [
    ...agent.envVars.filter((entry) => entry?.key),
    ...(agent.envVars.some((entry) => entry.key === "CHAT_UI_URL") ? [] : [{ key: "CHAT_UI_URL", value: chatUiUrl }])
  ];

  return {
    env,
    files: [],
    command: ["-lc", "/usr/local/bin/nemoclaw-start"],
    metadata: {
      configPath: "/sandbox/.openclaw/openclaw.json",
      configFormat: "json",
      adapter: "nemoclaw",
      build: {
        remote: "https://github.com/NVIDIA/NemoClaw.git#main",
        dockerfile: "Dockerfile",
        buildArgs: {
          NEMOCLAW_MODEL: agent.model,
          CHAT_UI_URL: chatUiUrl,
          NEMOCLAW_BUILD_ID: deployment.id
        }
      }
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
  deployment: Pick<AgentDeployment, "id" | "runtimeAdapter">;
}): RenderedRuntimeLaunch | null {
  if (deployment.runtimeAdapter === "openclaw-upstream") {
    return buildOpenClawLaunch({ agent, template, settings, profile });
  }

  if (deployment.runtimeAdapter === "nemoclaw") {
    return buildNemoClawLaunch({ agent, template, settings, deployment });
  }

  return null;
}

import { type PoolClient } from "pg";

import {
  type AgentInstance,
  type AgentDeployment,
  type AgentTemplate,
  type Artifact,
  type ChatMessage,
  type ControlPlaneState,
  type DeployRequest,
  type Job,
  type LlmProfile,
  type LlmProfileInput,
  type Run,
  type RunOutput,
  type RunStep,
  type SettingsData,
  type WorkerRuntime
} from "@/lib/domain/types";
import { getDefaultNodeRuntimeEndpoint } from "@/lib/server/config";
import { createId } from "@/lib/server/ids";
import { type DeploymentRequest, type RunExecutionRequest } from "@/lib/server/queue";
import { createSeedState } from "@/lib/server/seed";
import { getPool } from "@/lib/server/db";

type DatabaseRow = Record<string, unknown>;
type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

type GlobalState = typeof globalThis & {
  __sidekicksDatabaseInitPromise?: Promise<void>;
};

function getGlobalState() {
  return globalThis as GlobalState;
}

function toJson(value: JsonValue) {
  return JSON.stringify(value);
}

function toIsoString(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(String(value)).toISOString();
}

function parseJson<T>(value: unknown) {
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }

  return value as T;
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

function mapTemplate(row: DatabaseRow): AgentTemplate {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description),
    icon: String(row.icon),
    kind: row.kind as AgentTemplate["kind"],
    category: String(row.category),
    tags: parseJson<AgentTemplate["tags"]>(row.tags),
    packageName: String(row.package_name),
    packageVersion: String(row.package_version),
    sourceRepo: String(row.source_repo),
    runtimeImage: String(row.runtime_image),
    isolationMode: row.isolation_mode as AgentTemplate["isolationMode"],
    supportedTools: parseJson<AgentTemplate["supportedTools"]>(row.supported_tools),
    defaultModel: String(row.default_model),
    defaultMemory: row.default_memory as AgentTemplate["defaultMemory"],
    runtimeType: row.runtime_type as AgentTemplate["runtimeType"],
    deploymentConfig: parseJson<AgentTemplate["deploymentConfig"]>(row.deployment_config),
    featured: Boolean(row.featured),
    exampleUseCases: parseJson<AgentTemplate["exampleUseCases"]>(row.example_use_cases),
    configSchema: parseJson<AgentTemplate["configSchema"]>(row.config_schema)
  };
}

function mapAgent(row: DatabaseRow): AgentInstance {
  return {
    id: String(row.id),
    name: String(row.name),
    templateId: String(row.template_id),
    templateName: String(row.template_name),
    status: row.status as AgentInstance["status"],
    model: String(row.model),
    tools: parseJson<AgentInstance["tools"]>(row.tools),
    memory: row.memory as AgentInstance["memory"],
    runtimeType: row.runtime_type as AgentInstance["runtimeType"],
    envVars: parseJson<AgentInstance["envVars"]>(row.env_vars),
    jobsCount: Number(row.jobs_count),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
    lastRunAt: toIsoString(row.last_run_at),
    region: String(row.region)
  };
}

function mapJob(row: DatabaseRow): Job {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    agentName: String(row.agent_name),
    title: String(row.title),
    input: parseJson<Job["input"]>(row.input),
    status: row.status as Job["status"],
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    startedAt: toIsoString(row.started_at),
    completedAt: toIsoString(row.completed_at)
  };
}

function mapRun(row: DatabaseRow): Run {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    agentId: String(row.agent_id),
    agentName: String(row.agent_name),
    status: row.status as Run["status"],
    durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    startedAt: toIsoString(row.started_at),
    completedAt: toIsoString(row.completed_at),
    logs: parseJson<Run["logs"]>(row.logs),
    steps: parseJson<Run["steps"]>(row.steps),
    output: row.output ? parseJson<Run["output"]>(row.output) : null,
    artifactIds: parseJson<Run["artifactIds"]>(row.artifact_ids)
  };
}

function mapArtifact(row: DatabaseRow): Artifact {
  return {
    id: String(row.id),
    runId: String(row.run_id),
    agentId: String(row.agent_id),
    name: String(row.name),
    type: row.type as Artifact["type"],
    size: Number(row.size),
    storageKey: String(row.storage_key),
    downloadUrl: String(row.download_url),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString()
  };
}

function mapDeployment(row: DatabaseRow): AgentDeployment {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    templateId: String(row.template_id),
    image: String(row.image),
    containerId: row.container_id ? String(row.container_id) : null,
    endpoint: row.endpoint ? String(row.endpoint) : null,
    runtimeSource: row.runtime_source as AgentDeployment["runtimeSource"],
    status: row.status as AgentDeployment["status"],
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
    lastHealthAt: toIsoString(row.last_health_at)
  };
}

function mapChatMessage(row: DatabaseRow): ChatMessage {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    deploymentId: row.deployment_id ? String(row.deployment_id) : null,
    role: row.role as ChatMessage["role"],
    content: String(row.content),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString()
  };
}

function mapRuntime(row: DatabaseRow): WorkerRuntime {
  return {
    id: String(row.id),
    name: String(row.name),
    runtimeType: row.runtime_type as WorkerRuntime["runtimeType"],
    image: String(row.image),
    supportedTools: parseJson<WorkerRuntime["supportedTools"]>(row.supported_tools),
    status: row.status as WorkerRuntime["status"]
  };
}

function buildInitialSteps(): RunStep[] {
  return [
    { id: createId("step"), title: "Queue run", state: "completed", detail: "Run accepted by control plane." },
    { id: createId("step"), title: "Start worker", state: "pending", detail: "Waiting for available worker runtime." },
    { id: createId("step"), title: "Execute task", state: "pending", detail: "Task execution has not started yet." },
    { id: createId("step"), title: "Persist outputs", state: "pending", detail: "Artifacts and metadata will be stored after execution." }
  ];
}

function buildDefaultDeployment(agent: AgentInstance, template: AgentTemplate, now: string): AgentDeployment {
  const isDedicatedRuntime = template.id === "tpl_openclaw" || template.id === "tpl_nanoclaw";

  return {
    id: createId("dep"),
    agentId: agent.id,
    templateId: template.id,
    image: template.runtimeImage,
    containerId: null,
    endpoint: isDedicatedRuntime ? null : template.runtimeType === "node" ? getDefaultNodeRuntimeEndpoint() : null,
    runtimeSource: isDedicatedRuntime ? "container" : template.runtimeType === "node" ? "local-service" : "container",
    status: isDedicatedRuntime ? "provisioning" : template.runtimeType === "node" ? "healthy" : "provisioning",
    createdAt: now,
    updatedAt: now,
    lastHealthAt: isDedicatedRuntime ? null : template.runtimeType === "node" ? now : null
  };
}

async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function insertSeedData(client: PoolClient, state: ControlPlaneState) {
  for (const template of state.templates) {
    await client.query(
      `
        INSERT INTO templates (
          id, slug, name, description, icon, kind, category, tags, package_name, package_version,
          source_repo, runtime_image, isolation_mode, supported_tools, default_model, default_memory,
          runtime_type, deployment_config, featured, example_use_cases, config_schema
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10,
          $11, $12, $13, $14::jsonb, $15, $16,
          $17, $18::jsonb, $19, $20::jsonb, $21::jsonb
        )
      `,
      [
        template.id,
        template.slug,
        template.name,
        template.description,
        template.icon,
        template.kind,
        template.category,
        toJson(template.tags),
        template.packageName,
        template.packageVersion,
        template.sourceRepo,
        template.runtimeImage,
        template.isolationMode,
        toJson(template.supportedTools),
        template.defaultModel,
        template.defaultMemory,
        template.runtimeType,
        toJson(template.deploymentConfig),
        template.featured,
        toJson(template.exampleUseCases),
        toJson(template.configSchema)
      ]
    );
  }

  for (const runtime of state.runtimes) {
    await client.query(
      `
        INSERT INTO runtimes (id, name, runtime_type, image, supported_tools, status)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)
      `,
      [runtime.id, runtime.name, runtime.runtimeType, runtime.image, toJson(runtime.supportedTools), runtime.status]
    );
  }

  for (const agent of state.agents) {
    await client.query(
      `
        INSERT INTO agents (
          id, name, template_id, template_name, status, model, tools, memory, runtime_type,
          env_vars, jobs_count, created_at, updated_at, last_run_at, region
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9,
          $10::jsonb, $11, $12::timestamptz, $13::timestamptz, $14::timestamptz, $15
        )
      `,
      [
        agent.id,
        agent.name,
        agent.templateId,
        agent.templateName,
        agent.status,
        agent.model,
        toJson(agent.tools),
        agent.memory,
        agent.runtimeType,
        toJson(agent.envVars),
        agent.jobsCount,
        agent.createdAt,
        agent.updatedAt,
        agent.lastRunAt,
        agent.region
      ]
    );
  }

  for (const deployment of state.deployments) {
    await client.query(
      `
        INSERT INTO deployments (
          id, agent_id, template_id, image, container_id, endpoint, runtime_source, status, created_at, updated_at, last_health_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz, $11::timestamptz
        )
      `,
      [
        deployment.id,
        deployment.agentId,
        deployment.templateId,
        deployment.image,
        deployment.containerId,
        deployment.endpoint,
        deployment.runtimeSource,
        deployment.status,
        deployment.createdAt,
        deployment.updatedAt,
        deployment.lastHealthAt
      ]
    );
  }

  for (const job of state.jobs) {
    await client.query(
      `
        INSERT INTO jobs (id, agent_id, agent_name, title, input, status, created_at, started_at, completed_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::timestamptz, $8::timestamptz, $9::timestamptz)
      `,
      [job.id, job.agentId, job.agentName, job.title, toJson(job.input), job.status, job.createdAt, job.startedAt, job.completedAt]
    );
  }

  for (const run of state.runs) {
    await client.query(
      `
        INSERT INTO runs (
          id, job_id, agent_id, agent_name, status, duration_ms, created_at, started_at,
          completed_at, logs, steps, output, artifact_ids
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz,
          $9::timestamptz, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb
        )
      `,
      [
        run.id,
        run.jobId,
        run.agentId,
        run.agentName,
        run.status,
        run.durationMs,
        run.createdAt,
        run.startedAt,
        run.completedAt,
        toJson(run.logs),
        toJson(run.steps),
        run.output ? toJson(run.output) : null,
        toJson(run.artifactIds)
      ]
    );
  }

  for (const artifact of state.artifacts) {
    await client.query(
      `
        INSERT INTO artifacts (id, run_id, agent_id, name, type, size, storage_key, download_url, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz)
      `,
      [
        artifact.id,
        artifact.runId,
        artifact.agentId,
        artifact.name,
        artifact.type,
        artifact.size,
        artifact.storageKey,
        artifact.downloadUrl,
        artifact.createdAt
      ]
    );
  }

  for (const message of state.messages) {
    await client.query(
      `
        INSERT INTO chat_messages (id, agent_id, deployment_id, role, content, created_at)
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
      `,
      [message.id, message.agentId, message.deploymentId, message.role, message.content, message.createdAt]
    );
  }

  await client.query("INSERT INTO settings (id, data) VALUES ($1, $2::jsonb)", ["default", toJson(state.settings)]);
}

async function backfillDeployments(client: PoolClient) {
  const result = await client.query(
    `
      SELECT agents.*, templates.runtime_image
      FROM agents
      JOIN templates ON templates.id = agents.template_id
      LEFT JOIN deployments ON deployments.agent_id = agents.id
      WHERE deployments.id IS NULL
    `
  );

  for (const row of result.rows) {
    const now = new Date().toISOString();
    const agent = mapAgent(row);
      const template = {
        id: String(row.template_id),
        runtimeImage: String(row.runtime_image),
        runtimeType: row.runtime_type as AgentTemplate["runtimeType"]
    } as AgentTemplate;
    const deployment = buildDefaultDeployment(agent, template, now);

    await client.query(
      `
        INSERT INTO deployments (
          id, agent_id, template_id, image, container_id, endpoint, runtime_source, status, created_at, updated_at, last_health_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz, $11::timestamptz
        )
      `,
      [
        deployment.id,
        deployment.agentId,
        deployment.templateId,
        deployment.image,
        deployment.containerId,
        deployment.endpoint,
        deployment.runtimeSource,
        deployment.status,
        deployment.createdAt,
        deployment.updatedAt,
        deployment.lastHealthAt
      ]
    );
  }
}

export async function ensureDatabaseReady() {
  const globalState = getGlobalState();

  if (!globalState.__sidekicksDatabaseInitPromise) {
    globalState.__sidekicksDatabaseInitPromise = (async () => {
      await getPool().query(`
        CREATE TABLE IF NOT EXISTS templates (
          id text PRIMARY KEY,
          slug text NOT NULL UNIQUE,
          name text NOT NULL,
          description text NOT NULL,
          icon text NOT NULL,
          kind text NOT NULL,
          category text NOT NULL,
          tags jsonb NOT NULL,
          package_name text NOT NULL,
          package_version text NOT NULL,
          source_repo text NOT NULL,
          runtime_image text NOT NULL,
          isolation_mode text NOT NULL,
          supported_tools jsonb NOT NULL,
          default_model text NOT NULL,
          default_memory text NOT NULL,
          runtime_type text NOT NULL,
          deployment_config jsonb NOT NULL,
          featured boolean NOT NULL,
          example_use_cases jsonb NOT NULL,
          config_schema jsonb NOT NULL
        );

        CREATE TABLE IF NOT EXISTS agents (
          id text PRIMARY KEY,
          name text NOT NULL,
          template_id text NOT NULL REFERENCES templates(id),
          template_name text NOT NULL,
          status text NOT NULL,
          model text NOT NULL,
          tools jsonb NOT NULL,
          memory text NOT NULL,
          runtime_type text NOT NULL,
          env_vars jsonb NOT NULL,
          jobs_count integer NOT NULL,
          created_at timestamptz NOT NULL,
          updated_at timestamptz NOT NULL,
          last_run_at timestamptz,
          region text NOT NULL
        );

        CREATE TABLE IF NOT EXISTS jobs (
          id text PRIMARY KEY,
          agent_id text NOT NULL REFERENCES agents(id),
          agent_name text NOT NULL,
          title text NOT NULL,
          input jsonb NOT NULL,
          status text NOT NULL,
          created_at timestamptz NOT NULL,
          started_at timestamptz,
          completed_at timestamptz
        );

        CREATE TABLE IF NOT EXISTS runs (
          id text PRIMARY KEY,
          job_id text NOT NULL REFERENCES jobs(id),
          agent_id text NOT NULL REFERENCES agents(id),
          agent_name text NOT NULL,
          status text NOT NULL,
          duration_ms integer,
          created_at timestamptz NOT NULL,
          started_at timestamptz,
          completed_at timestamptz,
          logs jsonb NOT NULL,
          steps jsonb NOT NULL,
          output jsonb,
          artifact_ids jsonb NOT NULL
        );

        CREATE TABLE IF NOT EXISTS artifacts (
          id text PRIMARY KEY,
          run_id text NOT NULL REFERENCES runs(id),
          agent_id text NOT NULL REFERENCES agents(id),
          name text NOT NULL,
          type text NOT NULL,
          size bigint NOT NULL,
          storage_key text NOT NULL,
          download_url text NOT NULL,
          created_at timestamptz NOT NULL
        );

        CREATE TABLE IF NOT EXISTS runtimes (
          id text PRIMARY KEY,
          name text NOT NULL,
          runtime_type text NOT NULL,
          image text NOT NULL,
          supported_tools jsonb NOT NULL,
          status text NOT NULL
        );

        CREATE TABLE IF NOT EXISTS deployments (
          id text PRIMARY KEY,
          agent_id text NOT NULL REFERENCES agents(id),
          template_id text NOT NULL REFERENCES templates(id),
          image text NOT NULL,
          container_id text,
          endpoint text,
          runtime_source text NOT NULL,
          status text NOT NULL,
          created_at timestamptz NOT NULL,
          updated_at timestamptz NOT NULL,
          last_health_at timestamptz
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
          id text PRIMARY KEY,
          agent_id text NOT NULL REFERENCES agents(id),
          deployment_id text REFERENCES deployments(id),
          role text NOT NULL,
          content text NOT NULL,
          created_at timestamptz NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
          id text PRIMARY KEY,
          data jsonb NOT NULL
        );
      `);

      await getPool().query(`
        ALTER TABLE deployments
        ADD COLUMN IF NOT EXISTS container_id text;
      `);

      const countResult = await getPool().query<{ count: string }>("SELECT COUNT(*)::text AS count FROM templates");

      if (Number(countResult.rows[0]?.count ?? 0) === 0) {
        await withTransaction(async (client) => {
          await insertSeedData(client, createSeedState());
        });
      } else {
        await withTransaction(async (client) => {
          await backfillDeployments(client);
          await client.query(
            `
              UPDATE templates
              SET runtime_image = CASE
                WHEN id = 'tpl_openclaw' THEN 'sidekicks-runtime-openclaw:latest'
                WHEN id = 'tpl_nanoclaw' THEN 'sidekicks-runtime-nanoclaw:latest'
                ELSE runtime_image
              END
              WHERE id IN ('tpl_openclaw', 'tpl_nanoclaw')
            `
          );
          await client.query(
            `
              UPDATE deployments
              SET runtime_source = 'container',
                  status = 'provisioning',
                  image = CASE
                    WHEN template_id = 'tpl_openclaw' THEN 'sidekicks-runtime-openclaw:latest'
                    WHEN template_id = 'tpl_nanoclaw' THEN 'sidekicks-runtime-nanoclaw:latest'
                    ELSE image
                  END,
                  endpoint = NULL,
                  container_id = NULL,
                  updated_at = NOW(),
                  last_health_at = NULL
              WHERE template_id IN ('tpl_openclaw', 'tpl_nanoclaw')
                AND runtime_source = 'local-service'
            `
          );
        });
      }
    })();
  }

  await globalState.__sidekicksDatabaseInitPromise;
}

export async function listPostgresState(): Promise<ControlPlaneState> {
  await ensureDatabaseReady();

  const [templatesResult, agentsResult, deploymentsResult, jobsResult, runsResult, artifactsResult, messagesResult, runtimesResult, settingsResult] = await Promise.all([
    getPool().query("SELECT * FROM templates ORDER BY featured DESC, name ASC"),
    getPool().query("SELECT * FROM agents ORDER BY updated_at DESC"),
    getPool().query("SELECT * FROM deployments ORDER BY updated_at DESC"),
    getPool().query("SELECT * FROM jobs ORDER BY created_at DESC"),
    getPool().query("SELECT * FROM runs ORDER BY created_at DESC"),
    getPool().query("SELECT * FROM artifacts ORDER BY created_at DESC"),
    getPool().query("SELECT * FROM chat_messages ORDER BY created_at ASC"),
    getPool().query("SELECT * FROM runtimes ORDER BY name ASC"),
    getPool().query("SELECT data FROM settings WHERE id = $1", ["default"])
  ]);

  return {
    templates: templatesResult.rows.map(mapTemplate),
    agents: agentsResult.rows.map(mapAgent),
    deployments: deploymentsResult.rows.map(mapDeployment),
    jobs: jobsResult.rows.map(mapJob),
    runs: runsResult.rows.map(mapRun),
    artifacts: artifactsResult.rows.map(mapArtifact),
    messages: messagesResult.rows.map(mapChatMessage),
    runtimes: runtimesResult.rows.map(mapRuntime),
    settings: parseJson<SettingsData>(settingsResult.rows[0]?.data)
  };
}

export async function createPostgresAgentInstance(input: DeployRequest): Promise<{
  agent: AgentInstance;
  deploymentRequest: DeploymentRequest | null;
}> {
  await ensureDatabaseReady();

  return withTransaction(async (client) => {
    const templateResult = await client.query("SELECT * FROM templates WHERE id = $1", [input.templateId]);
    const settingsResult = await client.query("SELECT data FROM settings WHERE id = $1", ["default"]);
    const templateRow = templateResult.rows[0];

    if (!templateRow) {
      throw new Error("Template not found");
    }

    const template = mapTemplate(templateRow);
    const settings = parseJson<SettingsData>(settingsResult.rows[0]?.data);
    const now = new Date().toISOString();
    const selectedProfile = input.llmProfileId
      ? settings.llmProfiles.find((profile) => profile.id === input.llmProfileId) ?? null
      : null;
    const profileEnvVars = selectedProfile
      ? [
          { key: selectedProfile.keyEnvVar, value: selectedProfile.apiKeySecret },
          ...(selectedProfile.baseUrlEnvVar && selectedProfile.baseUrl
            ? [{ key: selectedProfile.baseUrlEnvVar, value: selectedProfile.baseUrl }]
            : [])
        ]
      : [];
    const mergedEnvVars = [...profileEnvVars, ...input.envVars.filter((entry) => !profileEnvVars.some((env) => env.key === entry.key))];
    const agent: AgentInstance = {
      id: createId("agent"),
      name: input.agentName,
      templateId: template.id,
      templateName: template.name,
      status: "idle",
      model: input.model,
      tools: input.tools,
      memory: input.memory,
      runtimeType: input.runtimeType,
      envVars: mergedEnvVars,
      jobsCount: 0,
      createdAt: now,
      updatedAt: now,
      lastRunAt: null,
      region: settings.region
    };
    const deployment = buildDefaultDeployment(agent, template, now);

    await client.query(
      `
        INSERT INTO agents (
          id, name, template_id, template_name, status, model, tools, memory, runtime_type,
          env_vars, jobs_count, created_at, updated_at, last_run_at, region
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9,
          $10::jsonb, $11, $12::timestamptz, $13::timestamptz, $14::timestamptz, $15
        )
      `,
      [
        agent.id,
        agent.name,
        agent.templateId,
        agent.templateName,
        agent.status,
        agent.model,
        toJson(agent.tools),
        agent.memory,
        agent.runtimeType,
        toJson(agent.envVars),
        agent.jobsCount,
        agent.createdAt,
        agent.updatedAt,
        agent.lastRunAt,
        agent.region
      ]
    );
    await client.query(
      `
        INSERT INTO deployments (
          id, agent_id, template_id, image, container_id, endpoint, runtime_source, status, created_at, updated_at, last_health_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz, $11::timestamptz
        )
      `,
      [
        deployment.id,
        deployment.agentId,
        deployment.templateId,
        deployment.image,
        deployment.containerId,
        deployment.endpoint,
        deployment.runtimeSource,
        deployment.status,
        deployment.createdAt,
        deployment.updatedAt,
        deployment.lastHealthAt
      ]
    );

    return {
      agent,
      deploymentRequest:
        deployment.runtimeSource === "container"
          ? {
              deploymentId: deployment.id,
              agentId: deployment.agentId,
              templateId: deployment.templateId,
              image: deployment.image,
              requestedAt: now
            }
          : null
    };
  });
}

export async function createPostgresLlmProfile(input: LlmProfileInput): Promise<SettingsData> {
  await ensureDatabaseReady();

  return withTransaction(async (client) => {
    const settingsResult = await client.query("SELECT data FROM settings WHERE id = $1 FOR UPDATE", ["default"]);
    const settings = parseJson<SettingsData>(settingsResult.rows[0]?.data);
    const providerEnv = envVarForProvider(input.provider);
    const nextProfile: LlmProfile = {
      id: createId("profile"),
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
    const nextSettings: SettingsData = {
      ...settings,
      llmProfiles: [nextProfile, ...settings.llmProfiles]
    };

    await client.query("UPDATE settings SET data = $2::jsonb WHERE id = $1", ["default", toJson(nextSettings)]);

    return nextSettings;
  });
}

export async function createPostgresJobAndRun(
  input: {
    agentId: string;
    agentName?: string;
    title: string;
    input: Job["input"];
  }
): Promise<{ job: Job; run: Run; request: RunExecutionRequest }> {
  await ensureDatabaseReady();

  return withTransaction(async (client) => {
    const agentResult = await client.query("SELECT * FROM agents WHERE id = $1 FOR UPDATE", [input.agentId]);
    const deploymentResult = await client.query(
      "SELECT * FROM deployments WHERE agent_id = $1 ORDER BY updated_at DESC LIMIT 1",
      [input.agentId]
    );
    const agentRow = agentResult.rows[0];

    if (!agentRow) {
      throw new Error("Agent not found");
    }

    const agent = mapAgent(agentRow);
    const deployment = deploymentResult.rows[0] ? mapDeployment(deploymentResult.rows[0]) : null;
    const createdAt = new Date().toISOString();
    const agentName = input.agentName?.trim() || agent.name;
    const job: Job = {
      id: createId("job"),
      agentId: input.agentId,
      agentName,
      title: input.title,
      input: input.input,
      status: "queued",
      createdAt,
      startedAt: null,
      completedAt: null
    };
    const run: Run = {
      id: createId("run"),
      jobId: job.id,
      agentId: input.agentId,
      agentName,
      status: "queued",
      durationMs: null,
      createdAt,
      startedAt: null,
      completedAt: null,
      logs: [
        {
          id: createId("log"),
          timestamp: createdAt,
          level: "info",
          message: "Run queued by control plane."
        }
      ],
      steps: buildInitialSteps(),
      output: null,
      artifactIds: []
    };

    await client.query(
      `
        INSERT INTO jobs (id, agent_id, agent_name, title, input, status, created_at, started_at, completed_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::timestamptz, $8::timestamptz, $9::timestamptz)
      `,
      [job.id, job.agentId, job.agentName, job.title, toJson(job.input), job.status, job.createdAt, job.startedAt, job.completedAt]
    );
    await client.query(
      `
        INSERT INTO runs (
          id, job_id, agent_id, agent_name, status, duration_ms, created_at, started_at,
          completed_at, logs, steps, output, artifact_ids
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz,
          $9::timestamptz, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb
        )
      `,
      [
        run.id,
        run.jobId,
        run.agentId,
        run.agentName,
        run.status,
        run.durationMs,
        run.createdAt,
        run.startedAt,
        run.completedAt,
        toJson(run.logs),
        toJson(run.steps),
        run.output ? toJson(run.output) : null,
        toJson(run.artifactIds)
      ]
    );
    await client.query(
      `
        UPDATE agents
        SET jobs_count = jobs_count + 1, updated_at = $2::timestamptz
        WHERE id = $1
      `,
      [agent.id, createdAt]
    );

    return {
      job,
      run,
      request: {
        runId: run.id,
        jobId: job.id,
        agentId: agent.id,
        agentName: agent.name,
        deploymentId: deployment?.id ?? null,
        runtimeType: agent.runtimeType,
        templateId: agent.templateId,
        requestedAt: createdAt
      }
    };
  });
}

export async function createPostgresChatExchange(agentId: string, content: string) {
  await ensureDatabaseReady();

  return withTransaction(async (client) => {
    const normalizedContent = content.trim();

    if (!normalizedContent) {
      throw new Error("Chat content is required");
    }

    const agentResult = await client.query("SELECT * FROM agents WHERE id = $1", [agentId]);
    const deploymentResult = await client.query(
      "SELECT * FROM deployments WHERE agent_id = $1 ORDER BY updated_at DESC LIMIT 1",
      [agentId]
    );
    const messagesResult = await client.query(
      "SELECT * FROM chat_messages WHERE agent_id = $1 ORDER BY created_at ASC",
      [agentId]
    );

    const agentRow = agentResult.rows[0];

    if (!agentRow) {
      throw new Error("Agent not found");
    }

    const deployment = deploymentResult.rows[0] ? mapDeployment(deploymentResult.rows[0]) : null;
    const agent = mapAgent(agentRow);
    const history = messagesResult.rows.map(mapChatMessage);
    const userMessage: ChatMessage = {
      id: createId("msg"),
      agentId,
      deploymentId: deployment?.id ?? null,
      role: "user",
      content: normalizedContent,
      createdAt: new Date().toISOString()
    };

    await client.query(
      `
        INSERT INTO chat_messages (id, agent_id, deployment_id, role, content, created_at)
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
      `,
      [
        userMessage.id,
        userMessage.agentId,
        userMessage.deploymentId,
        userMessage.role,
        userMessage.content,
        userMessage.createdAt
      ]
    );

    let assistantContent = `No deployment is available for ${agent.name}.`;

    if (deployment?.endpoint && deployment.status !== "failed" && deployment.status !== "stopped") {
      const response = await fetch(`${deployment.endpoint}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          agentId: agent.id,
          agentName: agent.name,
          templateId: agent.templateId,
          message: normalizedContent,
          history: history.map((message) => ({
            role: message.role,
            content: message.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Runtime chat request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as { reply: string };
      assistantContent = payload.reply;
    }

    const assistantMessage: ChatMessage = {
      id: createId("msg"),
      agentId,
      deploymentId: deployment?.id ?? null,
      role: "assistant",
      content: assistantContent,
      createdAt: new Date().toISOString()
    };

    await client.query(
      `
        INSERT INTO chat_messages (id, agent_id, deployment_id, role, content, created_at)
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
      `,
      [
        assistantMessage.id,
        assistantMessage.agentId,
        assistantMessage.deploymentId,
        assistantMessage.role,
        assistantMessage.content,
        assistantMessage.createdAt
      ]
    );

    return {
      userMessage,
      assistantMessage
    };
  });
}

import { type PoolClient } from "pg";

import {
  type AgentInstance,
  type AgentTemplate,
  type Artifact,
  type ControlPlaneState,
  type DeployRequest,
  type Job,
  type Run,
  type RunOutput,
  type RunStep,
  type SettingsData,
  type WorkerRuntime
} from "@/lib/domain/types";
import { createId } from "@/lib/server/ids";
import { type RunExecutionRequest } from "@/lib/server/queue";
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

  await client.query("INSERT INTO settings (id, data) VALUES ($1, $2::jsonb)", ["default", toJson(state.settings)]);
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

        CREATE TABLE IF NOT EXISTS settings (
          id text PRIMARY KEY,
          data jsonb NOT NULL
        );
      `);

      const countResult = await getPool().query<{ count: string }>("SELECT COUNT(*)::text AS count FROM templates");

      if (Number(countResult.rows[0]?.count ?? 0) === 0) {
        await withTransaction(async (client) => {
          await insertSeedData(client, createSeedState());
        });
      }
    })();
  }

  await globalState.__sidekicksDatabaseInitPromise;
}

export async function listPostgresState(): Promise<ControlPlaneState> {
  await ensureDatabaseReady();

  const [templatesResult, agentsResult, jobsResult, runsResult, artifactsResult, runtimesResult, settingsResult] = await Promise.all([
    getPool().query("SELECT * FROM templates ORDER BY featured DESC, name ASC"),
    getPool().query("SELECT * FROM agents ORDER BY updated_at DESC"),
    getPool().query("SELECT * FROM jobs ORDER BY created_at DESC"),
    getPool().query("SELECT * FROM runs ORDER BY created_at DESC"),
    getPool().query("SELECT * FROM artifacts ORDER BY created_at DESC"),
    getPool().query("SELECT * FROM runtimes ORDER BY name ASC"),
    getPool().query("SELECT data FROM settings WHERE id = $1", ["default"])
  ]);

  return {
    templates: templatesResult.rows.map(mapTemplate),
    agents: agentsResult.rows.map(mapAgent),
    jobs: jobsResult.rows.map(mapJob),
    runs: runsResult.rows.map(mapRun),
    artifacts: artifactsResult.rows.map(mapArtifact),
    runtimes: runtimesResult.rows.map(mapRuntime),
    settings: parseJson<SettingsData>(settingsResult.rows[0]?.data)
  };
}

export async function createPostgresAgentInstance(input: DeployRequest) {
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
      envVars: input.envVars,
      jobsCount: 0,
      createdAt: now,
      updatedAt: now,
      lastRunAt: null,
      region: settings.region
    };

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

    return agent;
  });
}

export async function createPostgresJobAndRun(
  input: Omit<Job, "id" | "createdAt" | "startedAt" | "completedAt" | "status">
): Promise<{ job: Job; run: Run; request: RunExecutionRequest }> {
  await ensureDatabaseReady();

  return withTransaction(async (client) => {
    const agentResult = await client.query("SELECT * FROM agents WHERE id = $1 FOR UPDATE", [input.agentId]);
    const agentRow = agentResult.rows[0];

    if (!agentRow) {
      throw new Error("Agent not found");
    }

    const agent = mapAgent(agentRow);
    const createdAt = new Date().toISOString();
    const job: Job = {
      id: createId("job"),
      agentId: input.agentId,
      agentName: input.agentName,
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
      agentName: input.agentName,
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
        runtimeType: agent.runtimeType,
        templateId: agent.templateId,
        requestedAt: createdAt
      }
    };
  });
}

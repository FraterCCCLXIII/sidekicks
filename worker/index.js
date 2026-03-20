const { Worker } = require("bullmq");
const {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} = require("@aws-sdk/client-s3");
const IORedis = require("ioredis");
const { Pool } = require("pg");
const { callOpenClawGateway } = require("./openclaw-gateway-client");

const config = {
  backend: process.env.SIDEKICKS_BACKEND || "memory",
  role: "execution-plane-worker",
  runtime: process.env.WORKER_RUNTIME || "node",
  queue: process.env.WORKER_QUEUE || "sidekicks-runs",
  controlPlaneUrl: process.env.CONTROL_PLANE_URL || "http://web:3000",
  redisUrl: process.env.REDIS_URL || "redis://redis:6379",
  databaseUrl: process.env.DATABASE_URL || "postgres://sidekicks:sidekicks@postgres:5432/sidekicks",
  artifactsEndpoint: process.env.S3_ENDPOINT || "http://minio:9000",
  artifactsBucket: process.env.S3_BUCKET || "sidekicks-artifacts",
  artifactsRegion: process.env.S3_REGION || "us-east-1",
  artifactsAccessKey: process.env.S3_ACCESS_KEY || "sidekicks",
  artifactsSecretKey: process.env.S3_SECRET_KEY || "sidekickspassword"
};

function log(message, extra) {
  const payload = {
    time: new Date().toISOString(),
    service: "worker",
    message,
    ...(extra || {})
  };

  console.log(JSON.stringify(payload));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseJson(value) {
  if (typeof value === "string") {
    return JSON.parse(value);
  }

  return value;
}

function toIsoString(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function slugifyTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function createRunOutput(runId, agentName, title) {
  return {
    title,
    summary: `Run ${runId} completed successfully for ${agentName}. The worker produced logs, structured steps, and a saved output bundle.`,
    highlights: [
      "The worker claimed the queued run from Redis/BullMQ.",
      "Execution moved through startup, task execution, and artifact persistence.",
      "Artifacts were written as metadata records and linked back to the completed run."
    ],
    markdown: `# ${title}\n\nExecution finished successfully for ${agentName}.`,
    links: [
      { label: "output.md", href: "#" },
      { label: "run-log.txt", href: "#" }
    ]
  };
}

function createArtifact(runId, agentId, name, type, size) {
  const artifactId = createId("artifact");

  return {
    id: artifactId,
    runId,
    agentId,
    name,
    type,
    size,
    storageKey: `runs/${runId}/${name}`,
    downloadUrl: "#",
    createdAt: new Date().toISOString()
  };
}

function contentTypeForArtifact(name, type) {
  if (name.endsWith(".md")) {
    return "text/markdown; charset=utf-8";
  }

  if (name.endsWith(".txt") || type === "log") {
    return "text/plain; charset=utf-8";
  }

  if (name.endsWith(".json")) {
    return "application/json";
  }

  if (name.endsWith(".zip")) {
    return "application/zip";
  }

  return "application/octet-stream";
}

function buildTemplateExecution(request, run, job) {
  const handlers = {
    tpl_openclaw: () => {
      const reportName = `${slugifyTitle(job.title || "research-report")}.md`;
      const reportBody = `# ${job.title}\n\nOpenClaw completed a research run for ${request.agentName}.\n\n## Prompt\n${job.input.prompt}\n\n## Summary\n- gathered sources\n- synthesized findings\n- produced a markdown briefing\n`;
      const logBody = run.logs.map((entry) => `[${entry.level}] ${entry.message}`).join("\n");
      const reportArtifact = createArtifact(run.id, request.agentId, reportName, "markdown", Buffer.byteLength(reportBody));
      const logArtifact = createArtifact(run.id, request.agentId, `${run.id}-log.txt`, "log", Buffer.byteLength(logBody));

      return {
        output: {
          title: job.title,
          summary: `OpenClaw completed a source-backed research run for ${request.agentName}.`,
          highlights: [
            "Fetched and synthesized source material",
            "Produced a markdown briefing artifact",
            "Stored execution logs for debugging"
          ],
          markdown: reportBody,
          links: [
            { label: reportArtifact.name, href: `/api/artifacts/${reportArtifact.id}/download` },
            { label: logArtifact.name, href: `/api/artifacts/${logArtifact.id}/download` }
          ]
        },
        artifacts: [
          { artifact: reportArtifact, body: reportBody },
          { artifact: logArtifact, body: logBody }
        ]
      };
    },
    tpl_nanoclaw: () => {
      const resultName = `${slugifyTitle(job.title || "automation-result")}.json`;
      const resultBody = JSON.stringify(
        {
          agent: request.agentName,
          runtime: "NanoClaw",
          status: "completed",
          prompt: job.input.prompt,
          actions: ["validated input", "executed workflow stub", "persisted result bundle"]
        },
        null,
        2
      );
      const logBody = run.logs.map((entry) => `[${entry.level}] ${entry.message}`).join("\n");
      const resultArtifact = createArtifact(run.id, request.agentId, resultName, "dataset", Buffer.byteLength(resultBody));
      const logArtifact = createArtifact(run.id, request.agentId, `${run.id}-log.txt`, "log", Buffer.byteLength(logBody));

      return {
        output: {
          title: job.title,
          summary: `NanoClaw completed an operational workflow for ${request.agentName}.`,
          highlights: [
            "Executed a lightweight action-oriented worker path",
            "Produced a machine-readable result bundle",
            "Stored execution logs for debugging"
          ],
          markdown: `# ${job.title}\n\nNanoClaw completed the requested automation task.`,
          links: [
            { label: resultArtifact.name, href: `/api/artifacts/${resultArtifact.id}/download` },
            { label: logArtifact.name, href: `/api/artifacts/${logArtifact.id}/download` }
          ]
        },
        artifacts: [
          { artifact: resultArtifact, body: resultBody },
          { artifact: logArtifact, body: logBody }
        ]
      };
    },
    tpl_appclaw: () => {
      const manifestBody = `name=${job.title}\nruntime=AppClaw\nagent=${request.agentName}\nprompt=${job.input.prompt}\n`;
      const bundleBody = `PK\x03\x04SIDEKICKS_APP_BUNDLE\n${job.title}\n${job.input.prompt}\n`;
      const buildArtifact = createArtifact(run.id, request.agentId, `${slugifyTitle(job.title || "app-build")}.zip`, "build", Buffer.byteLength(bundleBody));
      const manifestArtifact = createArtifact(
        run.id,
        request.agentId,
        `${slugifyTitle(job.title || "deployment-manifest")}.md`,
        "markdown",
        Buffer.byteLength(manifestBody)
      );

      return {
        output: {
          title: job.title,
          summary: `AppClaw produced a deployable build bundle for ${request.agentName}.`,
          highlights: [
            "Generated a mock application bundle",
            "Produced a deployment manifest",
            "Marked the artifact as deployable from storage"
          ],
          markdown: `# ${job.title}\n\nAppClaw generated a deployable build artifact.`,
          links: [
            { label: buildArtifact.name, href: `/api/artifacts/${buildArtifact.id}/download` },
            { label: manifestArtifact.name, href: `/api/artifacts/${manifestArtifact.id}/download` }
          ]
        },
        artifacts: [
          { artifact: buildArtifact, body: bundleBody },
          { artifact: manifestArtifact, body: manifestBody }
        ]
      };
    }
  };

  const handler = handlers[request.templateId] || handlers.tpl_openclaw;
  return handler();
}

const pool = new Pool({
  connectionString: config.databaseUrl
});

const redis = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null
});

const storage = new S3Client({
  region: config.artifactsRegion,
  endpoint: config.artifactsEndpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.artifactsAccessKey,
    secretAccessKey: config.artifactsSecretKey
  }
});

let bucketReadyPromise;

async function ensureBucket() {
  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      try {
        await storage.send(new HeadBucketCommand({ Bucket: config.artifactsBucket }));
      } catch {
        await storage.send(new CreateBucketCommand({ Bucket: config.artifactsBucket }));
      }
    })();
  }

  await bucketReadyPromise;
}

async function uploadArtifactBodies(items) {
  await ensureBucket();

  for (const item of items) {
    await storage.send(
      new PutObjectCommand({
        Bucket: config.artifactsBucket,
        Key: item.artifact.storageKey,
        Body: item.body,
        ContentType: contentTypeForArtifact(item.artifact.name, item.artifact.type)
      })
    );
  }
}

async function withTransaction(callback) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function loadExecutionContext(client, request) {
  const runResult = await client.query("SELECT * FROM runs WHERE id = $1 FOR UPDATE", [request.runId]);
  const jobResult = await client.query("SELECT * FROM jobs WHERE id = $1 FOR UPDATE", [request.jobId]);
  const agentResult = await client.query("SELECT * FROM agents WHERE id = $1 FOR UPDATE", [request.agentId]);
  const deploymentResult = request.deploymentId
    ? await client.query("SELECT * FROM deployments WHERE id = $1", [request.deploymentId])
    : { rows: [] };

  if (!runResult.rows[0] || !jobResult.rows[0] || !agentResult.rows[0]) {
    return null;
  }

  return {
    run: runResult.rows[0],
    job: jobResult.rows[0],
    agent: agentResult.rows[0],
    deployment: deploymentResult.rows[0] || null
  };
}

async function persistRun(client, run) {
  await client.query(
    `
      UPDATE runs
      SET status = $2,
          duration_ms = $3,
          created_at = $4::timestamptz,
          started_at = $5::timestamptz,
          completed_at = $6::timestamptz,
          logs = $7::jsonb,
          steps = $8::jsonb,
          output = $9::jsonb,
          artifact_ids = $10::jsonb
      WHERE id = $1
    `,
    [
      run.id,
      run.status,
      run.duration_ms,
      toIsoString(run.created_at),
      toIsoString(run.started_at),
      toIsoString(run.completed_at),
      JSON.stringify(run.logs),
      JSON.stringify(run.steps),
      run.output ? JSON.stringify(run.output) : null,
      JSON.stringify(run.artifact_ids)
    ]
  );
}

async function persistJob(client, job) {
  await client.query(
    `
      UPDATE jobs
      SET status = $2,
          started_at = $3::timestamptz,
          completed_at = $4::timestamptz
      WHERE id = $1
    `,
    [job.id, job.status, toIsoString(job.started_at), toIsoString(job.completed_at)]
  );
}

async function persistAgent(client, agent) {
  await client.query(
    `
      UPDATE agents
      SET status = $2,
          updated_at = $3::timestamptz,
          last_run_at = $4::timestamptz
      WHERE id = $1
    `,
    [agent.id, agent.status, toIsoString(agent.updated_at), toIsoString(agent.last_run_at)]
  );
}

function appendLog(run, message, level = "info") {
  run.logs.push({
    id: createId("log"),
    timestamp: new Date().toISOString(),
    level,
    message
  });
}


async function invokeOpenClawUpstreamRun(request, deployment, job) {
  const token = deployment?.runtime_auth?.token;
  const sessionKey = 'main';
  const idempotencyKey = `sidekicks-run-${request.runId}`;

  if (!deployment?.endpoint || !token) {
    throw new Error("OpenClaw upstream deployment is missing endpoint or token");
  }

  const history = await callOpenClawGateway({
    endpoint: deployment.endpoint,
    token,
    method: "chat.history",
    params: {
      sessionKey,
      limit: 200
    }
  });

  if (!history.ok) {
    throw new Error(`OpenClaw upstream chat.history failed: ${history.error}`);
  }

  const send = await callOpenClawGateway({
    endpoint: deployment.endpoint,
    token,
    method: "chat.send",
    params: {
      sessionKey,
      message: job.input.prompt,
      deliver: false,
      idempotencyKey
    }
  });

  if (!send.ok) {
    throw new Error(`OpenClaw upstream chat.send failed: ${send.error}`);
  }

  const summaryBody = JSON.stringify({
    status: 'gateway-rpc-ok',
    deploymentId: deployment.id,
    endpoint: deployment.endpoint,
    prompt: job.input.prompt,
    history: history.result,
    send: send.result
  }, null, 2);

  return {
    summary: `OpenClaw upstream gateway accepted the real WS session-aware RPC flow for ${request.agentName}.`,
    markdown: `# ${job.title}

OpenClaw upstream accepted authenticated gateway RPC calls for this run using the real connect + chat.history + chat.send flow.

Prompt: ${job.input.prompt}`,
    highlights: [
      'Authenticated the real upstream gateway with its generated token',
      'Executed gateway RPC methods instead of the Sidekicks-native /runs contract',
      'Captured the raw upstream gateway results into the run bundle'
    ],
    artifacts: [
      { name: `${slugifyTitle(job.title || "openclaw-upstream")}.md`, type: 'markdown', body: `# ${job.title}

OpenClaw upstream gateway accepted authenticated RPC.` },
      { name: `${slugifyTitle(job.title || "openclaw-upstream")}.json`, type: 'dataset', body: summaryBody }
    ]
  };
}

async function invokeRuntimeRun(request, deployment, job) {
  if (!deployment?.endpoint) {
    return null;
  }

  if (deployment.runtime_adapter === "openclaw-upstream") {
    return invokeOpenClawUpstreamRun(request, deployment, job);
  }

  const response = await fetch(`${deployment.endpoint}/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      runId: request.runId,
      agentId: request.agentId,
      agentName: request.agentName,
      templateId: request.templateId,
      title: job.title,
      prompt: job.input.prompt,
      slug: slugifyTitle(job.title || "run-output")
    })
  });

  if (!response.ok) {
    throw new Error(`Runtime run request failed with status ${response.status}`);
  }

  return response.json();
}

async function markRunning(request) {
  await withTransaction(async (client) => {
    const context = await loadExecutionContext(client, request);

    if (!context) {
      return;
    }

    const { run, job, agent, deployment } = context;
    const startedAt = new Date().toISOString();
    run.status = "running";
    run.started_at = startedAt;
    run.steps = parseJson(run.steps);
    run.logs = parseJson(run.logs);
    run.artifact_ids = parseJson(run.artifact_ids);
    run.steps[1].state = "active";
    appendLog(
      run,
      deployment?.endpoint
        ? `Worker claimed run and routed it to deployed runtime at ${deployment.endpoint}.`
        : `Worker claimed run on ${request.runtimeType} runtime.`
    );

    job.status = "running";
    job.started_at = startedAt;
    agent.status = "running";
    agent.updated_at = startedAt;
    agent.last_run_at = startedAt;

    await persistRun(client, run);
    await persistJob(client, job);
    await persistAgent(client, agent);
  });
}

async function markExecutionStarted(request) {
  await withTransaction(async (client) => {
    const context = await loadExecutionContext(client, request);

    if (!context) {
      return;
    }

    const { run, deployment } = context;
    run.logs = parseJson(run.logs);
    run.steps = parseJson(run.steps);
    run.artifact_ids = parseJson(run.artifact_ids);
    run.steps[1].state = "completed";
    run.steps[2].state = "active";
    appendLog(run, deployment?.endpoint ? "Execution started inside deployed runtime service." : "Execution started inside isolated worker context.");
    await persistRun(client, run);
  });
}

async function markExecutionProgress(request) {
  await withTransaction(async (client) => {
    const context = await loadExecutionContext(client, request);

    if (!context) {
      return;
    }

    const { run, deployment } = context;
    run.logs = parseJson(run.logs);
    run.steps = parseJson(run.steps);
    run.artifact_ids = parseJson(run.artifact_ids);
    run.steps[2].detail = "Primary task execution completed. Finalizing output package.";
    run.steps[3].state = "active";
    appendLog(run, deployment?.endpoint ? "Runtime returned execution payload, compiling final result bundle." : "Collected outputs, compiling final result bundle.");
    await persistRun(client, run);
  });
}

async function finalizeRun(request) {
  await withTransaction(async (client) => {
    const context = await loadExecutionContext(client, request);

    if (!context) {
      return;
    }

    const { run, job, agent, deployment } = context;
    run.logs = parseJson(run.logs);
    run.steps = parseJson(run.steps);
    run.artifact_ids = parseJson(run.artifact_ids);
    job.input = parseJson(job.input);

    const shouldFail = String(job.input.prompt || "").toLowerCase().includes("fail");
    const completedAt = new Date().toISOString();
    const startedAt = run.started_at ? new Date(run.started_at).getTime() : Date.now();

    run.completed_at = completedAt;
    run.duration_ms = new Date(completedAt).getTime() - startedAt;
    job.completed_at = completedAt;
    agent.updated_at = completedAt;

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
      appendLog(run, "Worker marked run as failed during simulated execution.", "error");
    } else {
      const runtimeResult = await invokeRuntimeRun(request, deployment, job);
      const templateResult = runtimeResult
        ? {
            output: {
              title: job.title,
              summary: runtimeResult.summary,
              highlights: runtimeResult.highlights,
              markdown: runtimeResult.markdown,
              links: runtimeResult.artifacts.map((artifact) => ({
                label: artifact.name,
                href: `#pending-${artifact.name}`
              }))
            },
            artifacts: [
              ...runtimeResult.artifacts.map((artifact) => ({
                artifact: createArtifact(
                  run.id,
                  request.agentId,
                  artifact.name,
                  artifact.type,
                  Buffer.byteLength(artifact.body)
                ),
                body: artifact.body
              })),
              {
                artifact: createArtifact(
                  run.id,
                  request.agentId,
                  `${run.id}-log.txt`,
                  "log",
                  Buffer.byteLength(run.logs.map((entry) => `[${entry.level}] ${entry.message}`).join("\n"))
                ),
                body: run.logs.map((entry) => `[${entry.level}] ${entry.message}`).join("\n")
              }
            ]
          }
        : buildTemplateExecution(request, run, job);

      run.status = "completed";
      job.status = "completed";
      agent.status = "idle";
      run.steps[2].state = "completed";
      run.steps[3].state = "completed";
      run.steps[3].detail = "Artifacts persisted to storage metadata.";
      appendLog(run, "Persisting output bundle to object storage.");
      await uploadArtifactBodies(templateResult.artifacts);
      run.output = {
        ...templateResult.output,
        links: templateResult.artifacts.map((item) => ({
          label: item.artifact.name,
          href: `/api/artifacts/${item.artifact.id}/download`
        }))
      };
      run.artifact_ids.push(...templateResult.artifacts.map((item) => item.artifact.id));
      appendLog(run, "Persisted output bundle and run log artifacts.");

      for (const item of templateResult.artifacts) {
        await client.query(
          `
            INSERT INTO artifacts (id, run_id, agent_id, name, type, size, storage_key, download_url, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz)
          `,
          [
            item.artifact.id,
            item.artifact.runId,
            item.artifact.agentId,
            item.artifact.name,
            item.artifact.type,
            item.artifact.size,
            item.artifact.storageKey,
            `/api/artifacts/${item.artifact.id}/download`,
            item.artifact.createdAt
          ]
        );
      }
    }

    await persistRun(client, run);
    await persistJob(client, job);
    await persistAgent(client, agent);
  });
}

async function processRunExecution(request) {
  await markRunning(request);
  await sleep(900);
  await markExecutionStarted(request);
  await sleep(900);
  await markExecutionProgress(request);
  await sleep(1200);
  await finalizeRun(request);
}

async function startWorker() {
  log("worker booting", config);

  if (config.backend !== "postgres") {
    log("worker idle", {
      note: "SIDEKICKS_BACKEND is not set to postgres, so queued execution stays in the in-memory control plane."
    });

    setInterval(() => {
      log("worker heartbeat", {
        mode: config.backend,
        queue: config.queue
      });
    }, 15000);

    return;
  }

  const worker = new Worker(
    config.queue,
    async (queueJob) => {
      log("processing queued run", {
        runId: queueJob.data.runId,
        runtimeType: queueJob.data.runtimeType
      });
      await processRunExecution(queueJob.data);
    },
    {
      connection: redis
    }
  );

  worker.on("completed", (queueJob) => {
    log("run completed", {
      runId: queueJob.data.runId
    });
  });

  worker.on("failed", (queueJob, error) => {
    log("run failed", {
      runId: queueJob?.data?.runId,
      error: error.message
    });
  });

  const shutdown = async () => {
    log("worker shutting down");
    await worker.close();
    await redis.quit();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  log("worker ready for BullMQ-backed execution", {
    queue: config.queue,
    runtime: config.runtime
  });
}

startWorker().catch((error) => {
  log("worker crashed during startup", {
    error: error.message
  });
  process.exit(1);
});

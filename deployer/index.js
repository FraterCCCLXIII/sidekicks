const { Worker } = require("bullmq");
const Docker = require("dockerode");
const IORedis = require("ioredis");
const { Pool } = require("pg");

const config = {
  queue: process.env.DEPLOY_QUEUE || "sidekicks-deployments",
  redisUrl: process.env.REDIS_URL || "redis://redis:6379",
  databaseUrl: process.env.DATABASE_URL || "postgres://sidekicks:sidekicks@postgres:5432/sidekicks",
  dockerSocketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock",
  dockerNetwork: process.env.DOCKER_NETWORK || "sidekicks_default"
};

const docker = new Docker({ socketPath: config.dockerSocketPath });
const redis = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null
});
const pool = new Pool({
  connectionString: config.databaseUrl
});

function log(message, extra) {
  console.log(
    JSON.stringify({
      time: new Date().toISOString(),
      service: "deployer",
      message,
      ...(extra || {})
    })
  );
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

function containerNameForDeployment(deploymentId) {
  return `sidekicks-agent-${deploymentId.replace(/[^a-zA-Z0-9_.-]/g, "-")}`;
}

function parseJson(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return JSON.parse(value);
  }

  return value;
}

async function stopAndRemoveContainer(containerId) {
  try {
    const container = docker.getContainer(containerId);
    await container.stop({ t: 2 }).catch(() => {});
    await container.remove({ force: true }).catch(() => {});
  } catch {
    return;
  }
}

async function stopByName(name) {
  const containers = await docker.listContainers({ all: true, filters: { name: [name] } });

  for (const item of containers) {
    await stopAndRemoveContainer(item.Id);
  }
}

async function pullImage(image) {
  await new Promise((resolve, reject) => {
    docker.pull(image, (error, stream) => {
      if (error) {
        reject(error);
        return;
      }

      docker.modem.followProgress(stream, (progressError) => {
        if (progressError) {
          reject(progressError);
          return;
        }

        resolve();
      });
    });
  });

  log("image pulled", { image });
}

function buildNativeTemplateEnv(deployment) {
  if (deployment.template_id === "tpl_nanoclaw") {
    return ["RUNTIME_TEMPLATE_ID=tpl_nanoclaw", "RUNTIME_NAME=NanoClaw", "PORT=4001"];
  }

  return ["RUNTIME_TEMPLATE_ID=tpl_openclaw", "RUNTIME_NAME=OpenClaw", "PORT=4001"];
}

function buildAgentEnv(agentEnvVars) {
  const mergedEnv = [];

  for (const pair of agentEnvVars) {
    if (!pair || typeof pair.key !== "string") {
      continue;
    }

    mergedEnv.push(`${pair.key}=${pair.value ?? ""}`);
  }

  return mergedEnv;
}

async function writeRenderedFiles(container, files) {
  for (const file of files || []) {
    const directory = file.path.split("/").slice(0, -1).join("/") || "/";
    const escapedDirectory = directory.replaceAll('"', '\\"');
    const escapedPath = file.path.replaceAll('"', '\\"');
    const encodedContent = Buffer.from(file.content, "utf8").toString("base64");
    const command = [
      "sh",
      "-lc",
      `mkdir -p \"${escapedDirectory}\" && printf '%s' '${encodedContent}' | base64 -d > \"${escapedPath}\"`
    ];
    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true
    });
    const stream = await exec.start({});
    await new Promise((resolve, reject) => {
      container.modem.followProgress(stream, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
    const result = await exec.inspect();

    if (result.ExitCode !== 0) {
      throw new Error(`Failed to write rendered file ${file.path}`);
    }
  }
}

async function readRuntimeFile(container, path) {
  const exec = await container.exec({
    Cmd: ["sh", "-lc", `cat \"${path.replaceAll('"', '\\"')}\"`],
    AttachStdout: true,
    AttachStderr: true
  });
  const stream = await exec.start({});
  const chunks = [];

  await new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  const result = await exec.inspect();

  if (result.ExitCode !== 0) {
    return null;
  }

  const output = Buffer.concat(chunks);

  // docker exec multiplexes stdout/stderr frames with an 8-byte header.
  if (output.length >= 8) {
    let offset = 0;
    const payloads = [];

    while (offset + 8 <= output.length) {
      const size = output.readUInt32BE(offset + 4);
      const start = offset + 8;
      const end = start + size;

      if (end > output.length) {
        break;
      }

      payloads.push(output.subarray(start, end));
      offset = end;
    }

    if (payloads.length > 0) {
      return Buffer.concat(payloads).toString("utf8");
    }
  }

  return output.toString("utf8");
}

async function extractOpenClawRuntimeAuth(container, renderedLaunch) {
  const configPath = renderedLaunch?.metadata?.configPath;

  if (!configPath) {
    log("runtime auth extraction skipped", { reason: "missing-config-path" });
    return null;
  }

  const content = await readRuntimeFile(container, configPath);

  if (!content) {
    log("runtime auth extraction failed", { reason: "empty-config-content", configPath });
    return null;
  }

  try {
    const parsed = JSON.parse(content);
    const token = parsed?.gateway?.auth?.token;

    log("runtime auth extraction result", {
      configPath,
      hasToken: Boolean(token)
    });

    return token ? { token } : null;
  } catch {
    log("runtime auth extraction failed", { reason: "invalid-config-json", configPath });
    return null;
  }
}

async function createNativeRuntimeContainer(deployment, agentId) {
  const name = containerNameForDeployment(deployment.id);

  await stopByName(name);

  const agentEnvVars = Array.isArray(deployment.agent_env_vars) ? deployment.agent_env_vars : [];
  const mergedEnv = [...buildNativeTemplateEnv(deployment), ...buildAgentEnv(agentEnvVars)];

  const container = await docker.createContainer({
    Image: deployment.image,
    name,
    Env: mergedEnv,
    ExposedPorts: {
      "4001/tcp": {}
    },
    HostConfig: {
      NetworkMode: config.dockerNetwork,
      RestartPolicy: {
        Name: "unless-stopped"
      }
    },
    Labels: {
      "sidekicks.agentId": agentId,
      "sidekicks.deploymentId": deployment.id
    }
  });

  await container.start();

  log("runtime container started", {
    deploymentId: deployment.id,
    agentId,
    image: deployment.image,
    injectedEnvKeys: agentEnvVars.map((pair) => pair.key)
  });

  return {
    containerId: container.id,
    endpoint: `http://${name}:4001`
  };
}

async function createRenderedRuntimeContainer(deployment, agentId) {
  const name = containerNameForDeployment(deployment.id);

  await stopByName(name);
  await pullImage(deployment.image);

  const renderedLaunch = parseJson(deployment.rendered_launch) || { env: [], files: [], command: null };
  const env = buildAgentEnv(renderedLaunch.env || []);
  const container = await docker.createContainer({
    Image: deployment.image,
    name,
    Env: env,
    Cmd: renderedLaunch.command || undefined,
    ExposedPorts: {
      "18789/tcp": {}
    },
    HostConfig: {
      NetworkMode: config.dockerNetwork,
      RestartPolicy: {
        Name: "unless-stopped"
      }
    },
    Labels: {
      "sidekicks.agentId": agentId,
      "sidekicks.deploymentId": deployment.id,
      "sidekicks.runtimeAdapter": deployment.runtime_adapter
    }
  });

  await container.start();
  await writeRenderedFiles(container, renderedLaunch.files || []);

  log("rendered runtime container started", {
    deploymentId: deployment.id,
    agentId,
    image: deployment.image,
    adapter: deployment.runtime_adapter,
    renderedEnvKeys: (renderedLaunch.env || []).map((pair) => pair.key),
    renderedFilePaths: (renderedLaunch.files || []).map((file) => file.path)
  });

  return {
    containerId: container.id,
    endpoint: `http://${name}:18789`
  };
}

async function waitForHealth(endpoint) {
  for (let index = 0; index < 20; index += 1) {
    try {
      const response = await fetch(`${endpoint}/health`);

      if (response.ok) {
        return true;
      }
    } catch {
      await sleep(500);
    }
  }

  return false;
}

async function waitForUpstreamOpenClaw(endpoint) {
  for (let index = 0; index < 40; index += 1) {
    try {
      const response = await fetch(endpoint);

      if (response.ok || response.status === 302 || response.status === 401 || response.status === 403) {
        return true;
      }
    } catch {
      await sleep(1000);
    }
  }

  return false;
}

async function markDeploymentStatus(deploymentId, values) {
  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE deployments
        SET status = $2,
            container_id = $3,
            endpoint = $4,
            updated_at = $5::timestamptz,
            last_health_at = $6::timestamptz,
            runtime_auth = COALESCE($7::jsonb, runtime_auth)
        WHERE id = $1
      `,
      [
        deploymentId,
        values.status,
        values.containerId ?? null,
        values.endpoint ?? null,
        values.updatedAt,
        values.lastHealthAt ?? null,
        values.runtimeAuth ? JSON.stringify(values.runtimeAuth) : null
      ]
    );
  });
}

async function failDeployment(deploymentId, error) {
  const now = new Date().toISOString();

  await markDeploymentStatus(deploymentId, {
    status: "failed",
    containerId: null,
    endpoint: null,
    updatedAt: now,
    lastHealthAt: null
  });

  log("deployment failed", {
    deploymentId,
    error: error instanceof Error ? error.message : String(error)
  });
}

async function deployRuntime(request) {
  const deployment = await withTransaction(async (client) => {
    const result = await client.query(
      `
        SELECT d.*, a.env_vars AS agent_env_vars
        FROM deployments d
        JOIN agents a ON a.id = d.agent_id
        WHERE d.id = $1
      `,
      [request.deploymentId]
    );
    return result.rows[0] || null;
  });

  if (!deployment) {
    return;
  }

  if (!["sidekicks-native", "openclaw-upstream"].includes(deployment.runtime_adapter)) {
    log("skipping deploy for unsupported template", {
      deploymentId: request.deploymentId,
      templateId: deployment.template_id,
      runtimeAdapter: deployment.runtime_adapter
    });
    await failDeployment(request.deploymentId, new Error(`Unsupported runtime adapter: ${deployment.runtime_adapter}`));
    return;
  }

  if (deployment.container_id) {
    await stopAndRemoveContainer(deployment.container_id);
  }

  const started =
    deployment.runtime_adapter === "openclaw-upstream"
      ? await createRenderedRuntimeContainer(deployment, request.agentId)
      : await createNativeRuntimeContainer(deployment, request.agentId);
  const healthy =
    deployment.runtime_adapter === "openclaw-upstream"
      ? await waitForUpstreamOpenClaw(started.endpoint)
      : await waitForHealth(started.endpoint);
  const now = new Date().toISOString();
  const runtimeAuth =
    healthy && deployment.runtime_adapter === "openclaw-upstream"
      ? await extractOpenClawRuntimeAuth(docker.getContainer(started.containerId), parseJson(deployment.rendered_launch))
      : null;

  await markDeploymentStatus(request.deploymentId, {
    status: healthy ? "healthy" : "failed",
    containerId: started.containerId,
    endpoint: started.endpoint,
    updatedAt: now,
    lastHealthAt: healthy ? now : null,
    runtimeAuth
  });

  log("deployment auth persisted", {
    deploymentId: request.deploymentId,
    hasRuntimeAuth: Boolean(runtimeAuth?.token)
  });

  log("deployment reconciled", {
    deploymentId: request.deploymentId,
    containerId: started.containerId,
    endpoint: started.endpoint,
    healthy
  });
}

async function reconcilePendingDeployments() {
  const result = await withTransaction(async (client) => {
    return client.query(
      `
        SELECT id, agent_id, template_id, image
        FROM deployments
        WHERE runtime_source = 'container'
          AND status = 'provisioning'
      `
    );
  });

  for (const row of result.rows) {
    try {
      await deployRuntime({
        deploymentId: row.id,
        agentId: row.agent_id,
        templateId: row.template_id,
        image: row.image,
        requestedAt: new Date().toISOString()
      });
    } catch (error) {
      await failDeployment(row.id, error);
    }
  }
}

async function startDeployer() {
  log("deployer booting", config);
  await reconcilePendingDeployments();

  const worker = new Worker(
    config.queue,
    async (job) => {
      try {
        await deployRuntime(job.data);
      } catch (error) {
        await failDeployment(job.data.deploymentId, error);
        throw error;
      }
    },
    {
      connection: redis
    }
  );

  worker.on("completed", (job) => {
    log("deployment completed", {
      deploymentId: job.data.deploymentId
    });
  });

  worker.on("failed", (job, error) => {
    log("deployment failed", {
      deploymentId: job?.data?.deploymentId,
      error: error.message
    });
  });

  const shutdown = async () => {
    await worker.close();
    await redis.quit();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  log("deployer ready", {
    queue: config.queue
  });
}

startDeployer().catch((error) => {
  log("deployer crashed during startup", { error: error.message });
  process.exit(1);
});

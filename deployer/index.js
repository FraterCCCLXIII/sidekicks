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

async function createRuntimeContainer(deployment, agentId) {
  const name = containerNameForDeployment(deployment.id);

  await stopByName(name);

  const templateEnv =
    deployment.template_id === "tpl_nanoclaw"
      ? ["RUNTIME_TEMPLATE_ID=tpl_nanoclaw", "RUNTIME_NAME=NanoClaw", "PORT=4001"]
      : ["RUNTIME_TEMPLATE_ID=tpl_openclaw", "RUNTIME_NAME=OpenClaw", "PORT=4001"];

  const container = await docker.createContainer({
    Image: deployment.image,
    name,
    Env: templateEnv,
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

  return {
    containerId: container.id,
    endpoint: `http://${name}:4001`
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

async function markDeploymentStatus(deploymentId, values) {
  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE deployments
        SET status = $2,
            container_id = $3,
            endpoint = $4,
            updated_at = $5::timestamptz,
            last_health_at = $6::timestamptz
        WHERE id = $1
      `,
      [
        deploymentId,
        values.status,
        values.containerId ?? null,
        values.endpoint ?? null,
        values.updatedAt,
        values.lastHealthAt ?? null
      ]
    );
  });
}

async function deployRuntime(request) {
  const deployment = await withTransaction(async (client) => {
    const result = await client.query("SELECT * FROM deployments WHERE id = $1", [request.deploymentId]);
    return result.rows[0] || null;
  });

  if (!deployment) {
    return;
  }

  if (!["tpl_openclaw", "tpl_nanoclaw"].includes(deployment.template_id)) {
    log("skipping deploy for unsupported template", {
      deploymentId: request.deploymentId,
      templateId: deployment.template_id
    });
    return;
  }

  if (deployment.container_id) {
    await stopAndRemoveContainer(deployment.container_id);
  }

  const started = await createRuntimeContainer(deployment, request.agentId);
  const healthy = await waitForHealth(started.endpoint);
  const now = new Date().toISOString();

  await markDeploymentStatus(request.deploymentId, {
    status: healthy ? "healthy" : "failed",
    containerId: started.containerId,
    endpoint: started.endpoint,
    updatedAt: now,
    lastHealthAt: healthy ? now : null
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
    await deployRuntime({
      deploymentId: row.id,
      agentId: row.agent_id,
      templateId: row.template_id,
      image: row.image,
      requestedAt: new Date().toISOString()
    });
  }
}

async function startDeployer() {
  log("deployer booting", config);
  await reconcilePendingDeployments();

  const worker = new Worker(
    config.queue,
    async (job) => {
      await deployRuntime(job.data);
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

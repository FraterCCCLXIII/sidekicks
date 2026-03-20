export type BackendMode = "memory" | "postgres";

export function getBackendMode(): BackendMode {
  return process.env.SIDEKICKS_BACKEND === "postgres" ? "postgres" : "memory";
}

export function isPostgresBackend() {
  return getBackendMode() === "postgres";
}

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is required when SIDEKICKS_BACKEND=postgres");
  }

  return url;
}

export function getRedisUrl() {
  return process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
}

export function getRedisConnectionOptions() {
  const url = new URL(getRedisUrl());
  const database = url.pathname.replace("/", "");

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: database ? Number(database) : undefined,
    maxRetriesPerRequest: null
  };
}

export function getWorkerQueueName() {
  return process.env.WORKER_QUEUE ?? "sidekicks-runs";
}

export function getDeployQueueName() {
  return process.env.DEPLOY_QUEUE ?? "sidekicks-deployments";
}

export function getStorageBucket() {
  return process.env.S3_BUCKET ?? "sidekicks-artifacts";
}

export function getStorageRegion() {
  return process.env.S3_REGION ?? "us-east-1";
}

export function getStorageEndpoint() {
  return process.env.S3_ENDPOINT ?? "http://127.0.0.1:9000";
}

export function getStorageCredentials() {
  return {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "sidekicks",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "sidekickspassword"
  };
}

export function getDefaultNodeRuntimeEndpoint() {
  return process.env.RUNTIME_NODE_ENDPOINT ?? "http://127.0.0.1:4001";
}

export function getDockerNetworkName() {
  return process.env.DOCKER_NETWORK ?? "sidekicks_default";
}

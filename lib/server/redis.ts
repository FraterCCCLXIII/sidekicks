import IORedis from "ioredis";

import { getRedisUrl } from "@/lib/server/config";

type GlobalState = typeof globalThis & {
  __sidekicksRedis?: IORedis;
};

function getGlobalState() {
  return globalThis as GlobalState;
}

export function getRedisConnection() {
  const globalState = getGlobalState();

  if (!globalState.__sidekicksRedis) {
    globalState.__sidekicksRedis = new IORedis(getRedisUrl(), {
      maxRetriesPerRequest: null
    });
  }

  return globalState.__sidekicksRedis;
}

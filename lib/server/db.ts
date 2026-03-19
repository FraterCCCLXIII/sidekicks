import { Pool } from "pg";

import { getDatabaseUrl } from "@/lib/server/config";

type GlobalState = typeof globalThis & {
  __sidekicksPool?: Pool;
};

function getGlobalState() {
  return globalThis as GlobalState;
}

export function getPool() {
  const globalState = getGlobalState();

  if (!globalState.__sidekicksPool) {
    globalState.__sidekicksPool = new Pool({
      connectionString: getDatabaseUrl()
    });
  }

  return globalState.__sidekicksPool;
}

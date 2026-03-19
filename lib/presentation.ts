import { type AgentStatus, type RunStatus } from "@/lib/mock-data";

export function statusTone(status: RunStatus | AgentStatus) {
  switch (status) {
    case "running":
      return "info" as const;
    case "success":
      return "success" as const;
    case "queued":
      return "warning" as const;
    case "failed":
    case "degraded":
      return "danger" as const;
    default:
      return "muted" as const;
  }
}

export function statusLabel(status: RunStatus | AgentStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

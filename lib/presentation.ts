import { type AgentInstanceStatus, type RunStatus } from "@/lib/domain/types";

export function statusTone(status: RunStatus | AgentInstanceStatus) {
  switch (status) {
    case "running":
      return "info" as const;
    case "completed":
      return "success" as const;
    case "queued":
    case "paused":
      return "warning" as const;
    case "failed":
    case "error":
      return "danger" as const;
    default:
      return "muted" as const;
  }
}

export function statusLabel(status: RunStatus | AgentInstanceStatus) {
  if (status === "completed") {
    return "Completed";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

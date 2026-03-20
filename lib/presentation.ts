import { type AgentInstanceStatus, type DeploymentStatus, type RunStatus } from "@/lib/domain/types";

export function statusTone(status: RunStatus | AgentInstanceStatus | DeploymentStatus) {
  switch (status) {
    case "running":
      return "info" as const;
    case "completed":
    case "healthy":
      return "success" as const;
    case "queued":
    case "paused":
    case "provisioning":
      return "warning" as const;
    case "failed":
    case "error":
    case "degraded":
      return "danger" as const;
    default:
      return "muted" as const;
  }
}

export function statusLabel(status: RunStatus | AgentInstanceStatus | DeploymentStatus) {
  if (status === "completed") {
    return "Completed";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

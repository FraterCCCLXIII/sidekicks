import { WebSocket } from "ws";

type GatewayRpcSuccess = {
  ok: true;
  result: unknown;
};

type GatewayRpcFailure = {
  ok: false;
  error: string;
};

type GatewayRpcResponse = GatewayRpcSuccess | GatewayRpcFailure;

function toWsUrl(endpoint: string) {
  if (endpoint.startsWith("https://")) {
    return endpoint.replace("https://", "wss://");
  }

  return endpoint.replace("http://", "ws://");
}

export async function callOpenClawGateway(options: {
  endpoint: string;
  token: string;
  method: string;
  params?: Record<string, unknown>;
}): Promise<GatewayRpcResponse> {
  const wsUrl = toWsUrl(options.endpoint);

  return new Promise((resolve) => {
    const socket = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Bearer ${options.token}`
      }
    });
    const requestId = `sidekicks-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const timeout = setTimeout(() => {
      socket.close();
      resolve({ ok: false, error: `Timed out waiting for ${options.method}` });
    }, 10000);

    socket.on("open", () => {
      socket.send(
        JSON.stringify({
          id: requestId,
          method: options.method,
          params: options.params ?? {}
        })
      );
    });

    socket.on("message", (raw) => {
      try {
        const payload = JSON.parse(String(raw));

        if (payload.id !== requestId) {
          return;
        }

        clearTimeout(timeout);
        socket.close();

        if (payload.error) {
          resolve({ ok: false, error: typeof payload.error === "string" ? payload.error : JSON.stringify(payload.error) });
          return;
        }

        resolve({ ok: true, result: payload.result ?? payload });
      } catch (error) {
        clearTimeout(timeout);
        socket.close();
        resolve({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    socket.on("error", (error) => {
      clearTimeout(timeout);
      resolve({ ok: false, error: error.message });
    });

    socket.on("close", () => {
      clearTimeout(timeout);
    });
  });
}

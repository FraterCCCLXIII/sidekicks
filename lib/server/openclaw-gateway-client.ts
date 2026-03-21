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

type GatewayConnectHello = {
  auth?: {
    token?: string;
    deviceToken?: string;
    role?: string;
    scopes?: string[];
  };
};

function toWsUrl(endpoint: string) {
  if (endpoint.startsWith("https://")) {
    return endpoint.replace("https://", "wss://");
  }

  return endpoint.replace("http://", "ws://");
}

function getSidekicksGatewayOrigin() {
  return (
    process.env.SIDEKICKS_GATEWAY_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.CONTROL_PLANE_URL ||
    "http://localhost:3000"
  );
}

export async function callOpenClawGateway(options: {
  endpoint: string;
  token: string;
  method: string;
  params?: Record<string, unknown>;
}): Promise<GatewayRpcResponse> {
  const wsUrl = toWsUrl(options.endpoint);
  const origin = getSidekicksGatewayOrigin();

  return new Promise((resolve) => {
    const socket = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Bearer ${options.token}`,
        Origin: origin
      }
    });
    const requestId = `sidekicks-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const connectId = `connect-${requestId}`;
    let isConnected = false;
    let connectSent = false;
    const timeout = setTimeout(() => {
      socket.close();
      resolve({ ok: false, error: `Timed out waiting for ${options.method}` });
    }, 10000);

    function sendRequest(id: string, method: string, params: Record<string, unknown>) {
      socket.send(
        JSON.stringify({
          type: "req",
          id,
          method,
          params
        })
      );
    }

    function sendConnect() {
      if (connectSent) {
        return;
      }

      connectSent = true;
      sendRequest(connectId, "connect", {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: "openclaw-control-ui",
          version: "control-ui",
          platform: "server",
          mode: "webchat",
          instanceId: requestId
        },
        role: "operator",
        scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
        caps: ["tool-events"],
        auth: {
          token: options.token
        },
        userAgent: "Sidekicks/1.0",
        locale: "en-US"
      });
    }

    socket.on("message", (raw) => {
      try {
        const payload = JSON.parse(String(raw));

        if (payload?.type === "event" && payload?.event === "connect.challenge") {
          // Protocol v3: wait for the challenge event before sending `connect`.
          sendConnect();
          return;
        }

        if (payload?.type !== "res") {
          return;
        }

        if (payload.id === connectId) {
          if (!payload.ok) {
            clearTimeout(timeout);
            socket.close();
            resolve({ ok: false, error: payload.error?.message ?? JSON.stringify(payload.error ?? payload) });
            return;
          }

          isConnected = true;
          const hello = (payload.payload ?? {}) as GatewayConnectHello;

          sendRequest(requestId, options.method, options.params ?? {});
          return;
        }

        if (payload.id !== requestId) {
          return;
        }

        clearTimeout(timeout);
        socket.close();

        if (!payload.ok) {
          resolve({ ok: false, error: payload.error?.message ?? JSON.stringify(payload.error ?? payload) });
          return;
        }

        resolve({ ok: true, result: payload.payload ?? payload });
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
      if (!isConnected) {
        return;
      }
    });
  });
}

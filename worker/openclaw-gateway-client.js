const { WebSocket } = require('ws');

function toWsUrl(endpoint) {
  if (endpoint.startsWith('https://')) {
    return endpoint.replace('https://', 'wss://');
  }
  return endpoint.replace('http://', 'ws://');
}

function toHttpOrigin(endpoint) {
  const url = new URL(endpoint);
  return `${url.protocol}//${url.host}`;
}

async function callOpenClawGateway(options) {
  const wsUrl = toWsUrl(options.endpoint);

  return new Promise((resolve) => {
    const socket = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Bearer ${options.token}`,
        Origin: toHttpOrigin(options.endpoint)
      }
    });
    const requestId = `sidekicks-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const connectId = `connect-${requestId}`;
    let isConnected = false;
    const timeout = setTimeout(() => {
      socket.close();
      resolve({ ok: false, error: `Timed out waiting for ${options.method}` });
    }, 10000);

    function sendRequest(id, method, params) {
      socket.send(JSON.stringify({ type: 'req', id, method, params }));
    }

    socket.on('open', () => {
      sendRequest(connectId, 'connect', {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'openclaw-control-ui',
          version: 'control-ui',
          platform: 'server',
          mode: 'webchat',
          instanceId: requestId
        },
        role: 'operator',
        scopes: ['operator.admin', 'operator.approvals', 'operator.pairing'],
        caps: ['tool-events'],
        auth: {
          token: options.token
        },
        userAgent: 'Sidekicks/1.0',
        locale: 'en-US'
      });
    });

    socket.on('message', (raw) => {
      try {
        const payload = JSON.parse(String(raw));

        if (payload?.type === 'event' && payload?.event === 'connect.challenge') {
          sendRequest(connectId, 'connect', {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: 'openclaw-control-ui',
              version: 'control-ui',
              platform: 'server',
              mode: 'webchat',
              instanceId: requestId
            },
            role: 'operator',
            scopes: ['operator.admin', 'operator.approvals', 'operator.pairing'],
            caps: ['tool-events'],
            auth: {
              token: options.token
            },
            userAgent: 'Sidekicks/1.0',
            locale: 'en-US'
          });
          return;
        }

        if (payload?.type !== 'res') return;

        if (payload.id === connectId) {
          if (!payload.ok) {
            clearTimeout(timeout);
            socket.close();
            resolve({ ok: false, error: payload.error?.message || JSON.stringify(payload.error || payload) });
            return;
          }

          isConnected = true;
          sendRequest(requestId, options.method, options.params || {});
          return;
        }

        if (payload.id !== requestId) return;
        clearTimeout(timeout);
        socket.close();
        if (!payload.ok) {
          resolve({ ok: false, error: payload.error?.message || JSON.stringify(payload.error || payload) });
          return;
        }
        resolve({ ok: true, result: payload.payload || payload });
      } catch (error) {
        clearTimeout(timeout);
        socket.close();
        resolve({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    socket.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ ok: false, error: error.message });
    });

    socket.on('close', () => {
      clearTimeout(timeout);
      if (!isConnected) return;
    });
  });
}

module.exports = { callOpenClawGateway };

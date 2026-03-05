const WS_URL = process.env.OPENCLAW_WS_URL ?? `ws://openclaw:18789`;
const TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? "";

export async function ocWsRequest(
  method: string,
  params: Record<string, unknown>
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const requestId = crypto.randomUUID();
    let ready = false;

    const t = setTimeout(() => {
      ws.close();
      reject(new Error("timeout"));
    }, 8000);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "req",
          id: "handshake",
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            auth: { token: TOKEN },
            client: { id: "gateway-client", version: "1.0", platform: "node", mode: "backend" },
            role: "operator",
            scopes: ["operator.admin"],
          },
        })
      );
    };

    ws.onmessage = (ev) => {
      const frame = JSON.parse(String(ev.data)) as {
        id: string;
        ok: boolean;
        payload?: unknown;
        error?: string;
      };
      if (!ready && frame.id === "handshake") {
        if (!frame.ok) {
          clearTimeout(t);
          ws.close();
          reject(new Error("WS auth failed"));
          return;
        }
        ready = true;
        ws.send(JSON.stringify({ type: "req", id: requestId, method, params }));
        return;
      }
      if (frame.id === requestId) {
        clearTimeout(t);
        ws.close();
        frame.ok
          ? resolve(frame.payload ?? null)
          : reject(new Error(frame.error ?? "failed"));
      }
    };

    ws.onerror = () => {
      clearTimeout(t);
      reject(new Error("WebSocket error"));
    };

    ws.onclose = (ev) => {
      if (!ready) {
        clearTimeout(t);
        reject(new Error(`WS closed before ready (code=${ev.code})`));
      }
    };
  });
}

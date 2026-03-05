/**
 * E2E tests for the /api/openclaw/* endpoints.
 *
 * The compose test stack includes a live openclaw instance, so all
 * happy-path CRUD flows are tested against real containers.
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { startComposeEnv, type ComposeEnv } from "../helpers/compose-env";

let env: ComposeEnv;

const TEST_AGENT_ID = `e2e-test-${Date.now()}`;

beforeAll(async () => {
  env = await startComposeEnv();
}, 120_000);

afterAll(() => {
  env.teardown();
});

// ── status ────────────────────────────────────────────────────────────────────

describe("GET /api/openclaw/status", () => {
  it("returns 200 with connected: true", async () => {
    const res = await fetch(`${env.baseUrl}/api/openclaw/status`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.connected).toBe(true);
    expect(typeof body.gatewayUrl).toBe("string");
    expect(body.viaApiServer).toBe(true);
    expect(typeof body.checkedAt).toBe("string");
  });
});

// ── models ────────────────────────────────────────────────────────────────────

describe("GET /api/openclaw/models", () => {
  it("returns 200 with an array", async () => {
    const res = await fetch(`${env.baseUrl}/api/openclaw/models`);
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});

// ── agents CRUD ───────────────────────────────────────────────────────────────

describe("agents CRUD happy path", () => {
  it("CREATE — POST /api/openclaw/agents returns 201 with the new agent", async () => {
    const res = await fetch(`${env.baseUrl}/api/openclaw/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: TEST_AGENT_ID }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.id).toBe(TEST_AGENT_ID);
  });

  it("READ — GET /api/openclaw/agents lists the created agent", async () => {
    const res = await fetch(`${env.baseUrl}/api/openclaw/agents`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.some(a => a.id === TEST_AGENT_ID)).toBe(true);
  });

  it("UPDATE — PATCH /api/openclaw/agents/:id returns 200 with updated fields", async () => {
    const res = await fetch(`${env.baseUrl}/api/openclaw/agents/${TEST_AGENT_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "E2E Agent", emoji: "🧪" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.id).toBe(TEST_AGENT_ID);
    expect(body.name).toBe("E2E Agent");
    expect(body.emoji).toBe("🧪");
  });

  it("READ files — GET /api/openclaw/agents/:id/files returns array", async () => {
    const res = await fetch(`${env.baseUrl}/api/openclaw/agents/${TEST_AGENT_ID}/files`);
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it("UPDATE with files — PATCH writes files and returns 200", async () => {
    const res = await fetch(`${env.baseUrl}/api/openclaw/agents/${TEST_AGENT_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "E2E Agent",
        emoji: "🧪",
        files: { "AGENTS.md": "You are an E2E test agent." },
      }),
    });
    expect(res.status).toBe(200);
  });

  it("DELETE — DELETE /api/openclaw/agents/:id returns 200", async () => {
    const res = await fetch(`${env.baseUrl}/api/openclaw/agents/${TEST_AGENT_ID}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("READ after DELETE — agent no longer in list", async () => {
    // Openclaw reloads config async after CLI mutations; poll until gone (max 5s)
    const deadline = Date.now() + 5000;
    let found = true;
    while (Date.now() < deadline) {
      const res = await fetch(`${env.baseUrl}/api/openclaw/agents`);
      const body = (await res.json()) as Array<Record<string, unknown>>;
      found = body.some(a => a.id === TEST_AGENT_ID);
      if (!found) break;
      await new Promise(r => setTimeout(r, 300));
    }
    expect(found).toBe(false);
  });
});

// ── schema validation ─────────────────────────────────────────────────────────

describe("schema validation", () => {
  it("POST without id returns 400", async () => {
    const res = await fetch(`${env.baseUrl}/api/openclaw/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("PATCH non-existent agent returns 404", async () => {
    const res = await fetch(`${env.baseUrl}/api/openclaw/agents/does-not-exist-xyz`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ghost" }),
    });
    expect(res.status).toBe(404);
  });

  it("DELETE the default agent returns 400", async () => {
    // First find the default agent
    const listRes = await fetch(`${env.baseUrl}/api/openclaw/agents`);
    const agents = (await listRes.json()) as Array<{ id: string; isDefault?: boolean }>;
    const defaultAgent = agents.find(a => a.isDefault);
    if (!defaultAgent) return; // skip if no default set

    const res = await fetch(`${env.baseUrl}/api/openclaw/agents/${defaultAgent.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(400);
  });
});

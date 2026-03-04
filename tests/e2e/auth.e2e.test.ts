import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { resetDb } from "../helpers/reset-db";
import { startComposeEnv, type ComposeEnv } from "../helpers/compose-env";

let env: ComposeEnv;

beforeAll(async () => {
  env = await startComposeEnv();
}, 120_000);

afterAll(() => {
  env.teardown();
});

beforeEach(async () => {
  await resetDb(env.baseUrl);
}, 30_000);


describe("POST /api/auth/login", () => {
  it("succeeds with correct credentials", async () => {
    const res = await fetch(`${env.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@ajb.com", password: "testpassword" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("fails with wrong password", async () => {
    const res = await fetch(`${env.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@ajb.com", password: "wrongpassword" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; error?: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe("invalid_credentials");
  });

  it("fails with unknown email", async () => {
    const res = await fetch(`${env.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@example.com", password: "anything" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(false);
  });

  it("succeeds without email (uses first user)", async () => {
    const res = await fetch(`${env.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "testpassword" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});

describe("DELETE /api/auth/logout", () => {
  it("returns ok", async () => {
    const res = await fetch(`${env.baseUrl}/api/auth/logout`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});

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


describe("GET /api/users", () => {
  it("returns seeded admin user", async () => {
    const res = await fetch(`${env.baseUrl}/api/users`);
    expect(res.status).toBe(200);
    const users = (await res.json()) as Array<{ email: string; role: string }>;
    expect(users.length).toBeGreaterThanOrEqual(1);
    const admin = users.find((u) => u.email === "admin@ajb.com");
    expect(admin).toBeDefined();
    expect(admin!.role).toBe("admin");
  });
});

describe("POST /api/users", () => {
  it("creates a new user", async () => {
    const res = await fetch(`${env.baseUrl}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "testuser@example.com",
        password: "password123",
        role: "user",
        alertsEnabled: false,
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.email).toBe("testuser@example.com");
  });

  it("returns error for duplicate email", async () => {
    // Create first time
    await fetch(`${env.baseUrl}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dup User",
        email: "dup@example.com",
        password: "password123",
        role: "user",
        alertsEnabled: false,
      }),
    });

    // Try again with same email
    const res = await fetch(`${env.baseUrl}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dup User 2",
        email: "dup@example.com",
        password: "password123",
        role: "user",
        alertsEnabled: false,
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/users/:id", () => {
  it("updates user name", async () => {
    const listRes = await fetch(`${env.baseUrl}/api/users`);
    const users = (await listRes.json()) as Array<{ id: string }>;
    const userId = users[0].id;

    const res = await fetch(`${env.baseUrl}/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Name" }),
    });
    expect(res.status).toBe(200);
    const updated = (await res.json()) as { name: string };
    expect(updated.name).toBe("Updated Name");
  });
});

describe("DELETE /api/users/:id", () => {
  it("deletes a user", async () => {
    // Create a user to delete
    const createRes = await fetch(`${env.baseUrl}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "To Delete",
        email: "delete-me@example.com",
        password: "password123",
        role: "user",
        alertsEnabled: false,
      }),
    });
    const created = (await createRes.json()) as { id: string };

    const deleteRes = await fetch(`${env.baseUrl}/api/users/${created.id}`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(200);
  });
});

describe("PUT /api/users/me/password", () => {
  it("changes password with correct current password", async () => {
    const res = await fetch(`${env.baseUrl}/api/users/me/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: "testpassword",
        newPassword: "newpassword123",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("rejects wrong current password", async () => {
    const res = await fetch(`${env.baseUrl}/api/users/me/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: "wrongpassword",
        newPassword: "newpassword123",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; error?: string };
    expect(body.ok).toBe(false);
  });
});

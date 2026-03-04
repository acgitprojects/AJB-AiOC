import { mock, describe, it, expect, beforeEach } from "bun:test";
import type { User } from "@ajb/contract";

const adminUser: User = {
  id: "user-1",
  email: "admin@test.com",
  name: "Admin",
  role: "admin",
  alertsEnabled: false,
  createdAt: "2026-01-01T00:00:00Z",
};

let storedHash = "";

const mockFindAll = mock(() => Promise.resolve([adminUser]));
const mockFindByEmail = mock((email: string) =>
  Promise.resolve(email === adminUser.email ? adminUser : null),
);
const mockFindFirst = mock(() => Promise.resolve(adminUser));
const mockCreate = mock((user: Omit<User, "createdAt">) =>
  Promise.resolve({ ...user, createdAt: "2026-01-01T00:00:00Z" } as User),
);
const mockUpdate = mock((id: string, patch: object) =>
  Promise.resolve(id === adminUser.id ? { ...adminUser, ...patch } : null),
);
const mockRemove = mock((id: string) => Promise.resolve(id === adminUser.id));
const mockGetPasswordHash = mock(() => Promise.resolve(storedHash || null));
const mockSetPasswordHash = mock((_id: string, hash: string) => {
  storedHash = hash;
  return Promise.resolve();
});

mock.module("../../src/repositories/user.repository", () => ({
  findAll: mockFindAll,
  findByEmail: mockFindByEmail,
  findFirst: mockFindFirst,
  findById: mock((id: string) =>
    Promise.resolve(id === adminUser.id ? adminUser : null),
  ),
  create: mockCreate,
  update: mockUpdate,
  remove: mockRemove,
  getPasswordHash: mockGetPasswordHash,
  setPasswordHash: mockSetPasswordHash,
  insertUserWithPassword: mock(() => Promise.resolve()),
}));

import { hashPassword } from "../../src/services/password";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  login,
  changePassword,
} from "../../src/services/user.service";

describe("user.service", () => {
  beforeEach(async () => {
    mockFindAll.mockClear();
    mockFindByEmail.mockClear();
    mockFindFirst.mockClear();
    mockCreate.mockClear();
    mockUpdate.mockClear();
    mockRemove.mockClear();
    mockGetPasswordHash.mockClear();
    mockSetPasswordHash.mockClear();
    // Set a real hash for login tests
    storedHash = await hashPassword("correctpassword");
  });

  describe("listUsers", () => {
    it("returns all users", async () => {
      const result = await listUsers();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(adminUser.id);
    });
  });

  describe("createUser", () => {
    it("creates a new user", async () => {
      mockFindByEmail.mockImplementationOnce(() => Promise.resolve(null));
      const result = await createUser({
        name: "New User",
        email: "new@test.com",
        password: "password123",
        role: "user",
        alertsEnabled: false,
      });
      expect("user" in result).toBe(true);
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockSetPasswordHash).toHaveBeenCalledTimes(1);
    });

    it("returns error for duplicate email", async () => {
      const result = await createUser({
        name: "Duplicate",
        email: adminUser.email,
        password: "password123",
        role: "user",
        alertsEnabled: false,
      });
      expect("error" in result).toBe(true);
      expect((result as { error: string }).error).toBe("Email already registered");
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("updateUser", () => {
    it("updates user name", async () => {
      const result = await updateUser(adminUser.id, { name: "Updated Name" });
      expect(result?.name).toBe("Updated Name");
    });

    it("returns null for unknown user", async () => {
      const result = await updateUser("unknown", { name: "X" });
      expect(result).toBeNull();
    });
  });

  describe("deleteUser", () => {
    it("returns true for existing user", async () => {
      expect(await deleteUser(adminUser.id)).toBe(true);
    });

    it("returns false for unknown user", async () => {
      expect(await deleteUser("unknown")).toBe(false);
    });
  });

  describe("login", () => {
    it("succeeds with correct credentials", async () => {
      const result = await login(adminUser.email, "correctpassword");
      expect(result.ok).toBe(true);
    });

    it("fails with wrong password", async () => {
      const result = await login(adminUser.email, "wrongpassword");
      expect(result.ok).toBe(false);
      expect((result as { ok: false; error: string }).error).toBe("invalid_credentials");
    });

    it("fails for unknown email", async () => {
      const result = await login("nobody@test.com", "anything");
      expect(result.ok).toBe(false);
    });

    it("succeeds without email (uses first user)", async () => {
      const result = await login(undefined, "correctpassword");
      expect(result.ok).toBe(true);
    });
  });

  describe("changePassword", () => {
    it("changes password with correct current password", async () => {
      const result = await changePassword("correctpassword", "newpassword123");
      expect(result.ok).toBe(true);
      expect(mockSetPasswordHash).toHaveBeenCalledTimes(1);
    });

    it("rejects wrong current password", async () => {
      const result = await changePassword("wrongpassword", "newpassword123");
      expect(result.ok).toBe(false);
      expect(result.error).toBe("wrong_current_password");
    });

    it("rejects new password that is too short", async () => {
      const result = await changePassword("correctpassword", "short");
      expect(result.ok).toBe(false);
      expect(result.error).toBe("password_too_short");
    });
  });
});

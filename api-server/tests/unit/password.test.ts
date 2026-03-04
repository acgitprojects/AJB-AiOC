import { describe, it, expect } from "bun:test";
import { hashPassword, verifyPassword } from "../../src/services/password";

describe("password", () => {
  it("produces different hashes for same input", async () => {
    const h1 = await hashPassword("secret");
    const h2 = await hashPassword("secret");
    expect(h1).not.toBe(h2);
  });

  it("verifies correct password", async () => {
    const hash = await hashPassword("mypassword");
    expect(await verifyPassword("mypassword", hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("mypassword");
    expect(await verifyPassword("wrongpassword", hash)).toBe(false);
  });

  it("rejects tampered hash", async () => {
    const hash = await hashPassword("mypassword");
    const [salt] = hash.split(":");
    const tampered = `${salt}:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`;
    expect(await verifyPassword("mypassword", tampered)).toBe(false);
  });

  it("rejects malformed stored value", async () => {
    expect(await verifyPassword("anything", "notahash")).toBe(false);
  });
});

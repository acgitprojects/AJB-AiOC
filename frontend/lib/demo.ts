/**
 * lib/demo.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Demo mode utilities — allows testing without full user setup.
 * Enable with DEMO_MODE=true in .env.local
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const DEMO_MODE = process.env.DEMO_MODE === "true";

export const DEMO_ACCOUNTS = {
  admin: {
    email: "demo-admin@example.com",
    password: "Demo@12345",
    name: "Demo Admin",
    role: "admin" as const,
  },
  user: {
    email: "demo-user@example.com",
    password: "Demo@12345",
    name: "Demo User",
    role: "user" as const,
  },
};

export function getDemoAccount(email: string): (typeof DEMO_ACCOUNTS)[keyof typeof DEMO_ACCOUNTS] | null {
  if (!DEMO_MODE) return null;
  const normalizedEmail = email.toLowerCase().trim();
  for (const account of Object.values(DEMO_ACCOUNTS)) {
    if (account.email.toLowerCase() === normalizedEmail) {
      return account;
    }
  }
  return null;
}

export function validateDemoLogin(email: string, password: string): (typeof DEMO_ACCOUNTS)[keyof typeof DEMO_ACCOUNTS] | null {
  if (!DEMO_MODE) return null;
  const account = getDemoAccount(email);
  if (account && account.password === password) {
    return account;
  }
  return null;
}

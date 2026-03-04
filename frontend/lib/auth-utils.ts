/**
 * lib/auth-utils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Edge-compatible cryptographic utilities (Web Crypto API).
 * Works in both Node.js (dev) and Cloudflare Workers (production).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Password hashing (PBKDF2 via Web Crypto) ────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 150_000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  const saltHex = toHex(salt);
  const hashHex = toHex(new Uint8Array(bits));
  return `pbkdf2:${saltHex}:${hashHex}`;
}

export async function verifyPassword(raw: string, stored: string): Promise<boolean> {
  if (!stored.startsWith("pbkdf2:")) return false;
  const parts = stored.split(":");
  if (parts.length !== 3) return false;

  const salt = fromHex(parts[1]);
  const expectedHex = parts[2];
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(raw),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 150_000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  const computed = toHex(new Uint8Array(bits));
  // Constant-time comparison
  return timingSafeEqual(computed, expectedHex);
}

// ─── Session signing (HMAC-SHA256) ────────────────────────────────────────────

export interface SessionPayload {
  email: string;
  name: string;
  role: "admin" | "user";
  exp: number; // Unix ms
}

export async function signSession(
  payload: SessionPayload,
  secret: string,
): Promise<string> {
  const data = btoa(JSON.stringify(payload));
  const sig = await hmacSign(data, secret);
  return `${data}.${sig}`;
}

export async function verifySession(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;

  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const valid = await hmacVerify(data, sig, secret);
  if (!valid) return null;

  try {
    const payload = JSON.parse(atob(data)) as SessionPayload;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Reset token ─────────────────────────────────────────────────────────────

export function generateToken(bytes = 32): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const pairs = hex.match(/.{2}/g) ?? [];
  return new Uint8Array(pairs.map(b => parseInt(b, 16)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return toHex(new Uint8Array(sig));
}

async function hmacVerify(
  data: string,
  sigHex: string,
  secret: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sig = fromHex(sigHex);
  return crypto.subtle.verify("HMAC", key, sig as BufferSource, new TextEncoder().encode(data));
}

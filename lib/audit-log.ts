/**
 * lib/audit-log.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Audit logging for user actions (authentication, task updates, etc.)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface AuditLogEntry {
  timestamp: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  status: "success" | "failure";
  ip?: string;
}

/**
 * Log an action to console (in production, integrate with logging service)
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  const logEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  // For now, log to console (structured)
  console.log("[AUDIT]", JSON.stringify(logEntry));

  // TODO: In production, send to:
  // - Cloudflare Workers Analytics Engine
  // - External logging service (e.g., Datadog, Sentry)
  // - KV for audit trail persistence
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  email: string,
  action: "login" | "logout" | "failed_login",
  status: "success" | "failure",
  details: Record<string, unknown> = {},
  ip?: string,
): Promise<void> {
  await logAudit({
    timestamp: new Date().toISOString(),
    userEmail: email,
    action,
    resource: "auth",
    details,
    status,
    ip,
  });
}

/**
 * Log task operation
 */
export async function logTaskOperation(
  userId: string,
  taskId: string,
  operation: "create" | "update" | "delete",
  status: "success" | "failure",
  details: Record<string, unknown> = {},
): Promise<void> {
  await logAudit({
    timestamp: new Date().toISOString(),
    userId,
    action: `task_${operation}`,
    resource: "task",
    resourceId: taskId,
    details,
    status,
  });
}

import { db } from "./support.server";

export type AuditActorType = "student" | "staff" | "system";

export type AuditEvent = {
  actorType: AuditActorType;
  actorId?: string | null;
  actorName?: string | null;
  eventType: string;
  targetType?: string | null;
  targetId?: string | null;
  /**
   * Safe, non-sensitive details only. Never put TMS transaction IDs, email
   * addresses, or full ticket/message text here — same rule enforced at the
   * database level by the audit_logs comment in the migration.
   */
  metadata?: Record<string, unknown>;
};

/**
 * Fire-and-forget by design: a logging failure must never break the action
 * it's recording (a login, a ticket update, etc.), so any error here is
 * caught and only reported to the server console.
 */
export async function logAudit(event: AuditEvent): Promise<void> {
  try {
    await db.from("audit_logs").insert({
      actor_type: event.actorType,
      actor_id: event.actorId ?? null,
      actor_name: event.actorName ?? null,
      event_type: event.eventType,
      target_type: event.targetType ?? null,
      target_id: event.targetId ?? null,
      metadata: (event.metadata ?? {}) as never,
    });
  } catch (err) {
    console.error("audit log write failed", err);
  }
}

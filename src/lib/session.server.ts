import { useSession } from "@tanstack/react-start/server";

export type SupportSession = {
  role?: "student" | "staff";
  studentId?: string;
  staffId?: string;
  username?: string;
};

function sessionConfig() {
  const password = process.env["SESSION_SECRET"];
  if (!password) throw new Error("SESSION_SECRET is not configured");
  return {
    password,
    name: "cap10-support-session",
    maxAge: 60 * 60 * 24 * 7,
    // The app is often viewed inside an embedded preview frame, so the session
    // cookie must be allowed in a cross-site context.
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
    },
  };
}

export async function getSupportSession() {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- TanStack Start's useSession() is a server cookie helper, not a React Hook.
  return useSession<SupportSession>(sessionConfig());
}

/**
 * Friendly, non-technical errors only — never leak internals to users.
 * Must be a plain `Error`: custom Error subclasses cannot be serialized
 * back to the client by server functions and surface as a blank 500 page.
 */
export function friendly(message: string): Error {
  return new Error(message);
}

export async function readSession(): Promise<SupportSession> {
  const session = await getSupportSession();
  return session.data ?? {};
}

export async function requireStudent() {
  const data = await readSession();
  if (data.role !== "student" || !data.studentId) {
    throw friendly("আপনার সেশনের সময় শেষ হয়েছে। আবার লগইন করুন।");
  }
  return { studentId: data.studentId };
}

/**
 * Server-side staff authorization. Do not remove — every support-only
 * server function must pass through this check.
 */
export async function requireStaff() {
  const data = await readSession();
  if (data.role !== "staff" || !data.staffId) {
    throw friendly("এই পেজে প্রবেশের অনুমতি আপনার নেই। সাপোর্ট টিম হিসেবে লগইন করুন।");
  }
  return { staffId: data.staffId, username: data.username ?? "Support Team" };
}

/**
 * Captain-only server functions. Re-reads the role and class from the DB on
 * every call so a demoted/deactivated captain loses access immediately,
 * even with an old session cookie.
 */
export async function requireCaptain() {
  const { studentId } = await requireStudent();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: student } = await supabaseAdmin
    .from("students")
    .select("id, name, account_role, status, class_segment")
    .eq("id", studentId)
    .maybeSingle();
  if (!student || student.status !== "active" || student.account_role !== "captain") {
    throw friendly("এই অংশটি শুধু ক্লাস ক্যাপ্টেনদের জন্য।");
  }
  return { studentId, name: student.name, classSegment: student.class_segment };
}

/* ------------------------------ Login rate limiting ------------------------------ *
 * In-memory only: resets on server restart and is per-process, so it will not
 * catch a distributed brute force across multiple server instances. For this
 * app's scale it's enough to stop rapid, repeated TMS-id guesses against one
 * login number. If this is ever deployed across multiple instances, move this
 * to a shared store (a Supabase table, or Redis) instead.
 */
type LoginAttempt = { count: number; firstAttemptAt: number; lockedUntil?: number };
const loginAttempts = new Map<string, LoginAttempt>();

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_BEFORE_LOCK = 6;
const LOCKOUT_MS = 15 * 60 * 1000;

export function assertLoginNotRateLimited(key: string) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (entry?.lockedUntil && entry.lockedUntil > now) {
    const minutes = Math.max(1, Math.ceil((entry.lockedUntil - now) / 60_000));
    throw friendly(`অনেকবার ভুল চেষ্টা হয়েছে। অনুগ্রহ করে ${minutes} মিনিট পর আবার চেষ্টা করুন।`);
  }
  if (entry && now - entry.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    loginAttempts.delete(key);
  }
}

export function recordFailedLogin(key: string) {
  const now = Date.now();
  const entry = loginAttempts.get(key) ?? { count: 0, firstAttemptAt: now };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS_BEFORE_LOCK) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
  loginAttempts.set(key, entry);
}

export function clearLoginAttempts(key: string) {
  loginAttempts.delete(key);
}

const ITERATIONS = 100_000;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function pbkdf2(password: string, salt: string, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const computed = await pbkdf2(password, parts[2]!, iterations);
  const expected = parts[3]!;
  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

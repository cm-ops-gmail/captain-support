import { createServerFn } from "@tanstack/react-start";

import type { ClassSegment } from "./class-segments";

import {
  assertLoginNotRateLimited,
  clearLoginAttempts,
  friendly,
  getSupportSession,
  hashPassword,
  readSession,
  recordFailedLogin,
  verifyPassword,
} from "./session.server";
import { logAudit } from "./audit.server";
import { db, ensureDefaultStaff, normalizeLoginNumber } from "./support.server";

const MIN_PASSWORD_LENGTH = 6;

// Thrown by studentLogin when the account exists but has no password set
// yet (e.g. a captain staff added by hand or CSV). The client matches this
// exact message to switch the UI over to the registration/setup form
// instead of just showing a generic "wrong credentials" toast.
export const NEEDS_SETUP_MESSAGE =
  "এই লগইন নম্বরে এখনো পাসওয়ার্ড সেট করা হয়নি। আগে প্রথমবারের সেটআপ সম্পন্ন করুন।";

export type CurrentUser =
  | { role: "guest" }
  | {
      role: "student";
      id: string;
      name: string;
      contact_number: string;
      login_number: string;
      student_code: string | null;
      email: string | null;
      account_role: "student" | "captain";
      class_segment: ClassSegment;
    }
  | { role: "staff"; id: string; username: string };

export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentUser> => {
    const data = await readSession();
    if (data.role === "staff" && data.staffId) {
      return { role: "staff", id: data.staffId, username: data.username ?? "Support Team" };
    }
    if (data.role === "student" && data.studentId) {
      const { data: student } = await db
        .from("students")
        .select(
          "id, name, contact_number, login_number, student_code, email, account_role, status, class_segment",
        )
        .eq("id", data.studentId)
        .maybeSingle();
      // A deactivated (or removed) account is treated as logged out, even if
      // the browser still holds a previously valid session cookie.
      if (student && student.status === "active") {
        return {
          role: "student",
          id: student.id,
          name: student.name,
          contact_number: student.contact_number,
          login_number: student.login_number,
          student_code: student.student_code,
          email: student.email,
          account_role: student.account_role === "captain" ? "captain" : "student",
          class_segment: student.class_segment as ClassSegment,
        };
      }
    }
    return { role: "guest" };
  },
);

function normalizeVerifier(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * First-time setup for a staff-imported student. There is NO open
 * registration in Cap10: the account must already exist (CSV import or
 * staff form) and have no password yet. The student proves who they are
 * with their Student ID (student_code) or one of their TMS transaction IDs
 * from the import, then chooses a password.
 */
export const setupStudentAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { login_number: string; verifier: string; password: string }) => input)
  .handler(async ({ data }) => {
    const login_number = normalizeLoginNumber(data.login_number ?? "");
    const verifier = normalizeVerifier(data.verifier ?? "");
    const password = data.password ?? "";

    if (login_number.length < 6) throw friendly("সঠিক লগইন নম্বর দিন।");
    if (!verifier) throw friendly("আপনার স্টুডেন্ট আইডি অথবা TMS ট্রানজেকশন আইডি দিন।");
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw friendly(`পাসওয়ার্ড কমপক্ষে ${MIN_PASSWORD_LENGTH} অক্ষরের হতে হবে।`);
    }

    // Same limiter as login: stops guessing student codes for a number.
    const rateLimitKey = `setup:${login_number}`;
    assertLoginNotRateLimited(rateLimitKey);

    const { data: existing } = await db
      .from("students")
      .select("id, name, status, account_role, student_code, tms_transaction_ids, password_hash")
      .eq("login_number", login_number)
      .maybeSingle();

    if (!existing) {
      recordFailedLogin(rateLimitKey);
      throw friendly(
        "এই লগইন নম্বরটি শিক্ষার্থী তালিকায় পাওয়া যায়নি। অনুগ্রহ করে সাপোর্ট টিমের সাথে যোগাযোগ করুন।",
      );
    }
    if (existing.password_hash) {
      throw friendly("এই লগইন নম্বরে ইতিমধ্যে পাসওয়ার্ড সেট করা আছে। লগইন করুন।");
    }
    if (existing.status !== "active") {
      throw friendly(
        "আপনার শিক্ষার্থী অ্যাকাউন্টটি নিষ্ক্রিয় আছে। সাপোর্ট টিমের সাথে যোগাযোগ করুন।",
      );
    }

    const validVerifiers = [
      ...(existing.student_code ? [normalizeVerifier(existing.student_code)] : []),
      ...(existing.tms_transaction_ids ?? []).map(normalizeVerifier),
    ];
    if (validVerifiers.length === 0) {
      throw friendly("আপনার অ্যাকাউন্টে যাচাইয়ের তথ্য নেই। সাপোর্ট টিমের সাথে যোগাযোগ করুন।");
    }
    if (!validVerifiers.includes(verifier)) {
      recordFailedLogin(rateLimitKey);
      throw friendly(
        "স্টুডেন্ট আইডি / TMS আইডি মিলছে না। সঠিক তথ্য দিন অথবা সাপোর্টে যোগাযোগ করুন।",
      );
    }
    clearLoginAttempts(rateLimitKey);

    const password_hash = await hashPassword(password);
    // .is("password_hash", null) makes the claim atomic: two concurrent
    // setups for the same number cannot both set a password.
    const { data: updated, error } = await db
      .from("students")
      .update({ password_hash, last_login_at: new Date().toISOString() })
      .eq("id", existing.id)
      .is("password_hash", null)
      .select("id, name, account_role")
      .maybeSingle();
    if (error || !updated) throw friendly("সেটআপ সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।");

    const session = await getSupportSession();
    await session.update({ role: "student", studentId: updated.id });
    await logAudit({
      actorType: "student",
      actorId: updated.id,
      actorName: updated.name,
      eventType: "student.account_setup",
      targetType: "student",
      targetId: updated.id,
    });

    return {
      name: updated.name,
      account_role: updated.account_role === "captain" ? "captain" : "student",
    };
  });

export const studentLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { login_number: string; password: string }) => input)
  .handler(async ({ data }) => {
    const login_number = normalizeLoginNumber(data.login_number ?? "");
    const password = data.password ?? "";

    if (login_number.length < 6) throw friendly("সঠিক লগইন নম্বর দিন।");
    if (!password) throw friendly("পাসওয়ার্ড দিন।");

    const rateLimitKey = `student:${login_number}`;
    assertLoginNotRateLimited(rateLimitKey);

    const deny = (): never => {
      recordFailedLogin(rateLimitKey);
      throw friendly("লগইন নম্বর অথবা পাসওয়ার্ড ভুল হয়েছে।");
    };

    const { data: student } = await db
      .from("students")
      .select("id, name, status, account_role, password_hash")
      .eq("login_number", login_number)
      .maybeSingle();

    if (!student) {
      recordFailedLogin(rateLimitKey);
      throw friendly("লগইন নম্বর অথবা পাসওয়ার্ড ভুল হয়েছে।");
    }
    if (student.status !== "active") {
      // Distinct message on purpose: this is an account-state issue, not a
      // credential guess, so it doesn't count against the rate limit.
      throw friendly(
        "আপনার শিক্ষার্থী অ্যাকাউন্টটি নিষ্ক্রিয় আছে। সাপোর্ট টিমের সাথে যোগাযোগ করুন।",
      );
    }
    if (!student.password_hash) {
      // Also not a credential guess -- doesn't count against the rate limit.
      throw friendly(NEEDS_SETUP_MESSAGE);
    }

    const ok = await verifyPassword(password, student.password_hash);
    if (!ok) deny();

    clearLoginAttempts(rateLimitKey);

    const session = await getSupportSession();
    await session.update({ role: "student", studentId: student.id });
    await db
      .from("students")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", student.id);

    await logAudit({
      actorType: "student",
      actorId: student.id,
      actorName: student.name,
      eventType: "student.login",
      targetType: "student",
      targetId: student.id,
      metadata: { account_role: student.account_role },
    });

    return {
      name: student.name,
      account_role: student.account_role === "captain" ? "captain" : "student",
    };
  });

export const staffLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string }) => input)
  .handler(async ({ data }) => {
    await ensureDefaultStaff();
    const username = (data.username ?? "").trim();
    const { data: staff } = await db
      .from("staff_users")
      .select("id, username, password_hash")
      .ilike("username", username)
      .maybeSingle();
    const ok = staff ? await verifyPassword(data.password ?? "", staff.password_hash) : false;
    if (!staff || !ok) {
      throw friendly("ইউজারনেম বা পাসওয়ার্ড ভুল হয়েছে।");
    }
    const session = await getSupportSession();
    await session.update({ role: "staff", staffId: staff.id, username: staff.username });
    await logAudit({
      actorType: "staff",
      actorId: staff.id,
      actorName: staff.username,
      eventType: "staff.login",
    });
    return { username: staff.username };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const before = await readSession();
  const session = await getSupportSession();
  await session.clear();
  if (before.role === "student" && before.studentId) {
    await logAudit({
      actorType: "student",
      actorId: before.studentId,
      eventType: "student.logout",
    });
  } else if (before.role === "staff" && before.staffId) {
    await logAudit({
      actorType: "staff",
      actorId: before.staffId,
      actorName: before.username ?? null,
      eventType: "staff.logout",
    });
  }
  return { ok: true };
});

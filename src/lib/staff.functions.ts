import { createServerFn } from "@tanstack/react-start";
import { logAudit } from "./audit.server";
import { CLASS_SEGMENTS, isClassSegment, type ClassSegment } from "./class-segments";
import { friendly, hashPassword, requireStaff, verifyPassword } from "./session.server";
import {
  analyzeStudentCsv,
  db,
  isValidTmsTransactionId,
  normalizeLoginNumber,
  splitTmsField,
  toCsv,
} from "./support.server";
import { CATEGORIES, PLATFORMS, STATUSES } from "./support-constants";

// Date-only ticket filters use Bangladesh calendar days (UTC+06:00),
// regardless of the server's deployment timezone.
function dhakaDayStart(date: string): string {
  return `${date}T00:00:00+06:00`;
}

function dhakaDate(offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function nextDhakaDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export type StaffTicketFilters = {
  search?: string;
  status?: string;
  category?: string;
  segment?: string;
  platform?: string;
  priority?: string;
  range?: "all" | "today" | "yesterday" | "7d" | "30d" | "custom";
  from?: string;
  to?: string;
};

type SegmentSummary = {
  segment: ClassSegment;
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  urgent: number;
  today: number;
  students: number;
  topCategories: [string, number][];
};

/** Overview = global totals + one summary card per class segment. */
export const staffOverview = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const [{ data: tickets }, { data: students }, { count: voiceNew }] = await Promise.all([
    db
      .from("tickets")
      .select(
        "id, ticket_number, title, category, class_segment, status, priority, created_at, updated_at, official_response",
      )
      .order("updated_at", { ascending: false })
      .limit(10000),
    db.from("students").select("class_segment").eq("status", "active").limit(50000),
    db.from("captain_submissions").select("id", { count: "exact", head: true }).eq("status", "New"),
  ]);

  const list = tickets ?? [];
  const todayStart = dhakaDayStart(dhakaDate());
  const isToday = (iso: string) => new Date(iso) >= new Date(todayStart);

  const segments: SegmentSummary[] = CLASS_SEGMENTS.map((segment) => {
    const rows = list.filter((t) => t.class_segment === segment);
    const byCategory: Record<string, number> = {};
    for (const t of rows) byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
    return {
      segment,
      total: rows.length,
      open: rows.filter((t) => t.status === "Open").length,
      inProgress: rows.filter((t) => t.status === "In Progress").length,
      resolved: rows.filter((t) => t.status === "Resolved").length,
      closed: rows.filter((t) => t.status === "Closed").length,
      urgent: rows.filter(
        (t) => t.priority === "urgent" && t.status !== "Resolved" && t.status !== "Closed",
      ).length,
      today: rows.filter((t) => isToday(t.created_at)).length,
      students: (students ?? []).filter((s) => s.class_segment === segment).length,
      topCategories: Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
    };
  });

  const byStatus: Record<string, number> = {};
  for (const st of STATUSES) byStatus[st] = 0;
  for (const t of list) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;

  return {
    total: list.length,
    byStatus,
    today: list.filter((t) => isToday(t.created_at)).length,
    awaitingResponse: list.filter((t) => !t.official_response && t.status !== "Closed").length,
    students: (students ?? []).length,
    captainVoiceNew: voiceNew ?? 0,
    segments,
    recent: list.slice(0, 8),
  };
});

/** Detailed dashboard for one class segment. */
export const staffSegmentDashboard = createServerFn({ method: "GET" })
  .inputValidator((input: { segment: string }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    if (!isClassSegment(data.segment)) throw friendly("ক্লাসটি খুঁজে পাওয়া যায়নি।");
    const segment = data.segment;
    const [{ data: tickets }, { count: studentCount }, { count: captainCount }] = await Promise.all(
      [
        db
          .from("tickets")
          .select(
            "id, ticket_number, title, category, sub_type, platform, status, priority, source_role, created_at, updated_at, resolved_at, students!tickets_student_id_fkey(name, login_number)",
          )
          .eq("class_segment", segment)
          .order("created_at", { ascending: false })
          .limit(5000),
        db
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("class_segment", segment)
          .eq("status", "active"),
        db
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("class_segment", segment)
          .eq("status", "active")
          .eq("account_role", "captain"),
      ],
    );
    const list = tickets ?? [];

    const byStatus = STATUSES.map((status) => ({
      key: status,
      value: list.filter((t) => t.status === status).length,
    }));
    const byCategory = CATEGORIES.map((category) => ({
      key: category,
      value: list.filter((t) => t.category === category).length,
    }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
    const byPlatform = [...PLATFORMS, null]
      .map((platform) => ({
        key: platform ?? "unspecified",
        value: list.filter((t) => (t.platform ?? null) === platform).length,
      }))
      .filter((row) => row.value > 0);

    // 14 Bangladesh calendar days, oldest first.
    const trend = Array.from({ length: 14 }, (_, index) => {
      const day = dhakaDate(index - 13);
      const start = new Date(dhakaDayStart(day)).getTime();
      const end = new Date(dhakaDayStart(nextDhakaDate(day))).getTime();
      const inDay = (iso: string | null) => {
        if (!iso) return false;
        const time = new Date(iso).getTime();
        return time >= start && time < end;
      };
      return {
        day,
        created: list.filter((t) => inDay(t.created_at)).length,
        resolved: list.filter((t) => inDay(t.resolved_at)).length,
      };
    });

    const resolvedDurations = list
      .filter((t) => t.resolved_at)
      .map((t) => new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime());
    const avgResolutionHours = resolvedDurations.length
      ? Math.round(
          resolvedDurations.reduce((a, b) => a + b, 0) / resolvedDurations.length / 3_600_000,
        )
      : null;

    return {
      segment,
      students: studentCount ?? 0,
      captains: captainCount ?? 0,
      total: list.length,
      unresolved: list.filter((t) => t.status === "Open" || t.status === "In Progress").length,
      urgent: list.filter(
        (t) => t.priority === "urgent" && t.status !== "Resolved" && t.status !== "Closed",
      ).length,
      avgResolutionHours,
      byStatus,
      byCategory,
      byPlatform,
      trend,
      latest: list.slice(0, 25),
    };
  });

export const staffTickets = createServerFn({ method: "POST" })
  .inputValidator((input: StaffTicketFilters) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    let query = db
      .from("tickets")
      .select(
        "id, ticket_number, class_segment, category, sub_type, platform, app_version, page_or_feature, title, description, status, priority, source_role, official_response, handled_by, created_at, updated_at, is_demo, students!tickets_student_id_fkey(name, contact_number, student_code)",
      )
      .order("created_at", { ascending: false })
      .limit(2000);

    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.category && data.category !== "all") query = query.eq("category", data.category);
    if (data.segment && data.segment !== "all") query = query.eq("class_segment", data.segment);
    if (data.platform && data.platform !== "all") query = query.eq("platform", data.platform);
    if (data.priority && data.priority !== "all") query = query.eq("priority", data.priority);

    const today = dhakaDate();
    if (data.range === "today") {
      query = query
        .gte("created_at", dhakaDayStart(today))
        .lt("created_at", dhakaDayStart(nextDhakaDate(today)));
    } else if (data.range === "yesterday") {
      query = query
        .gte("created_at", dhakaDayStart(dhakaDate(-1)))
        .lt("created_at", dhakaDayStart(today));
    } else if (data.range === "7d" || data.range === "30d") {
      const days = data.range === "7d" ? 7 : 30;
      query = query.gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString());
    } else if (data.range === "custom") {
      if (data.from) query = query.gte("created_at", dhakaDayStart(data.from));
      if (data.to) query = query.lt("created_at", dhakaDayStart(nextDhakaDate(data.to)));
    }

    const { data: rows, error: ticketsError } = await query;
    if (ticketsError) {
      console.error("staff ticket query failed", ticketsError);
      throw friendly("টিকেট লোড করা যায়নি। আবার চেষ্টা করুন।");
    }
    const search = (data.search ?? "").trim().toLowerCase();
    let list = rows ?? [];
    if (search) {
      list = list.filter((t) =>
        [
          t.ticket_number,
          t.title,
          t.description,
          t.category,
          t.sub_type,
          t.page_or_feature,
          t.students?.name,
          t.students?.contact_number,
          t.students?.student_code,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(search)),
      );
    }

    const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2 };
    return [...list].sort((a, b) => {
      const rankDiff = (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  });

export const staffTicketDetail = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    const { data: ticket } = await db
      .from("tickets")
      .select(
        "*, students!tickets_student_id_fkey(id, name, contact_number, login_number, student_code, email, class_segment)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (!ticket) throw friendly("সমস্যাটি খুঁজে পাওয়া যায়নি।");

    const [{ data: messages }, { data: attachments }] = await Promise.all([
      db
        .from("ticket_messages")
        .select("id, sender_type, sender_name, message, internal, created_at")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true }),
      db
        .from("attachments")
        .select("id, file_name, file_type, file_size, external_url, storage_path, created_at")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true }),
    ]);

    return { ticket, messages: messages ?? [], attachments: attachments ?? [] };
  });

export const staffUpdateTicket = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id: string;
      status?: string;
      priority?: "normal" | "high" | "urgent";
      response?: string;
      handled_by?: string;
      sendResponse?: boolean;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { staffId, username } = await requireStaff();
    const patch: {
      status?: string;
      priority?: "normal" | "high" | "urgent";
      resolved_at?: string;
      official_response?: string | null;
      handled_by?: string;
    } = {};

    if (data.status) {
      if (!STATUSES.includes(data.status as never)) throw friendly("সঠিক অবস্থা নির্বাচন করুন।");
      patch.status = data.status;
      if (data.status === "Resolved") patch.resolved_at = new Date().toISOString();
    }
    if (data.priority !== undefined) {
      if (!["normal", "high", "urgent"].includes(data.priority)) {
        throw friendly("সঠিক প্রায়োরিটি নির্বাচন করুন।");
      }
      patch.priority = data.priority;
    }
    if (typeof data.response === "string") patch.official_response = data.response.trim() || null;
    if (typeof data.handled_by === "string") patch.handled_by = data.handled_by.trim() || username;

    const { error } = await db.from("tickets").update(patch).eq("id", data.id);
    if (error) throw friendly("সমস্যাটি আপডেট করা যায়নি। আবার চেষ্টা করুন।");

    if (patch.status) {
      await logAudit({
        actorType: "staff",
        actorId: staffId,
        actorName: username,
        eventType: "ticket.status_changed",
        targetType: "ticket",
        targetId: data.id,
        metadata: { status: patch.status },
      });
    }

    if (patch.priority) {
      await logAudit({
        actorType: "staff",
        actorId: staffId,
        actorName: username,
        eventType: "ticket.priority_changed",
        targetType: "ticket",
        targetId: data.id,
        metadata: { priority: patch.priority },
      });
    }

    if (data.sendResponse && data.response?.trim()) {
      await db.from("ticket_messages").insert({
        ticket_id: data.id,
        sender_type: "staff",
        sender_name: username,
        message: data.response.trim(),
      });
      await logAudit({
        actorType: "staff",
        actorId: staffId,
        actorName: username,
        eventType: "ticket.response_sent",
        targetType: "ticket",
        targetId: data.id,
      });
    }

    return { ok: true };
  });

export const staffAddMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { ticketId: string; message: string; internal?: boolean }) => input)
  .handler(async ({ data }) => {
    const { staffId, username } = await requireStaff();
    const message = (data.message ?? "").trim();
    if (message.length < 2) throw friendly("পাঠানোর আগে বার্তাটি লিখুন।");
    await db.from("ticket_messages").insert({
      ticket_id: data.ticketId,
      sender_type: "staff",
      sender_name: username,
      message,
      internal: Boolean(data.internal),
    });
    await logAudit({
      actorType: "staff",
      actorId: staffId,
      actorName: username,
      eventType: "ticket.message_sent",
      targetType: "ticket",
      targetId: data.ticketId,
    });
    return { ok: true };
  });

export const exportTicketsCsv = createServerFn({ method: "POST" })
  .inputValidator((input: StaffTicketFilters) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    const rows = await staffTickets({ data });
    return toCsv(
      [
        "Ticket ID",
        "Student Name",
        "Contact Number",
        "Student ID",
        "Class",
        "Category",
        "Sub-type",
        "Platform",
        "App Version",
        "Page/Feature",
        "Title",
        "Description",
        "Status",
        "Priority",
        "Source",
        "Response",
        "Handled By",
        "Submitted Date",
        "Updated Date",
      ],
      rows.map((t) => [
        t.ticket_number,
        t.students?.name,
        t.students?.contact_number,
        t.students?.student_code,
        t.class_segment,
        t.category,
        t.sub_type,
        t.platform,
        t.app_version,
        t.page_or_feature,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.source_role,
        t.official_response,
        t.handled_by,
        t.created_at,
        t.updated_at,
      ]),
    );
  });

/* -------------------------------- Student database -------------------------------- */

export const listStudents = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const { data } = await db
    .from("students")
    .select(
      "id, name, contact_number, login_number, tms_transaction_ids, class_segment, student_code, email, account_role, status, password_hash, deactivated_at, deactivation_reason, is_demo, last_login_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(5000);
  // Never send password hashes to the browser; only whether setup is done.
  return (data ?? []).map(({ password_hash, ...student }) => ({
    ...student,
    has_password: Boolean(password_hash),
  }));
});

export const previewStudentCsv = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    if (!data.text?.trim()) throw friendly("আপলোড হয়নি। ফাইলটি ফাঁকা মনে হচ্ছে।");
    const analysis = await analyzeStudentCsv(data.text);
    if (analysis.detected === 0) {
      throw friendly("আপলোড হয়নি। ফাইলের ধরন ও কলাম হেডার দেখে নিন।");
    }
    return {
      detected: analysis.detected,
      validCount: analysis.valid.length,
      duplicateCount: analysis.duplicates.length,
      invalidCount: analysis.invalid.length,
      unmappedHeaders: analysis.unmappedHeaders,
      sample: analysis.valid.slice(0, 10),
      duplicates: analysis.duplicates.slice(0, 10),
      invalid: analysis.invalid.slice(0, 10),
    };
  });

export const importStudentCsv = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string; updateExisting?: boolean }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    const analysis = await analyzeStudentCsv(data.text);
    let inserted = 0;
    let updated = 0;

    if (analysis.valid.length) {
      const { error } = await db.from("students").insert(
        analysis.valid.map((s) => ({
          name: s.name,
          contact_number: s.contact_number,
          login_number: s.login_number,
          tms_transaction_ids: s.tms_transaction_ids,
          class_segment: s.class_segment,
          student_code: s.student_code,
          email: s.email,
          account_role: s.account_role,
          status: s.status,
        })),
      );
      if (error) throw friendly("ইমপোর্ট হয়নি। ফাইলটি দেখে আবার চেষ্টা করুন।");
      inserted = analysis.valid.length;
    }

    if (data.updateExisting) {
      for (const row of analysis.duplicates) {
        const { data: existing } = await db
          .from("students")
          .select("tms_transaction_ids")
          .eq("login_number", row.login_number)
          .maybeSingle();

        const mergedTms = [
          ...new Set([...(existing?.tms_transaction_ids ?? []), ...row.tms_transaction_ids]),
        ];

        const { error } = await db
          .from("students")
          .update({
            name: row.name,
            student_code: row.student_code,
            email: row.email,
            tms_transaction_ids: mergedTms,
            class_segment: row.class_segment,
            account_role: row.account_role,
          })
          .eq("login_number", row.login_number);
        if (!error) updated++;
      }
    }

    return { inserted, updated, skipped: analysis.invalid.length };
  });

export const saveStudent = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      login_number: string;
      tms_transaction_ids?: string;
      class_segment: string;
      student_code?: string | null;
      email?: string | null;
      account_role?: "student" | "captain";
      status?: "active" | "inactive";
    }) => input,
  )
  .handler(async ({ data }) => {
    const { staffId, username } = await requireStaff();

    const name = (data.name ?? "").trim();
    if (!name) throw friendly("শিক্ষার্থীর নাম লিখুন।");

    const login_number = normalizeLoginNumber(data.login_number ?? "");
    if (login_number.length < 6) throw friendly("সঠিক লগইন নম্বর লিখুন।");

    if (!isClassSegment(data.class_segment)) throw friendly("শিক্ষার্থীর ক্লাস নির্বাচন করুন।");

    // TMS IDs are optional in Cap10 (Class 6–8 students often have none),
    // but a student needs a Student ID or TMS ID to complete first-time setup.
    const tms_transaction_ids = splitTmsField(data.tms_transaction_ids ?? "");
    const invalidTms = tms_transaction_ids.filter((code) => !isValidTmsTransactionId(code));
    if (invalidTms.length)
      throw friendly(`TMS আইডি এমন হতে হবে: TMS44500684 (ভুল: ${invalidTms[0]})`);
    const student_code = data.student_code?.trim() || null;
    if (!student_code && tms_transaction_ids.length === 0)
      throw friendly("স্টুডেন্ট আইডি অথবা TMS আইডি — অন্তত একটি দিন (প্রথমবারের সেটআপে লাগবে)।");

    const email = data.email?.trim() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw friendly("সঠিক ইমেইল ঠিকানা লিখুন।");

    let previousRole: string | null = null;
    if (data.id) {
      const { data: existing } = await db
        .from("students")
        .select("account_role")
        .eq("id", data.id)
        .maybeSingle();
      previousRole = existing?.account_role ?? null;
    }

    const payload = {
      name,
      contact_number: login_number,
      login_number,
      tms_transaction_ids,
      class_segment: data.class_segment,
      student_code,
      email,
      account_role: data.account_role === "captain" ? "captain" : "student",
      status: data.status === "inactive" ? "inactive" : "active",
    };

    const { error } = data.id
      ? await db.from("students").update(payload).eq("id", data.id)
      : await db.from("students").insert(payload);

    if (error) {
      throw friendly(
        error.code === "23505"
          ? "এই লগইন নম্বরটি ডেটাবেজে আগে থেকেই আছে।"
          : "শিক্ষার্থীর তথ্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",
      );
    }

    if (data.id && previousRole !== payload.account_role) {
      await logAudit({
        actorType: "staff",
        actorId: staffId,
        actorName: username,
        eventType:
          payload.account_role === "captain" ? "captain.role_granted" : "captain.role_removed",
        targetType: "student",
        targetId: data.id,
      });
    }

    return { ok: true };
  });

/**
 * Soft-delete only. Hard-deleting used to cascade and destroy the student's
 * tickets and messages, which is unsafe. A deactivated student keeps their
 * history but can no longer log in (enforced in auth.functions.ts).
 */
export const deactivateStudent = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; reason?: string }) => input)
  .handler(async ({ data }) => {
    const { staffId, username } = await requireStaff();
    const reason = data.reason?.trim().slice(0, 200) || null;
    const { error } = await db
      .from("students")
      .update({
        status: "inactive",
        deactivated_at: new Date().toISOString(),
        deactivation_reason: reason,
      })
      .eq("id", data.id);
    if (error) throw friendly("শিক্ষার্থীকে নিষ্ক্রিয় করা যায়নি। আবার চেষ্টা করুন।");
    await logAudit({
      actorType: "staff",
      actorId: staffId,
      actorName: username,
      eventType: "student.deactivated",
      targetType: "student",
      targetId: data.id,
      metadata: reason ? { reason } : {},
    });
    return { ok: true };
  });

export const reactivateStudent = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { staffId, username } = await requireStaff();
    const { error } = await db
      .from("students")
      .update({ status: "active", deactivated_at: null, deactivation_reason: null })
      .eq("id", data.id);
    if (error) throw friendly("শিক্ষার্থীকে সক্রিয় করা যায়নি। আবার চেষ্টা করুন।");
    await logAudit({
      actorType: "staff",
      actorId: staffId,
      actorName: username,
      eventType: "student.reactivated",
      targetType: "student",
      targetId: data.id,
    });
    return { ok: true };
  });

export const exportStudentsCsv = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const { data } = await db
    .from("students")
    .select(
      "name, login_number, tms_transaction_ids, email, class_segment, account_role, status, student_code, created_at",
    )
    .order("created_at", { ascending: false });

  return toCsv(
    [
      "name",
      "login_number",
      "tms_transaction_id",
      "email",
      "class",
      "account_role",
      "status",
      "student_id",
      "date_added",
    ],
    (data ?? []).map((s) => [
      s.name,
      s.login_number,
      (s.tms_transaction_ids ?? []).join(","),
      s.email,
      s.class_segment,
      s.account_role,
      s.status,
      s.student_code,
      s.created_at,
    ]),
  );
});

/* ---------------------------------- Notices ---------------------------------- */

export const listNotices = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const { data } = await db.from("notices").select("*").order("created_at", { ascending: false });
  return data ?? [];
});

export const saveNotice = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string;
      title: string;
      content: string;
      priority?: string;
      published?: boolean;
      target_segments?: string[];
    }) => input,
  )
  .handler(async ({ data }) => {
    await requireStaff();
    const title = (data.title ?? "").trim();
    const content = (data.content ?? "").trim();
    if (title.length < 3) throw friendly("নোটিশের শিরোনাম লিখুন।");
    if (content.length < 3) throw friendly("নোটিশের বিবরণ লিখুন।");
    const payload = {
      title,
      content,
      priority: data.priority || "Normal",
      published: data.published ?? true,
      // Empty = every class. Unknown values are dropped, never stored.
      target_segments: (data.target_segments ?? []).filter(isClassSegment),
    };
    const { error } = data.id
      ? await db.from("notices").update(payload).eq("id", data.id)
      : await db.from("notices").insert(payload);
    if (error) throw friendly("নোটিশটি সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।");
    return { ok: true };
  });

export const deleteNotice = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    await db.from("notices").delete().eq("id", data.id);
    return { ok: true };
  });

/* ---------------------------------- Settings ---------------------------------- */

export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { username } = await requireStaff();
  const { data } = await db.from("app_settings").select("key, value");
  const settings = {
    upload: { max_file_mb: 8, max_files: 5 },
  };
  for (const row of data ?? []) {
    if (row.key === "upload" && row.value && typeof row.value === "object")
      settings.upload = { ...settings.upload, ...(row.value as Record<string, number>) };
  }
  const { data: staff } = await db.from("staff_users").select("id, username, role, created_at");
  return { settings, staff: staff ?? [], username };
});

export const updateSetting = createServerFn({ method: "POST" })
  .inputValidator((input: { key: string; value: unknown }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    const allowed = ["upload"];
    if (!allowed.includes(data.key)) throw friendly("এই সেটিংটি পরিবর্তন করা যাবে না।");
    await db
      .from("app_settings")
      .upsert(
        { key: data.key, value: data.value as never, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    return { ok: true };
  });

export const updateStaffCredentials = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { currentPassword: string; username?: string; newPassword?: string }) => input,
  )
  .handler(async ({ data }) => {
    const { staffId } = await requireStaff();
    const { data: staff } = await db
      .from("staff_users")
      .select("id, password_hash")
      .eq("id", staffId)
      .maybeSingle();
    if (!staff) throw friendly("আপনার সেশনের সময় শেষ হয়েছে। আবার লগইন করুন।");
    if (!(await verifyPassword(data.currentPassword ?? "", staff.password_hash))) {
      throw friendly("আপনার বর্তমান পাসওয়ার্ড ভুল।");
    }
    const patch: { username?: string; password_hash?: string } = {};
    if (data.username?.trim()) patch.username = data.username.trim();
    if (data.newPassword) {
      if (data.newPassword.length < 8) {
        throw friendly("নতুন পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।");
      }
      patch.password_hash = await hashPassword(data.newPassword);
    }
    if (Object.keys(patch).length === 0) throw friendly("আপডেট করার কিছু নেই।");
    const { error } = await db.from("staff_users").update(patch).eq("id", staffId);
    if (error) throw friendly("লগইন তথ্য আপডেট করা যায়নি। আবার চেষ্টা করুন।");
    return { ok: true };
  });

export const listAuditLogs = createServerFn({ method: "POST" })
  .inputValidator((input: { eventType?: string; limit?: number }) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    let query = db
      .from("audit_logs")
      .select(
        "id, actor_type, actor_id, actor_name, event_type, target_type, target_id, metadata, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (data.eventType && data.eventType !== "all") query = query.eq("event_type", data.eventType);
    const { data: rows } = await query;
    return rows ?? [];
  });

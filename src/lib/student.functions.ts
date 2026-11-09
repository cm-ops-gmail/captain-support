import { createServerFn } from "@tanstack/react-start";
import { logAudit } from "./audit.server";
import { friendly, hashPassword, requireStudent, verifyPassword } from "./session.server";
import { db } from "./support.server";
import { CATEGORIES, PLATFORMS, SUB_TYPES, type Category } from "./support-constants";

/** Loads the fields every student function needs; rejects deactivated accounts. */
async function currentStudent() {
  const { studentId } = await requireStudent();
  const { data: student } = await db
    .from("students")
    .select("id, name, account_role, status, class_segment")
    .eq("id", studentId)
    .maybeSingle();
  if (!student || student.status !== "active") {
    throw friendly("আপনার সেশনের সময় শেষ হয়েছে। আবার লগইন করুন।");
  }
  return student;
}

/** Notices with no target are for everyone; otherwise the student's class must be listed. */
async function noticesForSegment(segment: string, limit?: number) {
  let query = db
    .from("notices")
    .select("id, title, content, priority, target_segments, created_at")
    .eq("published", true)
    .or(`target_segments.eq.{},target_segments.cs.{${segment}}`)
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return data ?? [];
}

export const studentDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const student = await currentStudent();
  const [{ data: tickets }, notices] = await Promise.all([
    db
      .from("tickets")
      .select("id, ticket_number, title, category, sub_type, status, created_at, updated_at")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false }),
    noticesForSegment(student.class_segment, 5),
  ]);
  const list = tickets ?? [];
  return {
    tickets: list.slice(0, 5),
    notices,
    stats: {
      open: list.filter((t) => t.status !== "Resolved" && t.status !== "Closed").length,
      resolved: list.filter((t) => t.status === "Resolved" || t.status === "Closed").length,
      total: list.length,
    },
  };
});

export const myTickets = createServerFn({ method: "GET" }).handler(async () => {
  const { studentId } = await requireStudent();
  const { data } = await db
    .from("tickets")
    .select(
      "id, ticket_number, title, category, sub_type, platform, status, created_at, updated_at",
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return data ?? [];
});

export const myTicketDetail = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data: input }) => {
    const { studentId } = await requireStudent();
    const { data: ticket } = await db
      .from("tickets")
      .select("*")
      .eq("id", input.id)
      .eq("student_id", studentId)
      .maybeSingle();
    if (!ticket) throw friendly("এই সমস্যাটি আপনার অ্যাকাউন্টে পাওয়া যায়নি।");
    const [{ data: messages }, { data: attachments }] = await Promise.all([
      db
        .from("ticket_messages")
        .select("id, sender_type, sender_name, message, created_at")
        .eq("ticket_id", ticket.id)
        .eq("internal", false)
        .order("created_at", { ascending: true }),
      db
        .from("attachments")
        .select("id, file_name, file_type, file_size, external_url, storage_path, created_at")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true }),
    ]);
    return { ticket, messages: messages ?? [], attachments: attachments ?? [] };
  });

function optionalText(value: string | null | undefined, max: number, label: string): string | null {
  const cleaned = (value ?? "").trim();
  if (cleaned.length > max) throw friendly(`${label} সর্বোচ্চ ${max} অক্ষরের হতে পারবে।`);
  return cleaned || null;
}

export const createTicket = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      category: string;
      sub_type?: string | null;
      platform?: string | null;
      app_version?: string | null;
      page_or_feature?: string | null;
      title?: string;
      description: string;
      link?: string | null;
    }) => input,
  )
  .handler(async ({ data }) => {
    const student = await currentStudent();
    if (!CATEGORIES.includes(data.category as Category)) {
      throw friendly("সমস্যার সঠিক ধরন নির্বাচন করুন।");
    }
    const category = data.category as Category;
    const sub_type = optionalText(data.sub_type, 60, "সমস্যার উপ-ধরন");
    if (sub_type && !SUB_TYPES[category].includes(sub_type)) {
      throw friendly("সমস্যার সঠিক উপ-ধরন নির্বাচন করুন।");
    }
    const platform = optionalText(data.platform, 20, "প্ল্যাটফর্ম");
    if (platform && !PLATFORMS.includes(platform as never)) {
      throw friendly("সঠিক প্ল্যাটফর্ম নির্বাচন করুন।");
    }
    const suppliedTitle = optionalText(data.title, 150, "সমস্যার শিরোনাম");
    const description = (data.description ?? "").trim();
    if (description.length < 10 || description.length > 4000) {
      throw friendly("সমস্যাটি ১০ থেকে ৪০০০ অক্ষরের মধ্যে বর্ণনা করুন।");
    }
    const link = optionalText(data.link, 500, "লিংক");
    if (link && !/^https?:\/\//i.test(link)) {
      throw friendly("লিংক অবশ্যই http:// বা https:// দিয়ে শুরু হতে হবে।");
    }
    // Staff views require a title; generate one if the student left it blank.
    const title = suppliedTitle || `${category}${sub_type ? ` — ${sub_type}` : ""}`;
    const isCaptain = student.account_role === "captain";

    const { data: ticket, error } = await db
      .from("tickets")
      .insert({
        student_id: student.id,
        class_segment: student.class_segment,
        category,
        sub_type,
        platform,
        app_version: optionalText(data.app_version, 40, "অ্যাপ ভার্সন"),
        page_or_feature: optionalText(data.page_or_feature, 200, "পেজ / ফিচার"),
        link,
        title,
        description,
        status: "Open",
        priority: "normal",
        source_role: isCaptain ? "captain" : "student",
      })
      .select("id, ticket_number, category, status, created_at")
      .single();
    if (error || !ticket) throw friendly("সমস্যাটি জমা দেওয়া যায়নি। আবার চেষ্টা করুন।");

    await db.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_type: "student",
      sender_name: "Student",
      message: description,
    });

    if (link) {
      await db.from("attachments").insert({
        ticket_id: ticket.id,
        file_name: link,
        file_type: "link",
        external_url: link,
      });
    }

    await logAudit({
      actorType: "student",
      actorId: student.id,
      eventType: "ticket.created",
      targetType: "ticket",
      targetId: ticket.id,
      metadata: { category, sub_type, platform, class_segment: student.class_segment },
    });

    return ticket;
  });

export const addStudentMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { ticketId: string; message: string }) => input)
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    const message = (data.message ?? "").trim();
    if (message.length < 2 || message.length > 4000) {
      throw friendly("পাঠানোর আগে আপনার বার্তাটি লিখুন।");
    }
    const { data: ticket } = await db
      .from("tickets")
      .select("id, status")
      .eq("id", data.ticketId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (!ticket) throw friendly("এই সমস্যাটি আপনার অ্যাকাউন্টে পাওয়া যায়নি।");
    await db.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_type: "student",
      sender_name: "Student",
      message,
    });
    // A follow-up on a resolved ticket reopens it so staff see it again.
    const nextStatus = ticket.status === "Resolved" ? "In Progress" : ticket.status;
    if (nextStatus !== ticket.status) {
      await db.from("tickets").update({ status: nextStatus }).eq("id", ticket.id);
    }

    await logAudit({
      actorType: "student",
      actorId: studentId,
      eventType: "ticket.message_sent",
      targetType: "ticket",
      targetId: ticket.id,
    });

    return { ok: true, status: nextStatus };
  });

export const publishedNotices = createServerFn({ method: "GET" }).handler(async () => {
  const student = await currentStudent();
  return noticesForSegment(student.class_segment);
});

export const unseenResolvedTickets = createServerFn({ method: "GET" }).handler(async () => {
  const { studentId } = await requireStudent();
  const { data: student } = await db
    .from("students")
    .select("resolved_notifications_seen_at")
    .eq("id", studentId)
    .maybeSingle();
  const since = student?.resolved_notifications_seen_at ?? "1970-01-01T00:00:00.000Z";
  const { data: tickets } = await db
    .from("tickets")
    .select("id, ticket_number, title, resolved_at")
    .eq("student_id", studentId)
    .eq("status", "Resolved")
    .gt("resolved_at", since)
    .order("resolved_at", { ascending: false });
  return tickets ?? [];
});

export const acknowledgeResolvedNotifications = createServerFn({ method: "POST" }).handler(
  async () => {
    const { studentId } = await requireStudent();
    await db
      .from("students")
      .update({ resolved_notifications_seen_at: new Date().toISOString() })
      .eq("id", studentId);
    return { ok: true };
  },
);

/* ------------------------------ Profile ------------------------------ */

export const studentProfile = createServerFn({ method: "GET" }).handler(async () => {
  const { studentId } = await requireStudent();
  const { data } = await db
    .from("students")
    .select(
      "name, login_number, contact_number, student_code, email, class_segment, account_role, created_at, last_login_at",
    )
    .eq("id", studentId)
    .maybeSingle();
  if (!data) throw friendly("প্রোফাইল পাওয়া যায়নি।");
  return data;
});

/** Students may only change their email; class and identity are staff-managed. */
export const updateStudentEmail = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    const email = (data.email ?? "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw friendly("সঠিক ইমেইল ঠিকানা দিন।");
    }
    await db
      .from("students")
      .update({ email: email || null })
      .eq("id", studentId);
    await logAudit({
      actorType: "student",
      actorId: studentId,
      eventType: "student.email_updated",
      targetType: "student",
      targetId: studentId,
    });
    return { ok: true };
  });

export const changeStudentPassword = createServerFn({ method: "POST" })
  .inputValidator((input: { current: string; next: string }) => input)
  .handler(async ({ data }) => {
    const { studentId } = await requireStudent();
    if ((data.next ?? "").length < 6) throw friendly("নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
    const { data: student } = await db
      .from("students")
      .select("password_hash")
      .eq("id", studentId)
      .maybeSingle();
    if (
      !student?.password_hash ||
      !(await verifyPassword(data.current ?? "", student.password_hash))
    ) {
      throw friendly("বর্তমান পাসওয়ার্ড সঠিক নয়।");
    }
    await db
      .from("students")
      .update({ password_hash: await hashPassword(data.next) })
      .eq("id", studentId);
    await logAudit({
      actorType: "student",
      actorId: studentId,
      eventType: "student.password_changed",
      targetType: "student",
      targetId: studentId,
    });
    return { ok: true };
  });

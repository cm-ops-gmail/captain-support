import { createServerFn } from "@tanstack/react-start";

import { logAudit } from "./audit.server";
import { isClassSegment } from "./class-segments";
import { friendly, requireCaptain, requireStaff } from "./session.server";
import {
  CAPTAIN_AREAS,
  CAPTAIN_KINDS,
  CAPTAIN_STATUSES,
  type CaptainKind,
} from "./support-constants";
import { db, toCsv } from "./support.server";

/* =============================== Captain side =============================== */

export const submitCaptainVoice = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      kind: string;
      area: string;
      title: string;
      body: string;
      expected_benefit?: string | null;
    }) => input,
  )
  .handler(async ({ data }) => {
    const captain = await requireCaptain();
    if (!CAPTAIN_KINDS.includes(data.kind as CaptainKind)) throw friendly("সঠিক ধরন নির্বাচন করো।");
    if (!(CAPTAIN_AREAS as readonly string[]).includes(data.area)) {
      throw friendly("কোন বিষয়ে তা নির্বাচন করো।");
    }
    const title = (data.title ?? "").trim();
    const body = (data.body ?? "").trim();
    const expected_benefit = (data.expected_benefit ?? "").trim() || null;
    if (title.length < 5 || title.length > 150)
      throw friendly("শিরোনাম ৫ থেকে ১৫০ অক্ষরের মধ্যে লেখো।");
    if (body.length < 20 || body.length > 5000)
      throw friendly("বিস্তারিত ২০ থেকে ৫০০০ অক্ষরের মধ্যে লেখো।");
    if (expected_benefit && expected_benefit.length > 1000) {
      throw friendly("প্রত্যাশিত উপকার ১০০০ অক্ষরের মধ্যে লেখো।");
    }

    const { data: row, error } = await db
      .from("captain_submissions")
      .insert({
        captain_id: captain.studentId,
        class_segment: captain.classSegment,
        kind: data.kind,
        area: data.area,
        title,
        body,
        expected_benefit,
      })
      .select("id, submission_number, kind, status, created_at")
      .single();
    if (error || !row) throw friendly("জমা দেওয়া যায়নি। আবার চেষ্টা করো।");

    await logAudit({
      actorType: "student",
      actorId: captain.studentId,
      actorName: captain.name,
      eventType: "captain_voice.submitted",
      targetType: "captain_submission",
      targetId: row.id,
      metadata: { kind: data.kind, area: data.area, class_segment: captain.classSegment },
    });
    return row;
  });

export const myCaptainSubmissions = createServerFn({ method: "GET" }).handler(async () => {
  const captain = await requireCaptain();
  const { data } = await db
    .from("captain_submissions")
    .select(
      "id, submission_number, kind, area, title, body, expected_benefit, status, staff_note, reviewed_at, created_at",
    )
    .eq("captain_id", captain.studentId)
    .order("created_at", { ascending: false });
  return data ?? [];
});

/**
 * Read-only view of the issues raised in the captain's own class, so they
 * can spot patterns and speak for their class. Never exposes contact info.
 */
export const captainClassIssues = createServerFn({ method: "GET" }).handler(async () => {
  const captain = await requireCaptain();
  const { data } = await db
    .from("tickets")
    .select(
      "id, ticket_number, category, sub_type, platform, title, status, created_at, resolved_at",
    )
    .eq("class_segment", captain.classSegment)
    .order("created_at", { ascending: false })
    .limit(300);
  const list = data ?? [];
  return {
    segment: captain.classSegment,
    tickets: list,
    stats: {
      total: list.length,
      open: list.filter((t) => t.status === "Open" || t.status === "In Progress").length,
      resolved: list.filter((t) => t.status === "Resolved" || t.status === "Closed").length,
    },
  };
});

/* ================================ Staff side ================================ */

export type CaptainVoiceFilters = {
  segment?: string;
  kind?: string;
  status?: string;
  search?: string;
};

async function loadSubmissions(filters: CaptainVoiceFilters) {
  let query = db
    .from("captain_submissions")
    .select(
      "id, submission_number, class_segment, kind, area, title, body, expected_benefit, status, staff_note, reviewed_by, reviewed_at, created_at, updated_at, students!captain_submissions_captain_id_fkey(name, login_number)",
    )
    .order("created_at", { ascending: false })
    .limit(3000);
  if (filters.segment && filters.segment !== "all")
    query = query.eq("class_segment", filters.segment);
  if (filters.kind && filters.kind !== "all") query = query.eq("kind", filters.kind);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  const { data, error } = await query;
  if (error) {
    console.error("captain voice query failed", error);
    throw friendly("ক্যাপ্টেন ভয়েস লোড করা যায়নি।");
  }
  const search = (filters.search ?? "").trim().toLowerCase();
  const list = data ?? [];
  if (!search) return list;
  return list.filter((row) =>
    [row.submission_number, row.title, row.body, row.area, row.students?.name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search)),
  );
}

export const staffCaptainSubmissions = createServerFn({ method: "POST" })
  .inputValidator((input: CaptainVoiceFilters) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    return loadSubmissions(data);
  });

export const staffReviewSubmission = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; status: string; staff_note?: string | null }) => input)
  .handler(async ({ data }) => {
    const { staffId, username } = await requireStaff();
    if (!(CAPTAIN_STATUSES as readonly string[]).includes(data.status)) {
      throw friendly("সঠিক অবস্থা নির্বাচন করুন।");
    }
    const staff_note = (data.staff_note ?? "").trim() || null;
    if (staff_note && staff_note.length > 2000) throw friendly("নোট ২০০০ অক্ষরের মধ্যে লিখুন।");
    const { error } = await db
      .from("captain_submissions")
      .update({
        status: data.status,
        staff_note,
        reviewed_by: username,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw friendly("আপডেট করা যায়নি। আবার চেষ্টা করুন।");
    await logAudit({
      actorType: "staff",
      actorId: staffId,
      actorName: username,
      eventType: "captain_voice.reviewed",
      targetType: "captain_submission",
      targetId: data.id,
      metadata: { status: data.status },
    });
    return { ok: true };
  });

export const exportCaptainSubmissionsCsv = createServerFn({ method: "POST" })
  .inputValidator((input: CaptainVoiceFilters) => input)
  .handler(async ({ data }) => {
    await requireStaff();
    if (data.segment && data.segment !== "all" && !isClassSegment(data.segment)) {
      throw friendly("ক্লাসটি খুঁজে পাওয়া যায়নি।");
    }
    const rows = await loadSubmissions(data);
    return toCsv(
      [
        "Submission ID",
        "Class",
        "Captain",
        "Login Number",
        "Type",
        "Area",
        "Title",
        "Details",
        "Expected Benefit",
        "Status",
        "Staff Note",
        "Reviewed By",
        "Submitted",
      ],
      rows.map((row) => [
        row.submission_number,
        row.class_segment,
        row.students?.name,
        row.students?.login_number,
        row.kind,
        row.area,
        row.title,
        row.body,
        row.expected_benefit,
        row.status,
        row.staff_note,
        row.reviewed_by,
        row.created_at,
      ]),
    );
  });

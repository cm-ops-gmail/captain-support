import { createServerFn } from "@tanstack/react-start";

import { logAudit } from "./audit.server";
import { friendly, readSession } from "./session.server";
import { db } from "./support.server";
import { ALLOWED_FILE_TYPES, MAX_FILE_MB } from "./support-constants";

export const uploadAttachment = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      ticketId: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      base64: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const session = await readSession();
    if (session.role !== "student" || !session.studentId) {
      throw friendly("আপনার সেশনের সময় শেষ হয়েছে। আবার লগইন করুন।");
    }
    const { data: ticket } = await db
      .from("tickets")
      .select("id")
      .eq("id", data.ticketId)
      .eq("student_id", session.studentId)
      .maybeSingle();
    if (!ticket) throw friendly("এই সমস্যাটি আপনার অ্যাকাউন্টে পাওয়া যায়নি।");

    if (!ALLOWED_FILE_TYPES.includes(data.fileType)) {
      throw friendly("আপলোড হয়নি। এই ধরনের ফাইল সমর্থিত নয়।");
    }
    if (data.fileSize > MAX_FILE_MB * 1024 * 1024) {
      throw friendly(`Upload failed. Files must be smaller than ${MAX_FILE_MB} MB.`);
    }

    const binary = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const path = `${data.ticketId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await db.storage
      .from("ticket-attachments")
      .upload(path, binary, { contentType: data.fileType, upsert: false });
    if (uploadError) throw friendly("আপলোড হয়নি। ফাইলের ধরন ও আকার দেখে নিন।");

    const { data: row, error } = await db
      .from("attachments")
      .insert({
        ticket_id: data.ticketId,
        file_name: data.fileName.slice(0, 200),
        file_type: data.fileType,
        file_size: data.fileSize,
        storage_path: path,
      })
      .select("id, file_name, file_type, file_size, created_at")
      .single();
    if (error) throw friendly("আপলোড হয়নি। আবার চেষ্টা করুন।");

    await logAudit({
      actorType: "student",
      actorId: session.studentId,
      eventType: "attachment.uploaded",
      targetType: "ticket",
      targetId: data.ticketId,
      metadata: { file_type: data.fileType },
    });

    return row;
  });

export const addLinkAttachment = createServerFn({ method: "POST" })
  .inputValidator((input: { ticketId: string; url: string }) => input)
  .handler(async ({ data }) => {
    const session = await readSession();
    if (session.role !== "student" || !session.studentId) {
      throw friendly("আপনার সেশনের সময় শেষ হয়েছে। আবার লগইন করুন।");
    }
    const url = (data.url ?? "").trim();
    if (!/^https?:\/\//i.test(url) || url.length > 500) {
      throw friendly("Please provide a valid link starting with http:// or https://");
    }
    const { data: ticket } = await db
      .from("tickets")
      .select("id")
      .eq("id", data.ticketId)
      .eq("student_id", session.studentId)
      .maybeSingle();
    if (!ticket) throw friendly("এই সমস্যাটি আপনার অ্যাকাউন্টে পাওয়া যায়নি।");
    await db
      .from("attachments")
      .insert({ ticket_id: data.ticketId, file_name: url, file_type: "link", external_url: url });

    await logAudit({
      actorType: "student",
      actorId: session.studentId,
      eventType: "attachment.uploaded",
      targetType: "ticket",
      targetId: data.ticketId,
      metadata: { file_type: "link" },
    });

    return { ok: true };
  });

export const getAttachmentUrl = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const session = await readSession();
    const { data: attachment } = await db
      .from("attachments")
      .select("id, storage_path, external_url, ticket_id, file_type")
      .eq("id", data.id)
      .maybeSingle();
    if (!attachment) throw friendly("সংযুক্তিটি খুঁজে পাওয়া যায়নি।");

    if (session.role === "student") {
      const { data: ticket } = await db
        .from("tickets")
        .select("id")
        .eq("id", attachment.ticket_id)
        .eq("student_id", session.studentId ?? "")
        .maybeSingle();
      if (!ticket) throw friendly("এই সংযুক্তি দেখার অনুমতি আপনার নেই।");
    } else if (session.role !== "staff") {
      throw friendly("আপনার সেশনের সময় শেষ হয়েছে। আবার লগইন করুন।");
    }

    if (attachment.external_url) return { url: attachment.external_url };
    if (!attachment.storage_path) throw friendly("সংযুক্তিটি এখন পাওয়া যাচ্ছে না।");
    const { data: signed, error } = await db.storage
      .from("ticket-attachments")
      .createSignedUrl(attachment.storage_path, 60 * 30);
    if (error || !signed) throw friendly("সংযুক্তিটি এখন খোলা যাচ্ছে না।");
    return { url: signed.signedUrl };
  });

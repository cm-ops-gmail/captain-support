import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Download,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  UserPlus,
  UserX,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deactivateStudent,
  exportStudentsCsv,
  importStudentCsv,
  listStudents,
  previewStudentCsv,
  reactivateStudent,
  saveStudent,
} from "@/lib/staff.functions";
import { bn, downloadCsv, formatDateShortBn } from "@/lib/support-constants";
import { CLASS_SEGMENTS, segmentLabel, type ClassSegment } from "@/lib/class-segments";

export const Route = createFileRoute("/staff/students")({
  head: () => ({ meta: [{ title: "Student Database — Cap10 Support" }] }),
  component: StudentDatabase,
});

type StudentForm = {
  id?: string;
  name: string;
  login_number: string;
  tms_transaction_ids: string; // comma-separated in the form, split server-side
  class_segment: ClassSegment | "";
  student_code: string;
  email: string;
  account_role: "student" | "captain";
  status: "active" | "inactive";
};

const emptyForm: StudentForm = {
  name: "",
  login_number: "",
  tms_transaction_ids: "",
  class_segment: "",
  student_code: "",
  email: "",
  account_role: "student",
  status: "active",
};

function StudentDatabase() {
  const fetchStudents = useServerFn(listStudents);
  const preview = useServerFn(previewStudentCsv);
  const doImport = useServerFn(importStudentCsv);
  const save = useServerFn(saveStudent);
  const deactivate = useServerFn(deactivateStudent);
  const reactivate = useServerFn(reactivateStudent);
  const exportCsv = useServerFn(exportStudentsCsv);
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<ClassSegment | "all">("all");
  const [form, setForm] = useState<StudentForm | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof preview>> | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-students"],
    queryFn: () => fetchStudents(),
  });

  const rows = (data ?? []).filter(
    (s) =>
      (segmentFilter === "all" || s.class_segment === segmentFilter) &&
      [
        s.name,
        s.login_number,
        s.contact_number,
        s.student_code,
        s.email,
        ...(s.tms_transaction_ids ?? []),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(search.toLowerCase())),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["staff-students"] });

  const saveMutation = useMutation({
    mutationFn: (values: StudentForm) =>
      save({
        data: {
          ...(values.id ? { id: values.id } : {}),
          name: values.name,
          login_number: values.login_number,
          tms_transaction_ids: values.tms_transaction_ids,
          class_segment: values.class_segment,
          student_code: values.student_code || null,
          email: values.email || null,
          account_role: values.account_role,
          status: values.status,
        },
      }),
    onSuccess: () => {
      toast.success("শিক্ষার্থী সংরক্ষণ করা হয়েছে।");
      setForm(null);
      void invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "এই শিক্ষার্থীকে সংরক্ষণ করা যায়নি।"),
  });

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const result = await preview({ data: { text } });
      setCsvText(text);
      setAnalysis(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "আপলোড ব্যর্থ হয়েছে। ফাইলটি যাচাই করুন।");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function confirmImport(updateExisting: boolean) {
    if (!csvText) return;
    setBusy(true);
    try {
      const result = await doImport({ data: { text: csvText, updateExisting } });
      toast.success(
        `${bn(result.inserted)} জন যোগ হয়েছে, ${bn(result.updated)} জন আপডেট হয়েছে, ${bn(result.skipped)} জন বাদ দেওয়া হয়েছে।`,
      );
      setCsvText(null);
      setAnalysis(null);
      void invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ইম্পোর্ট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    try {
      const csv = await exportCsv();
      downloadCsv(`hsc28-students-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "এক্সপোর্ট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।",
      );
    }
  }

  async function handleDeactivate(id: string, name: string) {
    if (
      !confirm(
        `${name}-কে নিষ্ক্রিয় করতে চান? তার আগের টিকেট ও ইতিহাস থেকে যাবে, শুধু লগইন বন্ধ হবে।`,
      )
    )
      return;
    const reason = window.prompt("নিষ্ক্রিয় করার কারণ (ঐচ্ছিক):");
    try {
      await deactivate({ data: reason ? { id, reason } : { id } });
      toast.success("শিক্ষার্থীকে নিষ্ক্রিয় করা হয়েছে।");
      void invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "নিষ্ক্রিয় করা যায়নি।");
    }
  }

  async function handleReactivate(id: string) {
    try {
      await reactivate({ data: { id } });
      toast.success("শিক্ষার্থীকে আবার সক্রিয় করা হয়েছে।");
      void invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সক্রিয় করা যায়নি।");
    }
  }

  return (
    <div>
      <PageHeader
        title="শিক্ষার্থী ডেটাবেজ"
        description={`${bn(data?.length ?? 0)} জন শিক্ষার্থী। CSV-তে name, login_number, class এবং student_id অথবা tms_transaction_id কলাম দিন — শিক্ষার্থী প্রথমবার লগইন নম্বর + স্টুডেন্ট আইডি/TMS দিয়ে পাসওয়ার্ড সেট করবে।`}
        action={
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}>
              <Upload className="size-4" />
              CSV আপলোড করুন
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="size-4" />
              CSV এক্সপোর্ট করুন
            </Button>
            <Button onClick={() => setForm({ ...emptyForm })}>
              <UserPlus className="size-4" />
              শিক্ষার্থী যোগ করুন
            </Button>
          </div>
        }
      />

      {analysis ? (
        <div className="card-panel mb-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold">CSV প্রিভিউ</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {bn(analysis.detected)}টি সারি পাওয়া গেছে · {bn(analysis.validCount)}টি নতুন ·{" "}
                {bn(analysis.duplicateCount)}টি ডুপ্লিকেট · {bn(analysis.invalidCount)}টি অবৈধ
              </p>
              {analysis.unmappedHeaders.length ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  বাদ দেওয়া কলাম: {analysis.unmappedHeaders.join(", ")}
                </p>
              ) : null}
            </div>
            <button
              onClick={() => {
                setAnalysis(null);
                setCsvText(null);
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="ইম্পোর্ট বাতিল করুন"
            >
              <X className="size-5" />
            </button>
          </div>
          {analysis.sample.length ? (
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {analysis.sample.map((row, index) => (
                <li key={`${row.login_number}-${index}`}>
                  {row.name} · {row.login_number} · {segmentLabel(row.class_segment, "en")}
                  {row.account_role === "captain" ? " · ক্যাপ্টেন" : ""}
                </li>
              ))}
            </ul>
          ) : null}
          {analysis.invalid.length ? (
            <ul className="mt-3 space-y-1 text-xs text-destructive">
              {analysis.invalid.slice(0, 5).map((row, index) => (
                <li key={`invalid-${index}`}>
                  লাইন {bn(row.line)}: {row.name || "(নাম নেই)"} — {row.issue}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => confirmImport(false)}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              শুধু নতুনগুলো ইম্পোর্ট করুন
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || analysis.duplicateCount === 0}
              onClick={() => confirmImport(true)}
            >
              ইম্পোর্ট করুন ও ডুপ্লিকেট মার্জ করুন
            </Button>
          </div>
        </div>
      ) : null}

      <div className="card-panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম, লগইন নম্বর, স্টুডেন্ট আইডি বা TMS আইডি দিয়ে খুঁজুন"
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value as ClassSegment | "all")}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="ক্লাস ফিল্টার"
          >
            <option value="all">সব ক্লাস</option>
            {CLASS_SEGMENTS.map((segment) => (
              <option key={segment} value={segment}>
                {segmentLabel(segment, "bn")}
              </option>
            ))}
          </select>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length ? (
          <div className="sheet-scroll max-h-[65vh]">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="sticky top-0 bg-secondary text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">নাম</th>
                  <th className="px-3 py-2 text-left font-medium">ক্লাস</th>
                  <th className="px-3 py-2 text-left font-medium">লগইন নম্বর</th>
                  <th className="px-3 py-2 text-left font-medium">TMS আইডি</th>
                  <th className="px-3 py-2 text-left font-medium">ইমেইল</th>
                  <th className="px-3 py-2 text-left font-medium">সেটআপ</th>
                  <th className="px-3 py-2 text-left font-medium">রোল</th>
                  <th className="px-3 py-2 text-left font-medium">অবস্থা</th>
                  <th className="px-3 py-2 text-left font-medium">যোগ হয়েছে</th>
                  <th className="px-3 py-2 text-right font-medium">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((student) => (
                  <tr key={student.id} className="transition-colors hover:bg-secondary/50">
                    <td className="px-3 py-2 font-medium">{student.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold">
                      {segmentLabel(student.class_segment, "bn")}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{bn(student.login_number)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {(student.tms_transaction_ids ?? []).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{student.email ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {student.has_password ? (
                        <span className="text-emerald-600">সম্পন্ন</span>
                      ) : (
                        <span className="text-muted-foreground">বাকি</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {student.account_role === "captain" ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          ক্যাপ্টেন
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">শিক্ষার্থী</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {student.status === "inactive" ? (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          নিষ্ক্রিয়
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                          সক্রিয়
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {formatDateShortBn(student.created_at)}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setForm({
                            id: student.id,
                            name: student.name,
                            login_number: student.login_number ?? student.contact_number,
                            tms_transaction_ids: (student.tms_transaction_ids ?? []).join(", "),
                            class_segment: student.class_segment as ClassSegment,
                            student_code: student.student_code ?? "",
                            email: student.email ?? "",
                            account_role:
                              student.account_role === "captain" ? "captain" : "student",
                            status: student.status === "inactive" ? "inactive" : "active",
                          })
                        }
                      >
                        সম্পাদনা
                      </Button>
                      {student.status === "inactive" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReactivate(student.id)}
                        >
                          <RotateCcw className="size-4 text-emerald-600" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeactivate(student.id, student.name)}
                        >
                          <UserX className="size-4 text-destructive" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="কোনো শিক্ষার্থী পাওয়া যায়নি।"
            description="CSV ফাইল আপলোড করুন অথবা নিজে শিক্ষার্থী যোগ করুন।"
          />
        )}
      </div>

      {form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
          <div className="card-panel max-h-[90vh] w-full max-w-md overflow-y-auto p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">
                {form.id ? "শিক্ষার্থী সম্পাদনা করুন" : "শিক্ষার্থী যোগ করুন"}
              </h2>
              <button
                onClick={() => setForm(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="বন্ধ করুন"
              >
                <X className="size-5" />
              </button>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(form);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="s-name">নাম *</Label>
                <Input
                  id="s-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-login">লগইন নম্বর *</Label>
                <Input
                  id="s-login"
                  value={form.login_number}
                  onChange={(e) => setForm({ ...form, login_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-tms">TMS ট্রানজেকশন আইডি (ঐচ্ছিক; একাধিক হলে কমা দিয়ে)</Label>
                <Input
                  id="s-tms"
                  value={form.tms_transaction_ids}
                  onChange={(e) => setForm({ ...form, tms_transaction_ids: e.target.value })}
                  placeholder="TMS12345678, TMS87654321"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-class">ক্লাস *</Label>
                <select
                  id="s-class"
                  value={form.class_segment}
                  onChange={(e) =>
                    setForm({ ...form, class_segment: e.target.value as ClassSegment })
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  <option value="" disabled>
                    ক্লাস নির্বাচন করুন
                  </option>
                  {CLASS_SEGMENTS.map((segment) => (
                    <option key={segment} value={segment}>
                      {segmentLabel(segment, "bn")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="s-code">স্টুডেন্ট আইডি (প্রথমবার সেটআপে লাগবে)</Label>
                  <Input
                    id="s-code"
                    value={form.student_code}
                    onChange={(e) => setForm({ ...form, student_code: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-email">ইমেইল (ঐচ্ছিক)</Label>
                  <Input
                    id="s-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="s-role">রোল</Label>
                  <select
                    id="s-role"
                    value={form.account_role}
                    onChange={(e) =>
                      setForm({ ...form, account_role: e.target.value as "student" | "captain" })
                    }
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="student">শিক্ষার্থী</option>
                    <option value="captain">ক্যাপ্টেন</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-status">অবস্থা</Label>
                  <select
                    id="s-status"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as "active" | "inactive" })
                    }
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="active">সক্রিয়</option>
                    <option value="inactive">নিষ্ক্রিয়</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                  বাতিল
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  শিক্ষার্থী সংরক্ষণ করুন
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

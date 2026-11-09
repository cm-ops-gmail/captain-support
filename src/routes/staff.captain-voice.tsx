import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Download,
  Lightbulb,
  Loader2,
  Megaphone,
  MessageSquareHeart,
  Rocket,
  Save,
  Search,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { CaptainStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  exportCaptainSubmissionsCsv,
  staffCaptainSubmissions,
  staffReviewSubmission,
  type CaptainVoiceFilters,
} from "@/lib/captain.functions";
import { CLASS_SEGMENTS, segmentLabel } from "@/lib/class-segments";
import { useLanguage } from "@/lib/language-context";
import {
  CAPTAIN_KINDS,
  CAPTAIN_STATUSES,
  bn,
  downloadCsv,
  formatDate,
  formatDateBn,
  labelCaptainArea,
  labelCaptainKind,
  labelCaptainStatus,
  type CaptainKind,
} from "@/lib/support-constants";

export const Route = createFileRoute("/staff/captain-voice")({
  head: () => ({ meta: [{ title: "Captain Voice — Cap10 Support" }] }),
  component: CaptainVoiceDesk,
});

const KIND_ICONS: Record<CaptainKind, ReactNode> = {
  improvement: <Lightbulb className="size-4" />,
  experience: <MessageSquareHeart className="size-4" />,
  proposal: <Rocket className="size-4" />,
};

type Submission = Awaited<ReturnType<typeof staffCaptainSubmissions>>[number];

function CaptainVoiceDesk() {
  const { language, t } = useLanguage();
  const fetchList = useServerFn(staffCaptainSubmissions);
  const exportCsv = useServerFn(exportCaptainSubmissionsCsv);
  const [filters, setFilters] = useState<CaptainVoiceFilters>({
    segment: "all",
    kind: "all",
    status: "all",
    search: "",
  });
  const [selected, setSelected] = useState<Submission | null>(null);
  const [exporting, setExporting] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["staff-captain-voice", filters],
    queryFn: () => fetchList({ data: filters }),
  });

  const n = (value: number) => (language === "bn" ? bn(value) : String(value));
  const date = (value: string) => (language === "bn" ? formatDateBn(value) : formatDate(value));
  const countKind = (kind: CaptainKind) => (data ?? []).filter((row) => row.kind === kind).length;

  async function handleExport() {
    setExporting(true);
    try {
      downloadCsv(
        `captain-voice-${new Date().toISOString().slice(0, 10)}.csv`,
        await exportCsv({ data: filters }),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("এক্সপোর্ট ব্যর্থ হয়েছে।", "Export failed."),
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("ক্যাপ্টেন ভয়েস", "Captain Voice")}
        description={t(
          "ক্লাস ক্যাপ্টেনদের উন্নতির পরামর্শ, অভিজ্ঞতা ও পরিকল্পনা — পর্যালোচনা করে অবস্থা ও উত্তর জানান।",
          "Improvement pointers, experiences and proposals from class captains — review them and reply.",
        )}
        action={
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {t("সিএসভি ডাউনলোড", "Download CSV")}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {CAPTAIN_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() =>
              setFilters((prev) => ({ ...prev, kind: prev.kind === kind ? "all" : kind }))
            }
            aria-pressed={filters.kind === kind}
            className={`card-panel flex items-center justify-between gap-3 p-4 text-left transition-colors ${filters.kind === kind ? "ring-2 ring-[#8B1E2D]" : "hover:bg-secondary/50"}`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {KIND_ICONS[kind]}
              </span>
              {labelCaptainKind(kind, language)}
            </span>
            <span className="font-display text-xl font-bold tabular-nums">
              {n(countKind(kind))}
            </span>
          </button>
        ))}
      </div>

      <div className="card-panel grid gap-3 p-4 lg:grid-cols-4">
        <div className="flex items-center gap-2 rounded-md border border-input px-3 lg:col-span-2">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={filters.search ?? ""}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder={t(
              "শিরোনাম, বিবরণ বা ক্যাপ্টেনের নাম খুঁজুন",
              "Search title, details or captain name",
            )}
            className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <Select
          value={filters.segment ?? "all"}
          onValueChange={(v) => setFilters({ ...filters, segment: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("সব ক্লাস", "All classes")}</SelectItem>
            {CLASS_SEGMENTS.map((segment) => (
              <SelectItem key={segment} value={segment}>
                {segmentLabel(segment, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => setFilters({ ...filters, status: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("সব অবস্থা", "All statuses")}</SelectItem>
            {CAPTAIN_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {labelCaptainStatus(status, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.length ? (
        <ul className="card-panel divide-y divide-border">
          {data.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setSelected(row)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {KIND_ICONS[row.kind as CaptainKind] ?? <Megaphone className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{row.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {row.submission_number} · {segmentLabel(row.class_segment, language)} ·{" "}
                    {row.students?.name ?? "—"} · {labelCaptainArea(row.area, language)} ·{" "}
                    {date(row.created_at)}
                  </span>
                </span>
                <CaptainStatusBadge status={row.status} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Megaphone className="size-5" />}
          title={t("কোনো জমা পাওয়া যায়নি।", "No submissions match these filters.")}
        />
      )}

      {selected ? <ReviewDrawer submission={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function ReviewDrawer({ submission, onClose }: { submission: Submission; onClose: () => void }) {
  const { language, t } = useLanguage();
  const review = useServerFn(staffReviewSubmission);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(submission.status);
  const [note, setNote] = useState(submission.staff_note ?? "");
  const date = (value: string) => (language === "bn" ? formatDateBn(value) : formatDate(value));

  const mutation = useMutation({
    mutationFn: () => review({ data: { id: submission.id, status, staff_note: note } }),
    onSuccess: () => {
      toast.success(
        t(
          "আপডেট হয়েছে। ক্যাপ্টেন নতুন অবস্থা দেখতে পাবে।",
          "Updated. The captain will see the new status.",
        ),
      );
      void queryClient.invalidateQueries({ queryKey: ["staff-captain-voice"] });
      void queryClient.invalidateQueries({ queryKey: ["staff-overview"] });
      onClose();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : t("আপডেট করা যায়নি।", "Could not update.")),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/30 backdrop-blur-sm">
      <button
        className="flex-1"
        aria-label={t("প্যানেল বন্ধ করুন", "Close panel")}
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-surface shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <h2 className="font-display text-sm font-semibold">{submission.submission_number}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label={t("বন্ধ", "Close")}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-5 p-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-semibold">{submission.title}</h3>
              <CaptainStatusBadge status={submission.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {labelCaptainKind(submission.kind, language)} ·{" "}
              {labelCaptainArea(submission.area, language)} · {date(submission.created_at)}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-3 text-sm">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("ক্যাপ্টেন", "Captain")}
            </p>
            <p className="mt-1 font-medium">{submission.students?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {segmentLabel(submission.class_segment, language)} ·{" "}
              {submission.students?.login_number ?? "—"}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("বিস্তারিত", "Details")}
            </p>
            <p className="text-sm whitespace-pre-wrap">{submission.body}</p>
          </div>
          {submission.expected_benefit ? (
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("প্রত্যাশিত উপকার", "Expected benefit")}
              </p>
              <p className="text-sm whitespace-pre-wrap">{submission.expected_benefit}</p>
            </div>
          ) : null}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="space-y-1.5">
              <Label>{t("অবস্থা", "Status")}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAPTAIN_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {labelCaptainStatus(item, language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("ক্যাপ্টেনের জন্য উত্তর / নোট", "Reply / note to the captain")}</Label>
              <Textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
                placeholder={t("ক্যাপ্টেন এই নোটটি দেখতে পাবে।", "The captain will see this note.")}
              />
            </div>
            {submission.reviewed_by ? (
              <p className="text-xs text-muted-foreground">
                {t("সর্বশেষ পর্যালোচনা", "Last reviewed by")} {submission.reviewed_by}
                {submission.reviewed_at ? ` · ${date(submission.reviewed_at)}` : ""}
              </p>
            ) : null}
            <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {t("সেভ করুন", "Save")}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Download,
  Folder,
  FolderOpen,
  Flag,
  Loader2,
  Paperclip,
  Save,
  School,
  Search,
  Send,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { useLanguage } from "@/lib/language-context";
import { AttachmentList } from "@/components/AttachmentList";
import { EmptyState } from "@/components/EmptyState";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
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
  exportTicketsCsv,
  staffAddMessage,
  staffTicketDetail,
  staffTickets,
  staffUpdateTicket,
  type StaffTicketFilters,
} from "@/lib/staff.functions";
import {
  CATEGORIES,
  PLATFORMS,
  STATUSES,
  bn,
  formatDate,
  formatDateShort,
  labelPriority,
  STATUS_STYLES,
  downloadCsv,
  formatDateBn,
  formatDateShortBn,
  labelCategory,
  labelPlatform,
  labelStatus,
  labelSubType,
} from "@/lib/support-constants";
import {
  CLASS_SEGMENTS,
  isClassSegment,
  segmentLabel,
  type ClassSegment,
} from "@/lib/class-segments";

type DeskSearch = { segment?: ClassSegment; ticket?: string };

export const Route = createFileRoute("/staff/tickets")({
  // ?segment=hsc_28 pre-filters a class; ?ticket=<id> opens that ticket's panel
  // (used by the class dashboards to deep-link into the desk).
  validateSearch: (search: Record<string, unknown>): DeskSearch => {
    const result: DeskSearch = {};
    if (isClassSegment(search["segment"])) result.segment = search["segment"];
    if (typeof search["ticket"] === "string") result.ticket = search["ticket"];
    return result;
  },
  head: () => ({
    meta: [
      { title: "Issue Desk — Cap10 Support" },
      {
        name: "description",
        content: "Manage, filter, respond to and resolve student issues across all classes.",
      },
    ],
  }),
  component: TicketWorkspace,
});

function TicketWorkspace() {
  const { language, t } = useLanguage();
  const fetchTickets = useServerFn(staffTickets);
  const exportCsv = useServerFn(exportTicketsCsv);
  const search = Route.useSearch();
  const [filters, setFilters] = useState<StaffTicketFilters>({
    search: "",
    status: "all",
    category: "all",
    segment: search.segment ?? "all",
    platform: "all",
    priority: "all",
    range: "all",
  });
  const [selected, setSelected] = useState<string | null>(search.ticket ?? null);
  const [queue, setQueue] = useState<"all" | "important" | "normal">("all");
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-tickets", filters],
    queryFn: () => fetchTickets({ data: filters }),
  });

  const visibleTickets = (data ?? []).filter(
    (ticket) =>
      queue === "all" ||
      (queue === "important"
        ? ticket.priority === "urgent" || ticket.priority === "high"
        : ticket.priority === "normal"),
  );

  const queueCount = (kind: "all" | "important" | "normal") =>
    kind === "all"
      ? (data?.length ?? 0)
      : (data ?? []).filter((ticket) =>
          kind === "important"
            ? ticket.priority === "urgent" || ticket.priority === "high"
            : ticket.priority === "normal",
        ).length;

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportCsv({ data: filters });
      downloadCsv(`issue-desk-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      toast.success(t("সিএসভি ডাউনলোড হয়েছে।", "CSV downloaded."));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("এক্সপোর্ট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।", "Export failed. Please try again."),
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Issue Desk"
        description={t(
          `বর্তমান ফিল্টারে ${bn(data?.length ?? 0)}টি সমস্যা মিলেছে। গুরুত্বপূর্ণ সমস্যাগুলো উপরে দেখানো হচ্ছে।`,
          `${data?.length ?? 0} tickets match your filters. High-priority issues appear first.`,
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

      <div
        className="mb-4 flex flex-wrap items-center gap-1.5"
        role="tablist"
        aria-label={t("ক্লাস", "Class")}
      >
        <School className="mr-1 size-4 text-primary" />
        {(["all", ...CLASS_SEGMENTS] as const).map((segment) => {
          const active = (filters.segment ?? "all") === segment;
          return (
            <button
              key={segment}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setFilters((prev) => ({ ...prev, segment }));
                setSelected(null);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "border-[#8B1E2D] bg-[#8B1E2D] text-white" : "border-border bg-surface hover:bg-secondary"}`}
            >
              {segment === "all" ? t("সব ক্লাস", "All classes") : segmentLabel(segment, language)}
            </button>
          );
        })}
      </div>

      <section
        className="mb-4 space-y-3"
        aria-label={t("বিভাগভিত্তিক ফোল্ডার", "Category folders")}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FolderOpen className="size-4 text-primary" />
          {t("বিভাগভিত্তিক ফোল্ডার", "Category folders")}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {["all", ...CATEGORIES].map((category) => {
            const active = (filters.category ?? "all") === category;
            const count =
              category === "all"
                ? (data?.length ?? 0)
                : (data ?? []).filter((ticket) => ticket.category === category).length;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, category }));
                  setSelected(null);
                }}
                aria-pressed={active}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:bg-secondary/60"}`}
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  {active ? (
                    <FolderOpen className="size-4 shrink-0" />
                  ) : (
                    <Folder className="size-4 shrink-0" />
                  )}
                  <span className="truncate">
                    {category === "all"
                      ? t("সব সমস্যা", "All issues")
                      : labelCategory(category, language)}
                  </span>
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-foreground">
                  {category === "all" ? count : active ? count : "—"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2" aria-label={t("প্রায়োরিটি কিউ", "Priority queues")}>
          {(["all", "important", "normal"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setQueue(kind)}
              aria-pressed={queue === kind}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${queue === kind ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface hover:bg-secondary"}`}
            >
              <Flag className="size-3.5" />
              {kind === "all"
                ? t("সব কিউ", "All queues")
                : kind === "important"
                  ? t("গুরুত্বপূর্ণ (High + Urgent)", "Important (High + Urgent)")
                  : t("সাধারণ (Normal)", "Normal")}
              <span className="opacity-75">{queueCount(kind)}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="card-panel mb-4 grid gap-3 p-4 lg:grid-cols-5">
        <div className="flex items-center gap-2 rounded-md border border-input px-3 lg:col-span-2">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={filters.search ?? ""}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder={t(
              "টিকেট, শিক্ষার্থী, যোগাযোগ বা কীওয়ার্ড খুঁজুন",
              "Search tickets, students, contacts or keywords",
            )}
            className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => setFilters({ ...filters, status: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("সব স্ট্যাটাস", "All statuses")}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {labelStatus(s, false, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.category ?? "all"}
          onValueChange={(v) => setFilters({ ...filters, category: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("সব বিভাগ", "All categories")}</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {labelCategory(c, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.priority ?? "all"}
          onValueChange={(v) => setFilters({ ...filters, priority: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("সব প্রায়োরিটি", "All priorities")}</SelectItem>
            <SelectItem value="urgent">{t("অতি জরুরি", "Urgent")}</SelectItem>
            <SelectItem value="high">{t("গুরুত্বপূর্ণ", "High")}</SelectItem>
            <SelectItem value="normal">{t("সাধারণ", "Normal")}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.range ?? "all"}
          onValueChange={(v) =>
            setFilters({ ...filters, range: v as NonNullable<StaffTicketFilters["range"]> })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("সব সময়", "All time")}</SelectItem>
            <SelectItem value="today">{t("আজ", "Today")}</SelectItem>
            <SelectItem value="yesterday">{t("গতকাল", "Yesterday")}</SelectItem>
            <SelectItem value="7d">{t("গত ৭ দিন", "Last 7 days")}</SelectItem>
            <SelectItem value="30d">{t("গত ৩০ দিন", "Last 30 days")}</SelectItem>
            <SelectItem value="custom">{t("কাস্টম রেঞ্জ", "Custom range")}</SelectItem>
          </SelectContent>
        </Select>
        {filters.range === "custom" ? (
          <div className="flex items-center gap-2 lg:col-span-2">
            <Input
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
            <span className="text-xs text-muted-foreground">{t("থেকে", "to")}</span>
            <Input
              type="date"
              value={filters.to ?? ""}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </div>
        ) : null}
        <Select
          value={filters.platform ?? "all"}
          onValueChange={(v) => setFilters({ ...filters, platform: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("সব প্ল্যাটফর্ম", "All platforms")}</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>
                {labelPlatform(p, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="card-panel overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : visibleTickets.length ? (
          <div className="sheet-scroll max-h-[70vh]">
            <table className="w-full min-w-[1350px] text-sm">
              <thead className="sticky top-0 z-10 bg-secondary text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t("টিকেট", "Ticket")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("ক্লাস", "Class")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("শিক্ষার্থী", "Student")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("যোগাযোগ", "Contact")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("বিভাগ", "Category")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("সমস্যা", "Issue")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("তারিখ", "Date")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("স্ট্যাটাস", "Status")}</th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("প্রায়োরিটি", "Priority")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">{t("উত্তর", "Response")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => setSelected(ticket.id)}
                    className="cursor-pointer transition-colors hover:bg-secondary/60"
                  >
                    <td className="px-3 py-2 font-medium whitespace-nowrap text-primary">
                      {ticket.ticket_number}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold">
                      {segmentLabel(ticket.class_segment, language)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {ticket.students?.name ?? "—"}
                      {ticket.source_role === "captain" ? (
                        <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {t("ক্যাপ্টেন", "Captain")}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {ticket.students?.contact_number ?? "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {labelCategory(ticket.category, language)}
                      <span className="block text-xs text-muted-foreground">
                        {[
                          ticket.sub_type ? labelSubType(ticket.sub_type, language) : null,
                          ticket.platform ? labelPlatform(ticket.platform, language) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </td>
                    <td className="max-w-[280px] px-3 py-2">
                      <span className="line-clamp-1">{ticket.title}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {language === "bn"
                        ? formatDateShortBn(ticket.created_at)
                        : formatDateShort(ticket.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      {language === "bn" ? (
                        <StatusBadge status={ticket.status} short />
                      ) : (
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[ticket.status] ?? ""}`}
                        >
                          {labelStatus(ticket.status, true, "en")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {language === "bn" ? (
                        <PriorityBadge priority={ticket.priority} />
                      ) : (
                        <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs font-medium">
                          {labelPriority(ticket.priority, "en")}
                        </span>
                      )}
                    </td>
                    <td className="max-w-[220px] px-3 py-2 text-muted-foreground">
                      <span className="line-clamp-1">
                        {ticket.official_response ?? t("এখনো কোনো উত্তর নেই", "No response yet")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Search className="size-5" />}
            title={t(
              "আপনার ফিল্টার অনুযায়ী কোনো সমস্যা পাওয়া যায়নি।",
              "No tickets match your filters.",
            )}
            description={t(
              "সার্চ মুছে ফেলুন বা তারিখের রেঞ্জ বাড়িয়ে দেখুন।",
              "Clear your search or expand the date range.",
            )}
          />
        )}
      </div>

      {selected ? <TicketDrawer id={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function TicketDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { language, t } = useLanguage();
  const fetchDetail = useServerFn(staffTicketDetail);
  const update = useServerFn(staffUpdateTicket);
  const addMessage = useServerFn(staffAddMessage);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["staff-ticket", id],
    queryFn: () => fetchDetail({ data: { id } }),
  });

  const [status, setStatus] = useState<string | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [internal, setInternal] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (sendResponse: boolean) =>
      update({
        data: {
          id,
          status: status ?? data?.ticket.status ?? "Open",
          priority: (priority ?? data?.ticket.priority ?? "normal") as "normal" | "high" | "urgent",
          response: response ?? data?.ticket.official_response ?? "",
          sendResponse,
        },
      }),
    onSuccess: () => {
      toast.success(t("টিকেট আপডেট হয়েছে।", "Ticket updated."));
      void queryClient.invalidateQueries({ queryKey: ["staff-ticket", id] });
      void queryClient.invalidateQueries({ queryKey: ["staff-tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["staff-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["staff-segment-dashboard"] });
      setPriority(null);
      setStatus(null);
      setResponse(null);
    },
    onError: (err) =>
      toast.error(
        err instanceof Error
          ? err.message
          : t("টিকেটটি আপডেট করা যায়নি।", "Could not update ticket."),
      ),
  });

  const messageMutation = useMutation({
    mutationFn: () => addMessage({ data: { ticketId: id, message: note, internal } }),
    onSuccess: () => {
      setNote("");
      toast.success(
        internal
          ? t("অভ্যন্তরীণ নোট সংরক্ষণ হয়েছে।", "Internal note saved.")
          : t("শিক্ষার্থীকে বার্তা পাঠানো হয়েছে।", "Message sent to student."),
      );
      void queryClient.invalidateQueries({ queryKey: ["staff-ticket", id] });
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : t("বার্তা পাঠানো যায়নি।", "Could not send message."),
      ),
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
          <h2 className="font-display text-sm font-semibold">
            {data?.ticket.ticket_number ?? t("টিকেট", "Ticket")}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {isLoading || !data ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 p-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">{data.ticket.title}</h3>
                <div className="flex shrink-0 items-center gap-1.5">
                  {language === "bn" ? (
                    <PriorityBadge priority={data.ticket.priority} />
                  ) : (
                    <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs font-medium">
                      {labelPriority(data.ticket.priority, "en")}
                    </span>
                  )}
                  {language === "bn" ? (
                    <StatusBadge status={data.ticket.status} />
                  ) : (
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[data.ticket.status] ?? ""}`}
                    >
                      {labelStatus(data.ticket.status, false, "en")}
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {segmentLabel(data.ticket.class_segment, language)} ·{" "}
                {labelCategory(data.ticket.category, language)}
                {data.ticket.sub_type
                  ? ` · ${labelSubType(data.ticket.sub_type, language)}`
                  : ""} ·{" "}
                {language === "bn"
                  ? formatDateBn(data.ticket.created_at)
                  : formatDate(data.ticket.created_at)}
                {data.ticket.source_role === "captain"
                  ? ` · ${t("ক্যাপ্টেন থেকে জমা", "Submitted by captain")}`
                  : ""}
              </p>
              <p className="mt-3 text-sm whitespace-pre-wrap">{data.ticket.description}</p>
              {data.ticket.platform || data.ticket.app_version || data.ticket.page_or_feature ? (
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border border-border p-3 text-xs">
                  {data.ticket.platform ? (
                    <>
                      <dt className="text-muted-foreground">{t("প্ল্যাটফর্ম", "Platform")}</dt>
                      <dd>{labelPlatform(data.ticket.platform, language)}</dd>
                    </>
                  ) : null}
                  {data.ticket.app_version ? (
                    <>
                      <dt className="text-muted-foreground">{t("অ্যাপ ভার্সন", "App version")}</dt>
                      <dd>{data.ticket.app_version}</dd>
                    </>
                  ) : null}
                  {data.ticket.page_or_feature ? (
                    <>
                      <dt className="text-muted-foreground">
                        {t("পেজ / ফিচার", "Page / feature")}
                      </dt>
                      <dd>{data.ticket.page_or_feature}</dd>
                    </>
                  ) : null}
                </dl>
              ) : null}
            </div>

            <div className="rounded-lg bg-secondary/60 p-3 text-sm">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("শিক্ষার্থী", "Student")}
              </p>
              <p className="mt-1 font-medium">{data.ticket.students?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">
                {segmentLabel(data.ticket.students?.class_segment, language)} ·{" "}
                {data.ticket.students?.contact_number ?? "—"}
                {data.ticket.students?.student_code
                  ? ` · ${data.ticket.students.student_code}`
                  : ""}
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("স্ট্যাটাস", "Status")}</Label>
                <Select value={status ?? data.ticket.status} onValueChange={(v) => setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {labelStatus(s, false, language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("প্রায়োরিটি (শুধু স্টাফ)", "Priority (staff only)")}</Label>
                <Select value={priority ?? data.ticket.priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">{t("সাধারণ", "Normal")}</SelectItem>
                    <SelectItem value="high">{t("গুরুত্বপূর্ণ", "High")}</SelectItem>
                    <SelectItem value="urgent">{t("অতি জরুরি", "Urgent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("অফিশিয়াল উত্তর", "Official response to student")}</Label>
                <Textarea
                  rows={4}
                  value={response ?? data.ticket.official_response ?? ""}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder={t("Write an official response...", "Write an official response...")}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate(false)}
                >
                  <Save className="size-4" />
                  {t("সেভ", "Save")}
                </Button>
                <Button
                  size="sm"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate(true)}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {t("Save and send response", "Save and send response")}
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <Paperclip className="size-4" />
                {t("সংযুক্তি", "Attachments")}
              </p>
              <div className="rounded-lg border border-border">
                <AttachmentList attachments={data.attachments} />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("কথোপকথন", "Conversation")}
              </p>
              <div className="space-y-2">
                {data.messages.length ? (
                  data.messages.map((message) => (
                    <div
                      key={message.id}
                      className={
                        message.internal
                          ? "rounded-lg border border-dashed border-border bg-secondary/50 px-3 py-2"
                          : message.sender_type === "staff"
                            ? "ml-auto max-w-[90%] rounded-lg bg-primary/10 px-3 py-2"
                            : "max-w-[90%] rounded-lg bg-secondary px-3 py-2"
                      }
                    >
                      <p className="text-xs text-muted-foreground">
                        {message.internal
                          ? `${t("নোট", "Internal note")} · ${message.sender_name ?? t("সাপোর্ট", "Support")}`
                          : message.sender_type === "staff"
                            ? `${t("সাপোর্ট", "Support")} · ${message.sender_name ?? ""}`
                            : t("শিক্ষার্থী", "Student")}{" "}
                        ·{" "}
                        {language === "bn"
                          ? formatDateBn(message.created_at)
                          : formatDate(message.created_at)}
                      </p>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{message.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("এখনো কোনো বার্তা নেই।", "No messages yet.")}
                  </p>
                )}
              </div>
              <Textarea
                className="mt-3"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t(
                  "একটি বার্তা বা অভ্যন্তরীণ নোট লিখুন...",
                  "Write a message or internal note...",
                )}
              />
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={internal}
                    onChange={(e) => setInternal(e.target.checked)}
                  />
                  {t("নোট", "Internal note")}
                </label>
                <Button
                  size="sm"
                  disabled={messageMutation.isPending || note.trim().length < 2}
                  onClick={() => messageMutation.mutate()}
                >
                  {messageMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {t("Send", "Send")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

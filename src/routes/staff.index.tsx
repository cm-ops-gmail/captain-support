import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Inbox, Loader2, Megaphone, MessageSquareWarning, Users } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { SegmentCard } from "@/components/SegmentCard";
import { StatCard } from "@/components/StatCard";
import { segmentLabel } from "@/lib/class-segments";
import { useLanguage } from "@/lib/language-context";
import { staffOverview } from "@/lib/staff.functions";
import {
  STATUSES,
  bn,
  formatDateShortBn,
  labelCategory,
  labelStatus,
} from "@/lib/support-constants";

export const Route = createFileRoute("/staff/")({
  head: () => ({
    meta: [
      { title: "Overview — Cap10 Support" },
      { name: "description", content: "Class-wise issue overview for Class 6 to HSC 28." },
    ],
  }),
  component: StaffOverview,
});

const statusStyles: Record<string, string> = {
  Open: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
  "In Progress":
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  Resolved:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  Closed:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
};

function StaffOverview() {
  const { language, t } = useLanguage();
  const fetchOverview = useServerFn(staffOverview);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["staff-overview"],
    queryFn: () => fetchOverview(),
  });

  const formatCount = (value: number) => (language === "bn" ? bn(value) : String(value));
  const categoryLabel = (category: string) => labelCategory(category, language);
  const statusLabel = (status: string, short = false) => labelStatus(status, short, language);
  const formatDate = (value: string) => {
    if (language === "bn") return formatDateShortBn(value);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : new Intl.DateTimeFormat("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "Asia/Dhaka",
        }).format(parsed);
  };

  const statusPill = (status: string, short = false) => (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status] ?? "border-border bg-secondary text-foreground"}`}
    >
      {statusLabel(status, short)}
    </span>
  );

  if (isLoading) {
    return (
      <div
        className="flex justify-center py-20"
        role="status"
        aria-label={t("লোড হচ্ছে", "Loading")}
      >
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card-panel p-6">
        <h1 className="text-lg font-semibold">
          {t("ড্যাশবোর্ড লোড করা যায়নি", "Could not load the dashboard")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("আবার চেষ্টা করুন।", "Please try again.")}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("আবার চেষ্টা করুন", "Retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("ওভারভিউ", "Overview")}
        description={t(
          "ক্লাস ৬ থেকে এইচএসসি ২৮ — সব ক্লাসের রিপোর্ট করা সমস্যার সারসংক্ষেপ।",
          "Issues reported across every class, from Class 6 to HSC 28.",
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label={t("মোট সমস্যা", "Total Tickets")}
          value={formatCount(data?.total ?? 0)}
          icon={<Inbox className="size-5" />}
        />
        <StatCard
          label={t("আজ রিপোর্ট হয়েছে", "Reported Today")}
          value={formatCount(data?.today ?? 0)}
          tone="review"
          icon={<Clock className="size-5" />}
        />
        <StatCard
          label={t("উত্তরের অপেক্ষায়", "Awaiting Response")}
          value={formatCount(data?.awaitingResponse ?? 0)}
          tone="waiting"
          icon={<MessageSquareWarning className="size-5" />}
        />
        <StatCard
          label={t("সক্রিয় শিক্ষার্থী", "Active Students")}
          value={formatCount(data?.students ?? 0)}
          icon={<Users className="size-5" />}
        />
        <Link to="/staff/captain-voice" className="block">
          <StatCard
            label={t("নতুন ক্যাপ্টেন ভয়েস", "New Captain Voice")}
            value={formatCount(data?.captainVoiceNew ?? 0)}
            tone="open"
            icon={<Megaphone className="size-5" />}
          />
        </Link>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-semibold">
            {t("ক্লাসভিত্তিক সমস্যা", "Issues by Class")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t(
              "যেকোনো ক্লাসে ক্লিক করে বিস্তারিত ড্যাশবোর্ড দেখুন।",
              "Click a class to open its detailed dashboard.",
            )}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(data?.segments ?? []).map((summary) => (
            <SegmentCard key={summary.segment} summary={summary} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section className="card-panel overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">
              {t("স্ট্যাটাস অনুযায়ী সমস্যা", "Tickets by Status")}
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {STATUSES.map((status) => (
              <li key={status} className="flex items-center justify-between gap-3 px-5 py-3">
                {statusPill(status)}
                <span className="font-display text-sm font-semibold tabular-nums">
                  {formatCount(data?.byStatus[status] ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card-panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">
              {t("সাম্প্রতিক কার্যক্রম", "Recent Activity")}
            </h2>
            <Link
              to="/staff/tickets"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Issue Desk
            </Link>
          </div>
          {data?.recent.length ? (
            <ul className="divide-y divide-border">
              {data.recent.map((ticket) => (
                <li key={ticket.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    {/* User-entered titles are preserved in their original language. */}
                    <p className="truncate text-sm font-medium">{ticket.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ticket.ticket_number} · {segmentLabel(ticket.class_segment, language)} ·{" "}
                      {categoryLabel(ticket.category)} · {formatDate(ticket.updated_at)}
                    </p>
                  </div>
                  {statusPill(ticket.status, true)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              {t("এখনো কিছু রিপোর্ট হয়নি।", "No recent activity yet.")}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

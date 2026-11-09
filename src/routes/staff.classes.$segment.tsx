import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  ExternalLink,
  Inbox,
  Loader2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  CLASS_SEGMENTS,
  isClassSegment,
  segmentLabel,
  type ClassSegment,
} from "@/lib/class-segments";
import { useLanguage } from "@/lib/language-context";
import { staffSegmentDashboard } from "@/lib/staff.functions";
import {
  bn,
  formatDateShort,
  formatDateShortBn,
  labelCategory,
  labelPlatform,
  labelStatus,
  labelSubType,
} from "@/lib/support-constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/classes/$segment")({
  beforeLoad: ({ params }) => {
    if (!isClassSegment(params.segment)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [{ title: `${segmentLabel(params.segment, "en")} Dashboard — Cap10 Support` }],
  }),
  component: SegmentDashboard,
});

// Validated with the dataviz palette checker (light surface): CVD ΔE 25, normal ΔE 28.
// "Resolved" is also dashed so the two series never rely on colour alone.
const TREND_COLORS = { created: "#274fe3", resolved: "#0e7b4f" };

const STATUS_BAR: Record<string, string> = {
  Open: "bg-status-open",
  "In Progress": "bg-status-review",
  Resolved: "bg-status-resolved",
  Closed: "bg-status-closed",
};

/** Horizontal labelled bars — one hue, value shown as text, native tooltip on hover. */
function BarList({
  rows,
  label,
  colorFor,
  format,
}: {
  rows: { key: string; value: number }[];
  label: (key: string) => string;
  colorFor?: (key: string) => string;
  format: (value: number) => string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const pct = total ? Math.round((row.value / total) * 100) : 0;
        return (
          <li key={row.key} title={`${label(row.key)}: ${row.value} (${pct}%)`} className="group">
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-foreground">{label(row.key)}</span>
              <span className="tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{format(row.value)}</span> ·{" "}
                {format(pct)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full transition-opacity group-hover:opacity-80",
                  colorFor?.(row.key) ?? "bg-primary",
                )}
                style={{ width: `${(row.value / max) * 100}%`, minWidth: row.value ? 4 : 0 }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SegmentDashboard() {
  const { segment } = Route.useParams() as { segment: ClassSegment };
  const { language, t } = useLanguage();
  const fetchDashboard = useServerFn(staffSegmentDashboard);
  const [showTable, setShowTable] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["staff-segment-dashboard", segment],
    queryFn: () => fetchDashboard({ data: { segment } }),
  });

  const n = (value: number) => (language === "bn" ? bn(value) : String(value));
  const shortDate = (value: string) =>
    language === "bn" ? formatDateShortBn(value) : formatDateShort(value);
  const dayLabel = (day: string) =>
    new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en-GB", {
      day: "numeric",
      month: "short",
    }).format(new Date(`${day}T00:00:00+06:00`));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/staff/classes">
            <ArrowLeft className="size-4" />
            {t("সব ক্লাস", "All classes")}
          </Link>
        </Button>
        {/* Segment switcher */}
        <div
          className="flex flex-wrap gap-1 rounded-xl border border-border bg-background p-1"
          role="tablist"
        >
          {CLASS_SEGMENTS.map((item) => (
            <Link
              key={item}
              to="/staff/classes/$segment"
              params={{ segment: item }}
              role="tab"
              aria-selected={item === segment}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                item === segment
                  ? "bg-[#8B1E2D] text-white"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {segmentLabel(item, language)}
            </Link>
          ))}
        </div>
      </div>

      <PageHeader
        title={`${segmentLabel(segment, language)} — ${t("সমস্যা ড্যাশবোর্ড", "Issue Dashboard")}`}
        description={t(
          "এই ক্লাসের শিক্ষার্থীদের রিপোর্ট করা অ্যাপ, ওয়েবসাইট, প্রোডাক্ট ও অভিজ্ঞতা সংক্রান্ত সমস্যা।",
          "App, Website, Product and experience issues reported by students of this class.",
        )}
        action={
          <Button variant="outline" asChild>
            <Link to="/staff/tickets" search={{ segment }}>
              <ExternalLink className="size-4" />
              {t("Issue Desk-এ খুলুন", "Open in Issue Desk")}
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError || !data ? (
        <EmptyState title={t("ড্যাশবোর্ড লোড করা যায়নি।", "Could not load this dashboard.")} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label={t("মোট সমস্যা", "Total issues")}
              value={n(data.total)}
              icon={<Inbox className="size-5" />}
            />
            <StatCard
              label={t("অমীমাংসিত", "Unresolved")}
              value={n(data.unresolved)}
              tone="open"
              icon={<Clock className="size-5" />}
            />
            <StatCard
              label={t("জরুরি (খোলা)", "Urgent (open)")}
              value={n(data.urgent)}
              tone="waiting"
              icon={<AlertTriangle className="size-5" />}
            />
            <StatCard
              label={t("গড় সমাধানের সময়", "Avg. resolution time")}
              value={
                data.avgResolutionHours === null
                  ? "—"
                  : `${n(data.avgResolutionHours)} ${t("ঘণ্টা", "h")}`
              }
              tone="resolved"
              icon={<Clock className="size-5" />}
            />
            <StatCard
              label={t("শিক্ষার্থী / ক্যাপ্টেন", "Students / Captains")}
              value={`${n(data.students)} / ${n(data.captains)}`}
              icon={
                data.captains ? <ShieldCheck className="size-5" /> : <Users className="size-5" />
              }
            />
          </div>

          <section className="card-panel p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">
                  {t("গত ১৪ দিনের প্রবণতা", "Last 14 days")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("প্রতিদিন নতুন ও সমাধান হওয়া সমস্যা", "Issues created vs. resolved per day")}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}>
                {showTable ? t("চার্ট দেখুন", "Show chart") : t("টেবিল দেখুন", "Show table")}
              </Button>
            </div>
            {showTable ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-1 text-left font-medium">{t("দিন", "Day")}</th>
                      <th className="py-1 text-right font-medium">{t("নতুন", "Created")}</th>
                      <th className="py-1 text-right font-medium">{t("সমাধান", "Resolved")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.trend.map((row) => (
                      <tr key={row.day}>
                        <td className="py-1">{dayLabel(row.day)}</td>
                        <td className="py-1 text-right tabular-nums">{n(row.created)}</td>
                        <td className="py-1 text-right tabular-nums">{n(row.resolved)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trend} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
                    <XAxis
                      dataKey="day"
                      tickFormatter={dayLabel}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      labelFormatter={(value) => dayLabel(String(value))}
                      contentStyle={{ borderRadius: 8, fontSize: 12, borderColor: "var(--border)" }}
                      cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
                    />
                    <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="created"
                      name={t("নতুন", "Created")}
                      stroke={TREND_COLORS.created}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="resolved"
                      name={t("সমাধান", "Resolved")}
                      stroke={TREND_COLORS.resolved}
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="card-panel p-5">
              <h2 className="mb-4 text-sm font-semibold">{t("স্ট্যাটাস", "By status")}</h2>
              <BarList
                rows={data.byStatus}
                label={(key) => labelStatus(key, false, language)}
                colorFor={(key) => STATUS_BAR[key] ?? "bg-primary"}
                format={n}
              />
            </section>
            <section className="card-panel p-5">
              <h2 className="mb-4 text-sm font-semibold">{t("সমস্যার ধরন", "By category")}</h2>
              {data.byCategory.length ? (
                <BarList
                  rows={data.byCategory}
                  label={(key) => labelCategory(key, language)}
                  format={n}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("এখনো কোনো সমস্যা নেই।", "No issues yet.")}
                </p>
              )}
            </section>
            <section className="card-panel p-5">
              <h2 className="mb-4 text-sm font-semibold">{t("প্ল্যাটফর্ম", "By platform")}</h2>
              {data.byPlatform.length ? (
                <BarList
                  rows={data.byPlatform}
                  label={(key) =>
                    key === "unspecified"
                      ? t("উল্লেখ নেই", "Not specified")
                      : labelPlatform(key, language)
                  }
                  format={n}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("এখনো কোনো সমস্যা নেই।", "No issues yet.")}
                </p>
              )}
            </section>
          </div>

          <section className="card-panel overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold">{t("সাম্প্রতিক সমস্যা", "Latest issues")}</h2>
            </div>
            {data.latest.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">{t("টিকেট", "Ticket")}</th>
                      <th className="px-4 py-2 text-left font-medium">{t("শিরোনাম", "Title")}</th>
                      <th className="px-4 py-2 text-left font-medium">{t("ধরন", "Category")}</th>
                      <th className="px-4 py-2 text-left font-medium">
                        {t("প্ল্যাটফর্ম", "Platform")}
                      </th>
                      <th className="px-4 py-2 text-left font-medium">
                        {t("শিক্ষার্থী", "Student")}
                      </th>
                      <th className="px-4 py-2 text-left font-medium">{t("অবস্থা", "Status")}</th>
                      <th className="px-4 py-2 text-left font-medium">{t("তারিখ", "Date")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.latest.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-secondary/40">
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <Link
                            to="/staff/tickets"
                            search={{ segment, ticket: ticket.id }}
                            className="font-display font-semibold text-primary hover:underline"
                          >
                            {ticket.ticket_number}
                          </Link>
                        </td>
                        <td className="max-w-[280px] px-4 py-2.5">
                          <p className="truncate">{ticket.title}</p>
                          {ticket.priority !== "normal" ? (
                            <PriorityBadge priority={ticket.priority} />
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          {labelCategory(ticket.category, language)}
                          {ticket.sub_type ? (
                            <span className="block text-muted-foreground">
                              {labelSubType(ticket.sub_type, language)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          {labelPlatform(ticket.platform, language)}
                        </td>
                        <td className="px-4 py-2.5 text-xs">{ticket.students?.name ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={ticket.status} short />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                          {shortDate(ticket.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<Inbox className="size-5" />}
                title={t("এই ক্লাস থেকে এখনো কোনো সমস্যা আসেনি।", "No issues from this class yet.")}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

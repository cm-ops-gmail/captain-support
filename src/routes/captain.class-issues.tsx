import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, Inbox, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { captainClassIssues } from "@/lib/captain.functions";
import { segmentLabel } from "@/lib/class-segments";
import { useLanguage } from "@/lib/language-context";
import {
  CATEGORIES,
  bn,
  formatDateShort,
  formatDateShortBn,
  labelCategory,
  labelPlatform,
  labelSubType,
} from "@/lib/support-constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/captain/class-issues")({
  head: () => ({ meta: [{ title: "Class Issues — Cap10 Support" }] }),
  component: ClassIssues,
});

/** Read-only: captains see what their class is facing (no names or contacts). */
function ClassIssues() {
  const { language, t } = useLanguage();
  const fetchIssues = useServerFn(captainClassIssues);
  const { data, isLoading } = useQuery({
    queryKey: ["captain-class-issues"],
    queryFn: () => fetchIssues(),
  });
  const [category, setCategory] = useState<string>("all");
  const n = (value: number) => (language === "bn" ? bn(value) : String(value));
  const date = (value: string) =>
    language === "bn" ? formatDateShortBn(value) : formatDateShort(value);

  const rows = useMemo(
    () =>
      (data?.tickets ?? []).filter((ticket) => category === "all" || ticket.category === category),
    [data, category],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${t("ক্লাসের সমস্যা", "Class Issues")}${data ? ` — ${segmentLabel(data.segment, language)}` : ""}`}
        description={t(
          "তোমার ক্লাসের শিক্ষার্থীরা কী কী সমস্যা জানিয়েছে — প্যাটার্ন দেখে ক্যাপ্টেন ভয়েসে পরামর্শ দাও।",
          "What students in your class have reported — spot patterns and raise them through Captain Voice.",
        )}
      />
      {isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label={t("মোট", "Total")}
              value={n(data.stats.total)}
              icon={<Inbox className="size-5" />}
            />
            <StatCard
              label={t("চলমান", "Open")}
              value={n(data.stats.open)}
              tone="open"
              icon={<Clock className="size-5" />}
            />
            <StatCard
              label={t("সমাধান হয়েছে", "Resolved")}
              value={n(data.stats.resolved)}
              tone="resolved"
              icon={<CheckCircle2 className="size-5" />}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...CATEGORIES] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  category === item
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-secondary",
                )}
              >
                {item === "all" ? t("সব", "All") : labelCategory(item, language)}
              </button>
            ))}
          </div>
          {rows.length ? (
            <ul className="card-panel divide-y divide-border">
              {rows.map((ticket) => (
                <li key={ticket.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ticket.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.ticket_number} · {labelCategory(ticket.category, language)}
                      {ticket.sub_type ? ` · ${labelSubType(ticket.sub_type, language)}` : ""}
                      {ticket.platform
                        ? ` · ${labelPlatform(ticket.platform, language)}`
                        : ""} · {date(ticket.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={ticket.status} short />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t("এই ধরনের কোনো সমস্যা নেই।", "No issues in this category.")} />
          )}
        </>
      )}
    </div>
  );
}

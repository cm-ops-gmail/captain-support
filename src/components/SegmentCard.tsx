import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowUpRight, Users } from "lucide-react";

import { SEGMENT_ACCENTS, segmentLabel, type ClassSegment } from "@/lib/class-segments";
import { useLanguage } from "@/lib/language-context";
import { bn, labelCategory } from "@/lib/support-constants";
import { cn } from "@/lib/utils";

export type SegmentSummary = {
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

/** One class tile on the staff overview; links to that class's dashboard. */
export function SegmentCard({ summary }: { summary: SegmentSummary }) {
  const { language, t } = useLanguage();
  const n = (value: number) => (language === "bn" ? bn(value) : String(value));
  const done = summary.resolved + summary.closed;
  const resolvedPct = summary.total ? Math.round((done / summary.total) * 100) : 0;

  return (
    <Link
      to="/staff/classes/$segment"
      params={{ segment: summary.segment }}
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent p-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
        SEGMENT_ACCENTS[summary.segment],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-bold">
            {segmentLabel(summary.segment, language)}
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" />
            {n(summary.students)} {t("শিক্ষার্থী", "students")}
          </p>
        </div>
        <ArrowUpRight className="size-4 opacity-50 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-foreground">
        <div className="rounded-lg bg-background/70 py-2">
          <p className="font-display text-lg font-semibold text-status-open tabular-nums">
            {n(summary.open)}
          </p>
          <p className="text-[11px] text-muted-foreground">{t("খোলা", "Open")}</p>
        </div>
        <div className="rounded-lg bg-background/70 py-2">
          <p className="font-display text-lg font-semibold text-status-review tabular-nums">
            {n(summary.inProgress)}
          </p>
          <p className="text-[11px] text-muted-foreground">{t("কাজ চলছে", "In progress")}</p>
        </div>
        <div className="rounded-lg bg-background/70 py-2">
          <p className="font-display text-lg font-semibold text-status-resolved tabular-nums">
            {n(done)}
          </p>
          <p className="text-[11px] text-muted-foreground">{t("সমাধান", "Resolved")}</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>
            {n(summary.total)} {t("টি সমস্যা", "issues")} · {t("আজ", "today")} {n(summary.today)}
          </span>
          <span>{n(resolvedPct)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-background/80">
          <div
            className="h-full rounded-full bg-status-resolved"
            style={{ width: `${resolvedPct}%` }}
          />
        </div>
      </div>

      <div className="flex min-h-5 flex-wrap items-center gap-1.5 text-[11px] text-foreground">
        {summary.urgent > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 font-semibold text-white">
            <AlertTriangle className="size-3" />
            {n(summary.urgent)} {t("জরুরি", "urgent")}
          </span>
        ) : null}
        {summary.topCategories.map(([category, count]) => (
          <span key={category} className="rounded-full bg-background/80 px-2 py-0.5">
            {labelCategory(category, language)} · {n(count)}
          </span>
        ))}
      </div>
    </Link>
  );
}

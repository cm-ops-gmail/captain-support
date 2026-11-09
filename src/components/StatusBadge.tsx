import { useLanguage } from "@/lib/language-context";
import {
  CAPTAIN_STATUS_STYLES,
  STATUS_STYLES,
  labelCaptainStatus,
  labelPriority,
  labelStatus,
} from "@/lib/support-constants";
import { cn } from "@/lib/utils";

// Only presentation labels change; database status and priority values stay intact.
const EN_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  "in-progress": "In Progress",
  inprogress: "In Progress",
  review: "In Review",
  in_review: "In Review",
  under_review: "In Review",
  waiting: "Waiting",
  waiting_for_student: "Waiting for Student",
  waiting_for_staff: "Waiting for Support",
  pending: "Pending",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
};

const EN_PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  important: "Important",
  normal: "Normal",
  low: "Low",
};

function normalizedKey(value: string) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function StatusBadge({
  status,
  className,
  short,
}: {
  status: string;
  className?: string;
  short?: boolean;
}) {
  const { language } = useLanguage();
  const key = normalizedKey(status);
  const label =
    language === "en"
      ? (EN_STATUS_LABELS[key] ?? labelStatus(status, short))
      : labelStatus(status, short);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[status] ?? "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const { language } = useLanguage();
  const key = normalizedKey(priority);
  const styles: Record<string, string> = {
    urgent: "border-destructive/30 bg-destructive/15 text-destructive",
    high: "border-amber-500 bg-amber-400 text-amber-950 font-semibold",
    important: "border-amber-500 bg-amber-400 text-amber-950 font-semibold",
    normal: "border-status-open/30 bg-status-open/15 text-status-open",
    low: "border-border bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[key] ?? styles["normal"],
      )}
    >
      {language === "en"
        ? (EN_PRIORITY_LABELS[key] ?? labelPriority(priority))
        : labelPriority(priority)}
    </span>
  );
}

/** Status pill for Captain Voice submissions (New → Under Review → Planned → Implemented / Declined). */
export function CaptainStatusBadge({ status, className }: { status: string; className?: string }) {
  const { language } = useLanguage();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        CAPTAIN_STATUS_STYLES[status] ?? "border-border bg-secondary text-foreground",
        className,
      )}
    >
      {labelCaptainStatus(status, language)}
    </span>
  );
}

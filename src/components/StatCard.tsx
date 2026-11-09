import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "open" | "review" | "waiting" | "resolved" | "closed";
  hint?: string;
}) {
  const tones: Record<string, string> = {
    default: "text-primary bg-primary/10",
    open: "text-status-open bg-status-open/10",
    review: "text-status-review bg-status-review/10",
    waiting: "text-status-waiting bg-status-waiting/10",
    resolved: "text-status-resolved bg-status-resolved/10",
    closed: "text-status-closed bg-status-closed/10",
  };
  const accents: Record<string, string> = {
    default: "from-primary/10",
    open: "from-status-open/10",
    review: "from-status-review/10",
    waiting: "from-status-waiting/10",
    resolved: "from-status-resolved/10",
    closed: "from-status-closed/10",
  };
  return (
    <div className="card-panel group relative flex items-center gap-4 overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity group-hover:opacity-100",
          accents[tone],
        )}
      />
      {icon ? (
        <div
          className={cn(
            "relative flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
            tones[tone],
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className="relative min-w-0">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="font-display text-2xl font-semibold">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

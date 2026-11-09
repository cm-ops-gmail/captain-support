import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Loader2, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { PriorityBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/lib/language-context";
import { publishedNotices } from "@/lib/student.functions";
import { formatDateBn } from "@/lib/support-constants";

export const Route = createFileRoute("/student/notices")({
  head: () => ({ meta: [{ title: "Notices — Cap10 Support" }] }),
  component: NoticesPage,
});

const DAY_MS = 24 * 60 * 60 * 1000;

function isRecent(dateStr: string) {
  return Date.now() - new Date(dateStr).getTime() < 3 * DAY_MS;
}

function NoticesPage() {
  const { language, t } = useLanguage();
  const fetchNotices = useServerFn(publishedNotices);
  const { data, isLoading } = useQuery({
    queryKey: ["student-notices"],
    queryFn: () => fetchNotices(),
  });

  function formatNoticeDate(dateStr: string) {
    if (language === "bn") return formatDateBn(dateStr);
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t("নোটিশ বোর্ড", "Notice Board")}
        description={t(
          "সাপোর্ট টিমের সর্বশেষ ঘোষণা ও গুরুত্বপূর্ণ আপডেট এখানে দেখুন।",
          "Find the latest announcements and important updates from the support team here.",
        )}
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.length ? (
        <ul className="space-y-4">
          {data.map((notice, index) => {
            const recent = isRecent(notice.created_at);
            const featured = index === 0;
            const key = (notice.priority ?? "").toLowerCase();
            const isImportant = key === "important" || key === "high";
            const isUrgent = key === "urgent";
            const boxClass = isUrgent
              ? "border-red-800 bg-red-600 text-white shadow-md"
              : isImportant
                ? "border-amber-600 bg-amber-400 text-amber-950 shadow-md"
                : featured
                  ? "border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-sm"
                  : "border-border bg-card";

            return (
              <li
                key={notice.id}
                className={`group relative overflow-hidden rounded-2xl border p-5 transition-all hover:shadow-md ${boxClass}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${
                        isUrgent
                          ? "bg-red-800 text-white"
                          : isImportant
                            ? "bg-amber-600 text-amber-950"
                            : featured
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground/70"
                      }`}
                    >
                      <Bell className="size-4" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-base font-semibold">{notice.title}</h2>
                        {recent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                            <Sparkles className="size-3" />
                            {t("নতুন", "New")}
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={`mt-0.5 text-xs ${
                          isImportant || isUrgent ? "opacity-80" : "text-muted-foreground"
                        }`}
                      >
                        {formatNoticeDate(notice.created_at)}
                      </p>
                    </div>
                  </div>
                  <PriorityBadge priority={notice.priority} />
                </div>
                <p
                  className={`mt-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    isImportant || isUrgent ? "" : "text-foreground/85"
                  }`}
                >
                  {notice.content}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={<Bell className="size-5" />}
          title={t("নতুন কোনো নোটিশ নেই।", "No new notices.")}
          description={t("নতুন ঘোষণা এলে এখানে দেখানো হবে।", "New announcements will appear here.")}
        />
      )}
    </div>
  );
}

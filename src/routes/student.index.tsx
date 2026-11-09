import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  CheckCircle2,
  CreditCard,
  FilePlus2,
  Globe,
  Inbox,
  Loader2,
  MessageSquareHeart,
  PlayCircle,
  Smartphone,
  Sparkles,
  Ticket,
} from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { studentDashboard } from "@/lib/student.functions";
import { bn, formatDateShortBn, labelCategory, type Category } from "@/lib/support-constants";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Cap10 Support" },
      { name: "description", content: "Track your issues and 10MS notices for your class." },
    ],
  }),
  component: StudentHome,
});

const DAY_MS = 24 * 60 * 60 * 1000;

function isRecent(dateStr: string) {
  return Date.now() - new Date(dateStr).getTime() < 3 * DAY_MS;
}

function categoryLabel(category: string, language: "bn" | "en") {
  return labelCategory(category, language);
}

const QUICK_REPORTS: { category: Category; icon: ReactNode; bn: string; en: string }[] = [
  {
    category: "App",
    icon: <Smartphone className="size-5" />,
    bn: "অ্যাপে সমস্যা",
    en: "App problem",
  },
  {
    category: "Website",
    icon: <Globe className="size-5" />,
    bn: "ওয়েবসাইটে সমস্যা",
    en: "Website problem",
  },
  {
    category: "Live/Recorded Class",
    icon: <PlayCircle className="size-5" />,
    bn: "ক্লাস / ভিডিও",
    en: "Class / video",
  },
  {
    category: "Product/Course Content",
    icon: <Ticket className="size-5" />,
    bn: "কোর্স কনটেন্ট",
    en: "Course content",
  },
  {
    category: "Payment/Subscription",
    icon: <CreditCard className="size-5" />,
    bn: "পেমেন্ট",
    en: "Payment",
  },
  {
    category: "Experience/Feedback",
    icon: <MessageSquareHeart className="size-5" />,
    bn: "অভিজ্ঞতা জানাও",
    en: "Share experience",
  },
];

function displayNumber(value: number, language: "bn" | "en") {
  return language === "bn" ? bn(value) : String(value);
}

function displayDate(date: string, language: "bn" | "en") {
  if (language === "bn") return formatDateShortBn(date);
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
        parsed,
      );
}

function StudentHome() {
  const { language, t } = useLanguage();
  const fetchDashboard = useServerFn(studentDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("ড্যাশবোর্ড", "Dashboard")}
        description={t(
          "সমস্যা জানাও, টিকেট ফলো করো এবং আপডেট থাকো।",
          "Report an issue, track your tickets and stay updated.",
        )}
        action={
          <Button asChild>
            <Link to="/student/report">
              <FilePlus2 className="size-4" />
              {t("সমস্যা জানান", "Report an Issue")}
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div
          className="flex justify-center py-16"
          role="status"
          aria-label={t("লোড হচ্ছে", "Loading")}
        >
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label={t("আমার চলমান সমস্যা", "My Open Tickets")}
              value={displayNumber(data?.stats.open ?? 0, language)}
              tone="open"
              icon={<Inbox className="size-5" />}
            />
            <StatCard
              label={t("আমার সমাধান হওয়া সমস্যা", "My Resolved Tickets")}
              value={displayNumber(data?.stats.resolved ?? 0, language)}
              tone="resolved"
              icon={<CheckCircle2 className="size-5" />}
            />
            <StatCard
              label={t("মোট জমা দেওয়া", "Total Submitted")}
              value={displayNumber(data?.stats.total ?? 0, language)}
              icon={<Ticket className="size-5" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card-panel lg:order-1">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold">
                  {t("কী নিয়ে জানাতে চাও?", "What would you like to report?")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "অ্যাপ, ওয়েবসাইট, প্রোডাক্ট বা তোমার অভিজ্ঞতা — সরাসরি ১০ মিনিট স্কুলকে জানাও।",
                    "App, Website, Product or your experience — tell 10 Minute School directly.",
                  )}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                {QUICK_REPORTS.map((item) => (
                  <Link
                    key={item.category}
                    to="/student/report"
                    search={{ category: item.category }}
                    className="flex flex-col items-start gap-2 rounded-xl border border-border bg-background p-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {item.icon}
                    </span>
                    {language === "bn" ? item.bn : item.en}
                  </Link>
                ))}
              </div>
            </div>

            <div className="card-panel lg:order-3 lg:col-span-full">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold">{t("সাম্প্রতিক টিকেট", "Recent Tickets")}</h2>
                <Link to="/student/issues" className="text-xs font-medium text-primary">
                  {t("সব দেখুন", "View All")}
                </Link>
              </div>
              {data?.tickets.length ? (
                <ul className="divide-y divide-border">
                  {data.tickets.map((ticket) => (
                    <li key={ticket.id}>
                      <Link
                        to="/student/issues/$id"
                        params={{ id: ticket.id }}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {ticket.ticket_number} · {categoryLabel(ticket.category, language)} ·{" "}
                            {displayDate(ticket.created_at, language)}
                          </p>
                        </div>
                        <StatusBadge status={ticket.status} short />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<Inbox className="size-5" />}
                  title={t("এখনো কোনো সমস্যা জানানো হয়নি।", "No issues reported yet.")}
                  description={t(
                    "সমস্যা জানালে তার অবস্থাসহ এখানে দেখা যাবে।",
                    "Once you report an issue, you can track its status here.",
                  )}
                  action={
                    <Button asChild size="sm">
                      <Link to="/student/report">{t("সমস্যা জানান", "Report an Issue")}</Link>
                    </Button>
                  }
                />
              )}
            </div>

            <div className="card-panel overflow-hidden lg:order-2">
              <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Bell className="size-3.5" />
                  </span>
                  {t("নোটিশ বোর্ড", "Notice Board")}
                </h2>
                <Link to="/student/notices" className="text-xs font-medium text-primary">
                  {t("সব নোটিশ", "All Notices")}
                </Link>
              </div>
              {data?.notices.length ? (
                <ul className="divide-y divide-border">
                  {data.notices.map((notice, index) => {
                    const recent = isRecent(notice.created_at);
                    const key = (notice.priority ?? "").toLowerCase();
                    const isImportant = key === "important" || key === "high";
                    const isUrgent = key === "urgent";
                    return (
                      <li
                        key={notice.id}
                        className={
                          isUrgent
                            ? "border-l-4 border-red-800 bg-red-600 px-4 py-3 text-white"
                            : isImportant
                              ? "border-l-4 border-amber-600 bg-amber-400 px-4 py-3 text-amber-950"
                              : index === 0 && recent
                                ? "bg-primary/5 px-4 py-3"
                                : "px-4 py-3"
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold">{notice.title}</p>
                            {recent ? (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                                <Sparkles className="size-2.5" />
                                {t("নতুন", "New")}
                              </span>
                            ) : null}
                          </div>
                          <PriorityBadge priority={notice.priority} />
                        </div>
                        <p
                          className={`mt-1 line-clamp-2 text-xs ${
                            isImportant || isUrgent ? "opacity-90" : "text-muted-foreground"
                          }`}
                        >
                          {notice.content}
                        </p>
                        <p
                          className={`mt-1 text-xs ${
                            isImportant || isUrgent ? "opacity-75" : "text-muted-foreground/70"
                          }`}
                        >
                          {displayDate(notice.created_at, language)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState title={t("নতুন কোনো নোটিশ নেই।", "No new notices.")} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

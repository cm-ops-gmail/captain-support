import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Inbox, Loader2, Megaphone, MessageSquareReply } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { CaptainStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { myCaptainSubmissions } from "@/lib/captain.functions";
import { useLanguage } from "@/lib/language-context";
import {
  formatDateShort,
  formatDateShortBn,
  labelCaptainArea,
  labelCaptainKind,
} from "@/lib/support-constants";

export const Route = createFileRoute("/captain/submissions")({
  head: () => ({ meta: [{ title: "My Submissions — Cap10 Support" }] }),
  component: MySubmissions,
});

function MySubmissions() {
  const { language, t } = useLanguage();
  const fetchMine = useServerFn(myCaptainSubmissions);
  const { data, isLoading } = useQuery({
    queryKey: ["captain-submissions"],
    queryFn: () => fetchMine(),
  });
  const date = (value: string) =>
    language === "bn" ? formatDateShortBn(value) : formatDateShort(value);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("আমার জমা", "My Submissions")}
        description={t(
          "তোমার পাঠানো পরামর্শ, অভিজ্ঞতা ও পরিকল্পনা এবং ১০ মিনিট স্কুল টিমের উত্তর।",
          "Your improvement pointers, experiences and proposals, with the 10 Minute School team's response.",
        )}
        action={
          <Button asChild>
            <Link to="/captain">
              <Megaphone className="size-4" />
              {t("নতুন জমা", "New submission")}
            </Link>
          </Button>
        }
      />
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.length ? (
        <ul className="space-y-3">
          {data.map((row) => (
            <li key={row.id} className="card-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-display font-semibold text-foreground">
                      {row.submission_number}
                    </span>{" "}
                    · {labelCaptainKind(row.kind, language)} ·{" "}
                    {labelCaptainArea(row.area, language)} · {date(row.created_at)}
                  </p>
                  <h2 className="mt-1 font-semibold">{row.title}</h2>
                </div>
                <CaptainStatusBadge status={row.status} />
              </div>
              <p className="mt-2 line-clamp-3 text-sm whitespace-pre-wrap text-muted-foreground">
                {row.body}
              </p>
              {row.staff_note ? (
                <div className="mt-3 flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                  <MessageSquareReply className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-primary">
                      {t("১০ মিনিট স্কুল টিম", "10 Minute School team")}
                    </p>
                    <p className="whitespace-pre-wrap">{row.staff_note}</p>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Inbox className="size-5" />}
          title={t("এখনো কিছু জমা দাওনি।", "You haven't submitted anything yet.")}
          action={
            <Button asChild size="sm">
              <Link to="/captain">{t("প্রথম মতামত দাও", "Share your first idea")}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

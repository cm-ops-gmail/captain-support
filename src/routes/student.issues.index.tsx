import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FilePlus2, Inbox, Loader2, Search } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language-context";
import { bn, formatDateShortBn, labelCategory } from "@/lib/support-constants";
import { myTickets } from "@/lib/student.functions";

export const Route = createFileRoute("/student/issues/")({
  head: () => ({ meta: [{ title: "My Issues — Cap10 Support" }] }),
  component: MyIssues,
});

const CATEGORY_EN: Record<string, string> = {
  recorded_class: "Recorded Class",
  live_class: "Live Class",
  study_material: "Study Material",
  exam: "Exam",
  other: "Other",
  payment: "Payment",
  technical: "Technical Issue",
  account: "Account",
};

function displayCategory(category: string, language: "bn" | "en") {
  if (language === "bn") return labelCategory(category);
  const key = category
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
  return CATEGORY_EN[key] ?? labelCategory(category);
}

function displayDate(value: string, language: "bn" | "en") {
  if (language === "bn") return formatDateShortBn(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}

function displayTicketNumber(value: string, language: "bn" | "en") {
  // Ticket IDs are identifiers, not quantities. Preserve their stored prefix and
  // sequence; only convert digit glyphs for the selected display language.
  if (language === "bn") return bn(value);
  return value.replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
}

function MyIssues() {
  const { language, t } = useLanguage();
  const fetchTickets = useServerFn(myTickets);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: () => fetchTickets(),
  });

  const rows = (data ?? []).filter((ticket) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    const searchable = [
      ticket.ticket_number,
      displayTicketNumber(ticket.ticket_number, "bn"),
      displayTicketNumber(ticket.ticket_number, "en"),
      ticket.title,
      ticket.category,
      displayCategory(ticket.category, language),
      ticket.status,
    ];
    return searchable.join(" ").toLowerCase().includes(query);
  });

  return (
    <div>
      <PageHeader
        title={t("আমার সমস্যা", "My Tickets")}
        description={t(
          "শুধু তুমিই এই টিকেট ও এর বিস্তারিত দেখতে পাবে।",
          "Only you can view these tickets and their details.",
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

      <div className="card-panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("আমার টিকেট খুঁজুন", "Search my tickets")}
            aria-label={t("আমার টিকেট খুঁজুন", "Search my tickets")}
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        {isLoading ? (
          <div
            className="flex justify-center py-16"
            role="status"
            aria-label={t("লোড হচ্ছে", "Loading")}
          >
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length ? (
          <div className="sheet-scroll">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 bg-secondary/70 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">
                    {t("টিকেট আইডি", "Ticket ID")}
                  </th>
                  <th className="px-4 py-2 text-left font-medium">{t("সমস্যা", "Issue")}</th>
                  <th className="px-4 py-2 text-left font-medium">{t("ধরন", "Category")}</th>
                  <th className="px-4 py-2 text-left font-medium">{t("তারিখ", "Date")}</th>
                  <th className="px-4 py-2 text-left font-medium">{t("অবস্থা", "Status")}</th>
                  <th className="px-4 py-2 text-left font-medium">
                    {t("সর্বশেষ আপডেট", "Last Updated")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((ticket) => (
                  <tr key={ticket.id} className="transition-colors hover:bg-secondary/50">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      <Link
                        to="/student/issues/$id"
                        params={{ id: ticket.id }}
                        className="text-primary hover:underline"
                      >
                        {displayTicketNumber(ticket.ticket_number, language)}
                      </Link>
                    </td>
                    <td className="max-w-[320px] px-4 py-3">
                      <Link
                        to="/student/issues/$id"
                        params={{ id: ticket.id }}
                        className="line-clamp-1 hover:underline"
                      >
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {displayCategory(ticket.category, language)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {displayDate(ticket.created_at, language)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ticket.status} short />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {displayDate(ticket.updated_at, language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Inbox className="size-5" />}
            title={
              search.trim()
                ? t(
                    "তোমার খোঁজার সাথে মিলে এমন কোনো সমস্যা পাওয়া যায়নি।",
                    "No tickets match your search.",
                  )
                : t("এখনো কোনো সমস্যা জানানো হয়নি।", "You haven't reported any issues yet.")
            }
            description={
              search.trim()
                ? t("অন্য কোনো শব্দ দিয়ে চেষ্টা করো।", "Try searching with different words.")
                : t(
                    "সমস্যা জানাও এবং এখানে এর অবস্থা দেখো।",
                    "Report an issue and track its status here.",
                  )
            }
          />
        )}
      </div>
    </div>
  );
}

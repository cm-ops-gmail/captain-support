import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { SegmentCard } from "@/components/SegmentCard";
import { useLanguage } from "@/lib/language-context";
import { staffOverview } from "@/lib/staff.functions";

export const Route = createFileRoute("/staff/classes/")({
  head: () => ({ meta: [{ title: "Class Dashboards — Cap10 Support" }] }),
  component: ClassesIndex,
});

function ClassesIndex() {
  const { t } = useLanguage();
  const fetchOverview = useServerFn(staffOverview);
  // Shares the overview's cache entry, so switching between pages is instant.
  const { data, isLoading } = useQuery({
    queryKey: ["staff-overview"],
    queryFn: () => fetchOverview(),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("ক্লাসভিত্তিক ড্যাশবোর্ড", "Class Dashboards")}
        description={t(
          "প্রতিটি ক্লাসের সমস্যা আলাদাভাবে দেখুন — ক্লাস ৬, ৭, ৮, ৯, এসএসসি ২৭/২৮, এইচএসসি ২৭/২৮।",
          "Each class's issues on its own dashboard — Class 6, 7, 8, 9, SSC 27/28, HSC 27/28.",
        )}
      />
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(data?.segments ?? []).map((summary) => (
            <SegmentCard key={summary.segment} summary={summary} />
          ))}
        </div>
      )}
    </div>
  );
}

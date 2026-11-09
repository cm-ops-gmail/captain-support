import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ScrollText } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listAuditLogs } from "@/lib/staff.functions";
import { formatDateBn, labelStatus } from "@/lib/support-constants";

export const Route = createFileRoute("/staff/audit")({
  head: () => ({ meta: [{ title: "Activity Log — Cap10 Support" }] }),
  component: AuditPage,
});

const EVENT_LABELS: Record<string, string> = {
  "student.login": "শিক্ষার্থী লগইন",
  "student.logout": "শিক্ষার্থী লগআউট",
  "staff.login": "সাপোর্ট টিম লগইন",
  "staff.logout": "সাপোর্ট টিম লগআউট",
  "ticket.created": "নতুন সমস্যা জানানো হয়েছে",
  "ticket.message_sent": "বার্তা পাঠানো হয়েছে",
  "attachment.uploaded": "সংযুক্তি আপলোড হয়েছে",
  "ticket.status_changed": "স্ট্যাটাস পরিবর্তন হয়েছে",
  "ticket.response_sent": "অফিশিয়াল উত্তর পাঠানো হয়েছে",
  "student.deactivated": "শিক্ষার্থী নিষ্ক্রিয় করা হয়েছে",
  "student.reactivated": "শিক্ষার্থী সক্রিয় করা হয়েছে",
  "captain.role_granted": "ক্যাপ্টেন রোল দেওয়া হয়েছে",
  "captain.role_removed": "ক্যাপ্টেন রোল সরানো হয়েছে",
};

function describeEvent(eventType: string, metadata: unknown): string {
  const label = EVENT_LABELS[eventType] ?? eventType;
  const meta = (metadata ?? {}) as Record<string, unknown>;
  if (eventType === "ticket.status_changed" && typeof meta["status"] === "string") {
    return `${label} → ${labelStatus(meta["status"] as string)}`;
  }
  if (eventType === "ticket.created" && meta["priority"] === "high") {
    return `${label} (গুরুত্বপূর্ণ)`;
  }
  return label;
}

function actorLabel(actorType: string, actorName: string | null): string {
  if (actorType === "staff") return actorName ?? "সাপোর্ট টিম";
  if (actorType === "student") return actorName ?? "শিক্ষার্থী";
  return "সিস্টেম";
}

function roleLabel(actorType: string): string {
  if (actorType === "staff") return "সাপোর্ট টিম";
  if (actorType === "student") return "শিক্ষার্থী";
  return "সিস্টেম";
}

function AuditPage() {
  const fetchLogs = useServerFn(listAuditLogs);
  const [eventType, setEventType] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["staff-audit", eventType],
    queryFn: () => fetchLogs({ data: { eventType, limit: 300 } }),
  });

  return (
    <div>
      <PageHeader
        title="অ্যাক্টিভিটি লগ"
        description="লগইন, টিকেট কার্যক্রম এবং শিক্ষার্থী অ্যাকাউন্টে পরিবর্তনের ইতিহাস।"
      />

      <div className="card-panel mb-4 p-4">
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব ধরনের ইভেন্ট</SelectItem>
            {Object.entries(EVENT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="card-panel overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : data?.length ? (
          <div className="sheet-scroll max-h-[70vh]">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 bg-secondary text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">তারিখ</th>
                  <th className="px-3 py-2 text-left font-medium">কে করেছে</th>
                  <th className="px-3 py-2 text-left font-medium">ধরন</th>
                  <th className="px-3 py-2 text-left font-medium">ঘটনা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {formatDateBn(row.created_at)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {actorLabel(row.actor_type, row.actor_name)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {roleLabel(row.actor_type)}
                    </td>
                    <td className="px-3 py-2">{describeEvent(row.event_type, row.metadata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<ScrollText className="size-5" />} title="এখনো কোনো লগ নেই।" />
        )}
      </div>
    </div>
  );
}

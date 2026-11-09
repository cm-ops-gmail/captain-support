import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Loader2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { PriorityBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { deleteNotice, listNotices, saveNotice } from "@/lib/staff.functions";
import { CLASS_SEGMENTS, segmentLabel, type ClassSegment } from "@/lib/class-segments";
import { formatDateBn } from "@/lib/support-constants";

export const Route = createFileRoute("/staff/notices")({
  head: () => ({ meta: [{ title: "Notices — Cap10 Support" }] }),
  component: NoticeManagement,
});

type NoticeForm = {
  id?: string;
  title: string;
  content: string;
  priority: string;
  published: boolean;
  /** Empty = all classes. */
  target_segments: ClassSegment[];
};

const emptyNotice: NoticeForm = {
  title: "",
  content: "",
  priority: "Normal",
  published: true,
  target_segments: [],
};

function NoticeManagement() {
  const fetchNotices = useServerFn(listNotices);
  const save = useServerFn(saveNotice);
  const remove = useServerFn(deleteNotice);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NoticeForm | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-notices"],
    queryFn: () => fetchNotices(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["staff-notices"] });

  const saveMutation = useMutation({
    mutationFn: (values: NoticeForm) =>
      save({
        data: {
          ...(values.id ? { id: values.id } : {}),
          title: values.title,
          content: values.content,
          priority: values.priority,
          published: values.published,
          target_segments: values.target_segments,
        },
      }),
    onSuccess: () => {
      toast.success("নোটিশ সংরক্ষণ করা হয়েছে।");
      setForm(null);
      void invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "এই নোটিশটি সংরক্ষণ করা যায়নি।"),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="নোটিশ"
        description="প্রকাশিত নোটিশ প্রতিটি শিক্ষার্থীর ড্যাশবোর্ডে দেখা যাবে।"
        action={
          <Button onClick={() => setForm({ ...emptyNotice })}>
            <Plus className="size-4" />
            নতুন নোটিশ
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.length ? (
        <ul className="space-y-3">
          {data.map((notice) => (
            <li key={notice.id} className="card-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-semibold">{notice.title}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateBn(notice.created_at)} ·{" "}
                    {notice.published ? "প্রকাশিত" : "খসড়া (শিক্ষার্থীদের থেকে লুকানো)"} ·{" "}
                    {notice.target_segments.length
                      ? notice.target_segments
                          .map((segment) => segmentLabel(segment, "bn"))
                          .join(", ")
                      : "সব ক্লাস"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={notice.priority} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setForm({
                        id: notice.id,
                        title: notice.title,
                        content: notice.content,
                        priority: notice.priority,
                        published: notice.published,
                        target_segments: notice.target_segments as ClassSegment[],
                      })
                    }
                  >
                    সম্পাদনা
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm("এই নোটিশটি মুছে ফেলবেন?")) return;
                      try {
                        await remove({ data: { id: notice.id } });
                        toast.success("নোটিশ মুছে ফেলা হয়েছে।");
                        void invalidate();
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : "এই নোটিশটি মুছে ফেলা যায়নি।",
                        );
                      }
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap text-foreground/85">
                {notice.content}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Bell className="size-5" />}
          title="এখনো কোনো নোটিশ নেই।"
          description="একসাথে সব শিক্ষার্থীকে জানাতে একটি নোটিশ তৈরি করুন।"
        />
      )}

      {form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
          <div className="card-panel w-full max-w-lg p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">
                {form.id ? "নোটিশ সম্পাদনা করুন" : "নতুন নোটিশ"}
              </h2>
              <button
                onClick={() => setForm(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="বন্ধ করুন"
              >
                <X className="size-5" />
              </button>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(form);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="n-title">শিরোনাম *</Label>
                <Input
                  id="n-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="n-content">বিবরণ *</Label>
                <Textarea
                  id="n-content"
                  rows={5}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>অগ্রাধিকার</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">সাধারণ</SelectItem>
                      <SelectItem value="Important">গুরুত্বপূর্ণ</SelectItem>
                      <SelectItem value="Urgent">অতি জরুরি</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  />
                  শিক্ষার্থীদের কাছে প্রকাশ করুন
                </label>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">কোন ক্লাস দেখবে?</legend>
                <p className="text-xs text-muted-foreground">
                  কোনোটি না বাছলে সব ক্লাসের শিক্ষার্থী দেখবে।
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CLASS_SEGMENTS.map((segment) => {
                    const active = form.target_segments.includes(segment);
                    return (
                      <button
                        key={segment}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          setForm({
                            ...form,
                            target_segments: active
                              ? form.target_segments.filter((item) => item !== segment)
                              : [...form.target_segments, segment],
                          })
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "border-[#8B1E2D] bg-[#8B1E2D] text-white" : "border-border hover:bg-secondary"}`}
                      >
                        {segmentLabel(segment, "bn")}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                  বাতিল
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  নোটিশ সংরক্ষণ করুন
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

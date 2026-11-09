import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Lightbulb, Loader2, MessageSquareHeart, Rocket, Send } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

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
import { submitCaptainVoice } from "@/lib/captain.functions";
import { segmentLabel } from "@/lib/class-segments";
import { useLanguage } from "@/lib/language-context";
import {
  CAPTAIN_AREAS,
  CAPTAIN_KINDS,
  CAPTAIN_KIND_LABELS,
  bn,
  labelCaptainArea,
  type CaptainKind,
} from "@/lib/support-constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/captain/")({
  head: () => ({ meta: [{ title: "Captain Voice — Cap10 Support" }] }),
  component: CaptainVoicePage,
});

const KIND_ICONS: Record<CaptainKind, ReactNode> = {
  improvement: <Lightbulb className="size-5" />,
  experience: <MessageSquareHeart className="size-5" />,
  proposal: <Rocket className="size-5" />,
};

function CaptainVoicePage() {
  const { captain } = Route.useRouteContext();
  const { language, t } = useLanguage();
  const submit = useServerFn(submitCaptainVoice);
  const queryClient = useQueryClient();

  const [kind, setKind] = useState<CaptainKind>("improvement");
  const [area, setArea] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [benefit, setBenefit] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      submit({ data: { kind, area, title, body, expected_benefit: benefit || null } }),
    onSuccess: (row) => {
      setDone(row.submission_number);
      setTitle("");
      setBody("");
      setBenefit("");
      setArea("");
      void queryClient.invalidateQueries({ queryKey: ["captain-submissions"] });
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : t("জমা দেওয়া যায়নি।", "Could not submit."),
      ),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  const num = (value: number) => (language === "bn" ? bn(value) : String(value));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 overflow-hidden rounded-2xl border border-[#8B1E2D]/20 bg-gradient-to-br from-[#300c16] via-[#651727] to-[#942538] px-6 py-7 text-white shadow-lg sm:px-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
          {t("ক্যাপ্টেন ভয়েস", "Captain Voice")} · {segmentLabel(captain.class_segment, language)}
        </div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {t("তোমার ক্লাসের কণ্ঠস্বর হও", "Be the voice of your class")}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
          {t(
            "টেনটেন নিয়ে তোমার ও তোমার ক্লাসের অভিজ্ঞতা, উন্নতির পরামর্শ আর নতুন পরিকল্পনা সরাসরি ১০ মিনিট স্কুল টিমকে জানাও — যাতে আমরা আরও ভালোভাবে শেখাতে পারি।",
            "Share your class's experience with TenTen, improvement pointers and new plans directly with the 10 Minute School team — so we can serve you with better learning.",
          )}
        </p>
      </div>

      {done ? (
        <div className="card-panel mb-6 flex items-start gap-3 rounded-2xl border border-status-resolved/30 bg-status-resolved/5 p-5">
          <CheckCircle2 className="mt-0.5 size-5 text-status-resolved" />
          <div className="flex-1">
            <p className="font-semibold">
              {t("ধন্যবাদ! তোমার মতামত জমা হয়েছে।", "Thank you! Your submission was received.")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("আইডি", "ID")}: <span className="font-display font-semibold">{done}</span> ·{" "}
              {t(
                "টিম পর্যালোচনা করে অবস্থা আপডেট করবে।",
                "The team will review it and update its status.",
              )}
            </p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/captain/submissions">{t("আমার জমা দেখো", "View my submissions")}</Link>
          </Button>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="card-panel space-y-6 rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-7"
      >
        <div className="space-y-2">
          <Label>{t("কী শেয়ার করতে চাও? *", "What would you like to share? *")}</Label>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup">
            {CAPTAIN_KINDS.map((item) => {
              const label = CAPTAIN_KIND_LABELS[item];
              const active = kind === item;
              return (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setKind(item)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
                    active
                      ? "border-[#8B1E2D] bg-[#8B1E2D]/5 ring-1 ring-[#8B1E2D]"
                      : "border-border hover:bg-secondary/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg",
                      active ? "bg-[#8B1E2D] text-white" : "bg-secondary text-foreground",
                    )}
                  >
                    {KIND_ICONS[item]}
                  </span>
                  <span className="text-sm font-semibold">{label[language]}</span>
                  <span className="text-xs leading-5 text-muted-foreground">
                    {language === "bn" ? label.hintBn : label.hintEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <div className="space-y-2">
            <Label>{t("বিষয় *", "Area *")}</Label>
            <Select value={area} onValueChange={setArea} required>
              <SelectTrigger>
                <SelectValue placeholder={t("বেছে নাও", "Choose")} />
              </SelectTrigger>
              <SelectContent>
                {CAPTAIN_AREAS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {labelCaptainArea(item, language)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="voice-title">{t("শিরোনাম *", "Title *")}</Label>
            <Input
              id="voice-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              placeholder={
                kind === "proposal"
                  ? t(
                      "যেমন: প্রতি সপ্তাহে ক্লাসভিত্তিক রিভিশন লাইভ",
                      "e.g. Weekly class-wise revision live",
                    )
                  : kind === "experience"
                    ? t(
                        "যেমন: নতুন অ্যাপ আপডেটের পর আমাদের অভিজ্ঞতা",
                        "e.g. Our experience after the new app update",
                      )
                    : t(
                        "যেমন: ভিডিওতে স্পিড কন্ট্রোল যোগ করা",
                        "e.g. Add playback speed control to videos",
                      )
              }
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="voice-body">{t("বিস্তারিত *", "Details *")}</Label>
          <Textarea
            id="voice-body"
            rows={7}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            placeholder={t(
              "কী দেখেছ, তোমার ক্লাসের শিক্ষার্থীরা কী বলছে, আর কীভাবে করলে আরও ভালো হবে — বিস্তারিত লেখো।",
              "What you've noticed, what students in your class are saying, and how it could be better.",
            )}
            required
          />
          <p className="text-xs text-muted-foreground">
            {num(body.length)}/{num(5000)}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="voice-benefit">
            {t("এতে কী উপকার হবে? (ঐচ্ছিক)", "What benefit would it bring? (optional)")}
          </Label>
          <Textarea
            id="voice-benefit"
            rows={3}
            value={benefit}
            onChange={(e) => setBenefit(e.target.value)}
            maxLength={1000}
            placeholder={t(
              "শিক্ষার্থীদের শেখায় কী পরিবর্তন আসবে?",
              "How would it change learning for students?",
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={
              mutation.isPending || !area || title.trim().length < 5 || body.trim().length < 20
            }
            className="bg-[#8B1E2D] text-white hover:bg-[#a52436]"
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {t("১০ মিনিট স্কুলকে পাঠাও", "Send to 10 Minute School")}
          </Button>
        </div>
      </form>
    </div>
  );
}

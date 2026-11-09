import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLASS_SEGMENTS, segmentLabel } from "@/lib/class-segments";
import { getSettings, updateStaffCredentials } from "@/lib/staff.functions";
import { CATEGORIES, PLATFORMS, SUB_TYPES, labelPlatform } from "@/lib/support-constants";

export const Route = createFileRoute("/staff/settings")({
  head: () => ({ meta: [{ title: "Settings — Cap10 Support" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const fetchSettings = useServerFn(getSettings);
  const saveCredentials = useServerFn(updateStaffCredentials);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-settings"],
    queryFn: () => fetchSettings(),
  });

  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function saveCreds(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await saveCredentials({
        data: {
          currentPassword,
          ...(username.trim() ? { username: username.trim() } : {}),
          ...(newPassword ? { newPassword } : {}),
        },
      });
      toast.success("সাপোর্ট টিমের ক্রেডেনশিয়াল আপডেট করা হয়েছে।");
      setCurrentPassword("");
      setUsername("");
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ক্রেডেনশিয়াল আপডেট করা যায়নি।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="সেটিংস" description={`লগইন করেছেন ${data.username} হিসেবে।`} />

      <div className="card-panel p-5">
        <h2 className="font-display text-sm font-semibold">ক্লাস সেগমেন্ট</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          শিক্ষার্থী ইমপোর্টের সময় <code>class</code> কলামে এগুলোর যেকোনোটি লিখুন (যেমন "Class 6",
          "SSC 27", "hsc_28")।
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CLASS_SEGMENTS.map((segment) => (
            <span
              key={segment}
              className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs"
            >
              {segmentLabel(segment, "en")}{" "}
              <span className="text-muted-foreground">· {segment}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="card-panel p-5">
        <h2 className="font-display text-sm font-semibold">সমস্যার ধরন ও উপ-ধরন</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          শিক্ষার্থীরা রিপোর্ট ফর্মে এগুলো থেকে বেছে নেয়। পরিবর্তন করতে{" "}
          <code>src/lib/support-constants.ts</code> সম্পাদনা করুন (সার্ভার একই তালিকা দিয়ে যাচাই
          করে, তাই দুই জায়গায় মিল থাকে)।
        </p>
        <dl className="mt-3 divide-y divide-border text-sm">
          {CATEGORIES.map((category) => (
            <div key={category} className="grid gap-1 py-2 sm:grid-cols-[200px_1fr]">
              <dt className="font-medium">{category}</dt>
              <dd className="text-xs text-muted-foreground">{SUB_TYPES[category].join(" · ")}</dd>
            </div>
          ))}
          <div className="grid gap-1 py-2 sm:grid-cols-[200px_1fr]">
            <dt className="font-medium">Platforms</dt>
            <dd className="text-xs text-muted-foreground">
              {PLATFORMS.map((p) => labelPlatform(p, "en")).join(" · ")}
            </dd>
          </div>
        </dl>
      </div>

      <div className="card-panel p-5">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
          <KeyRound className="size-4 text-primary" />
          সাপোর্ট টিম লগইন
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          শেয়ার করা সাপোর্ট টিমের ইউজারনেম বা পাসওয়ার্ড আপডেট করুন। শিক্ষার্থীরা এই অংশে কখনো
          প্রবেশ করতে পারবে না।
        </p>
        <form className="mt-4 space-y-3" onSubmit={saveCreds}>
          <div className="space-y-1.5">
            <Label htmlFor="current">বর্তমান পাসওয়ার্ড *</Label>
            <Input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-username">নতুন ইউজারনেম</Label>
              <Input
                id="new-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={data.username}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">নতুন পাসওয়ার্ড</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="কমপক্ষে ৮ অক্ষর"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              ক্রেডেনশিয়াল আপডেট করুন
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

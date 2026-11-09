import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, Save, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { segmentLabel } from "@/lib/class-segments";
import { useLanguage } from "@/lib/language-context";
import {
  changeStudentPassword,
  studentDashboard,
  studentProfile,
  updateStudentEmail,
} from "@/lib/student.functions";
import { bn, formatDateShort, formatDateShortBn } from "@/lib/support-constants";

export const Route = createFileRoute("/student/profile")({
  head: () => ({ meta: [{ title: "Profile — Cap10 Support" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { language, t } = useLanguage();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(studentProfile);
  const fetchDashboard = useServerFn(studentDashboard);
  const saveEmail = useServerFn(updateStudentEmail);
  const savePassword = useServerFn(changeStudentPassword);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["student-profile"],
    queryFn: () => fetchProfile(),
  });
  const { data: dashboard } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (profile) setEmail(profile.email ?? "");
  }, [profile]);

  const n = (value: string | number) => (language === "bn" ? bn(value) : String(value));
  const date = (value: string | null) =>
    value ? (language === "bn" ? formatDateShortBn(value) : formatDateShort(value)) : "—";

  const emailMutation = useMutation({
    mutationFn: () => saveEmail({ data: { email } }),
    onSuccess: () => {
      toast.success(t("ইমেইল সেভ হয়েছে।", "Email saved."));
      void queryClient.invalidateQueries({ queryKey: ["student-profile"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : t("সেভ করা যায়নি।", "Could not save.")),
  });

  const passwordMutation = useMutation({
    mutationFn: () => savePassword({ data: { current: currentPassword, next: newPassword } }),
    onSuccess: () => {
      toast.success(t("পাসওয়ার্ড পরিবর্তন হয়েছে।", "Password changed."));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error
          ? err.message
          : t("পরিবর্তন করা যায়নি।", "Could not change password."),
      ),
  });

  function handlePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("নতুন পাসওয়ার্ড দুটি মিলছে না।", "The new passwords do not match."));
      return;
    }
    passwordMutation.mutate();
  }

  if (isLoading || !profile) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rows: [string, string][] = [
    [t("নাম", "Name"), profile.name],
    [t("ক্লাস", "Class"), segmentLabel(profile.class_segment, language)],
    [t("লগইন নম্বর", "Login number"), n(profile.login_number)],
    [t("স্টুডেন্ট আইডি", "Student ID"), profile.student_code ?? "—"],
    [t("সর্বশেষ লগইন", "Last login"), date(profile.last_login_at)],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t("প্রোফাইল", "Profile")}
        description={t(
          "তোমার ক্লাস ও পরিচয় তথ্য সাপোর্ট টিম পরিচালনা করে। ভুল থাকলে একটি সমস্যা রিপোর্ট করো।",
          "Your class and identity are managed by the support team. Report an issue if anything is wrong.",
        )}
      />

      <section className="card-panel p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {profile.account_role === "captain" ? (
              <ShieldCheck className="size-5" />
            ) : (
              <UserRound className="size-5" />
            )}
          </span>
          <div>
            <p className="font-display font-semibold">{profile.name}</p>
            <p className="text-xs text-muted-foreground">
              {profile.account_role === "captain"
                ? t("ক্লাস ক্যাপ্টেন", "Class Captain")
                : t("শিক্ষার্থী", "Student")}{" "}
              · {segmentLabel(profile.class_segment, language)}
            </p>
          </div>
        </div>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 border-b border-border pb-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-b border-border pb-2">
            <dt className="text-muted-foreground">
              {t("মোট জমা দেওয়া সমস্যা", "Issues submitted")}
            </dt>
            <dd className="font-medium">{n(dashboard?.stats.total ?? 0)}</dd>
          </div>
        </dl>
      </section>

      <section className="card-panel space-y-3 p-5">
        <h2 className="text-sm font-semibold">{t("ইমেইল", "Email")}</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="sm:max-w-sm"
          />
          <Button
            variant="outline"
            disabled={emailMutation.isPending || email === (profile.email ?? "")}
            onClick={() => emailMutation.mutate()}
          >
            {emailMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {t("সেভ", "Save")}
          </Button>
        </div>
      </section>

      <form onSubmit={handlePassword} className="card-panel space-y-3 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4" />
          {t("পাসওয়ার্ড পরিবর্তন", "Change password")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">{t("বর্তমান", "Current")}</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">{t("নতুন", "New")}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">{t("আবার লেখো", "Confirm")}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>
        <Button type="submit" disabled={passwordMutation.isPending}>
          {passwordMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <KeyRound className="size-4" />
          )}
          {t("পাসওয়ার্ড পরিবর্তন করো", "Change password")}
        </Button>
      </form>
    </div>
  );
}

import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import {
  GraduationCap,
  Loader2,
  LifeBuoy,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  ClipboardCheck,
  KeyRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/language-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NEEDS_SETUP_MESSAGE,
  getCurrentUser,
  setupStudentAccount,
  staffLogin,
  studentLogin,
} from "@/lib/auth.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "লগইন — Cap10 Support · 10 Minute School" },
      {
        name: "description",
        content:
          "ক্লাস ৬ থেকে এইচএসসি — অ্যাপ, ওয়েবসাইট, প্রোডাক্ট বা অভিজ্ঞতা সংক্রান্ত সমস্যা ১০ মিনিট স্কুলকে জানাও।",
      },
    ],
  }),
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (user.role === "student" && user.account_role === "captain")
      throw redirect({ to: "/captain" });
    if (user.role === "student") throw redirect({ to: "/student" });
    if (user.role === "staff") throw redirect({ to: "/staff" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  const [mode, setMode] = useState<"login" | "register">("login");

  // Unified login fields (student login number OR staff username)
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // First-time setup fields (staff-imported students only — no open registration)
  const [regLoginNumber, setRegLoginNumber] = useState("");
  const [regVerifier, setRegVerifier] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"login" | "register" | null>(null);

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy("login");

    // 1) Try as a student login (identifier = login number)
    try {
      await studentLogin({
        data: { login_number: identifier, password: loginPassword },
      });
      await router.invalidate();
      await navigate({ to: "/student", replace: true });
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === NEEDS_SETUP_MESSAGE) {
        setMode("register");
        setRegLoginNumber(identifier);
        setNotice(
          t(
            "এই লগইন নম্বরের জন্য এখনো পাসওয়ার্ড সেট করা হয়নি। নিচে স্টুডেন্ট আইডি / TMS আইডি ও নতুন পাসওয়ার্ড দিয়ে প্রথমবারের সেটআপ সম্পন্ন করো।",
            "No password is set for this login number yet. Finish first-time setup below with your Student ID / TMS ID and a new password.",
          ),
        );
        setBusy(null);
        return;
      }
      // Not a recognized student login — fall through and try staff login below.
    }

    // 2) Try as a support-team (staff) login (identifier = username)
    try {
      await staffLogin({ data: { username: identifier, password: loginPassword } });
      await router.invalidate();
      await navigate({ to: "/staff", replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("লগইন করা যায়নি। আবার চেষ্টা করো।", "Could not log in. Please try again."),
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (regPassword !== regConfirmPassword) {
      setError(t("পাসওয়ার্ড দুটি মিলছে না।", "The passwords do not match."));
      return;
    }
    setBusy("register");
    try {
      await setupStudentAccount({
        data: { login_number: regLoginNumber, verifier: regVerifier, password: regPassword },
      });
      await router.invalidate();
      await navigate({ to: "/student", replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              "সেটআপ সম্পন্ন করা যায়নি। আবার চেষ্টা করো।",
              "Could not complete setup. Please try again.",
            ),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB] text-[#111827]">
      <div className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex w-full max-w-[1216px] items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#931212] text-white">
              <GraduationCap className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-base font-bold sm:text-lg">
                {t("ক্যাপ১০ সাপোর্ট", "Cap10 Support")}
              </p>
              <p className="text-xs text-[#6B7280]">
                10 Minute School · {t("ক্লাস ৬ থেকে এইচএসসি", "Class 6 to HSC")}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div
              className="inline-flex items-center rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-1"
              role="group"
              aria-label="Language"
            >
              <button
                type="button"
                onClick={() => setLanguage("bn")}
                aria-pressed={language === "bn"}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${language === "bn" ? "bg-white text-[#931212] shadow-sm" : "text-[#6B7280]"}`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                aria-pressed={language === "en"}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${language === "en" ? "bg-white text-[#931212] shadow-sm" : "text-[#6B7280]"}`}
              >
                EN
              </button>
            </div>
            <span className="hidden rounded-full border border-[#F4C6CC] bg-[#FFF5F6] px-3 py-1.5 text-xs font-semibold text-[#931212] sm:inline-flex">
              {t("শিক্ষার্থীদের জন্য সাপোর্ট", "Support for Students")}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1216px] items-start gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)] lg:gap-14 lg:py-20">
        <section className="order-2 space-y-7 lg:order-1 lg:pt-9">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#F4C6CC] bg-[#FFF5F6] px-3 py-2 text-xs font-bold text-[#931212]">
            <span className="size-2 rounded-full bg-[#E8001D]" />
            {t("ক্লাস ৬ · ৭ · ৮ · ৯ · এসএসসি · এইচএসসি", "Class 6 · 7 · 8 · 9 · SSC · HSC")}
          </span>
          <div className="space-y-4">
            <h1 className="max-w-2xl font-display text-3xl font-bold leading-[1.4] tracking-normal sm:text-4xl lg:text-[44px]">
              {language === "bn" ? (
                <>
                  তোমার কথা <span className="text-[#931212]">সরাসরি</span> ১০ মিনিট স্কুলের কাছে
                </>
              ) : (
                <>
                  Your voice, <span className="text-[#931212]">straight</span> to 10 Minute School
                </>
              )}
            </h1>
            <p className="max-w-xl text-base leading-8 text-[#4B5563]">
              {t(
                "অ্যাপ, ওয়েবসাইট, প্রোডাক্ট বা শেখার অভিজ্ঞতা — যেকোনো সমস্যা জানাও। অগ্রগতি দেখো আর ১০ মিনিট স্কুল টিমের উত্তর পাও এক জায়গায়।",
                "Report any App, Website, Product or learning-experience issue. Track progress and get the 10 Minute School team's reply in one place.",
              )}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: LifeBuoy,
                title: t("সমস্যা জানাও", "Report an Issue"),
                desc: t("নতুন সাপোর্ট টিকিট তৈরি করো", "Create a new support ticket"),
                tint: "bg-[#D8F3FF]",
                color: "text-[#274FE3]",
              },
              {
                icon: ClipboardCheck,
                title: t("অগ্রগতি দেখো", "Track Progress"),
                desc: t("নিজের টিকিটের স্ট্যাটাস দেখো", "Check your ticket status"),
                tint: "bg-[#CCEBC0]",
                color: "text-[#0E7B4F]",
              },
              {
                icon: ShieldCheck,
                title: t("নিরাপদ সাপোর্ট", "Secure Support"),
                desc: t("তোমার তথ্য ব্যক্তিগত থাকবে", "Your information stays private"),
                tint: "bg-[#FFF5D6]",
                color: "text-[#A23F00]",
              },
            ].map(({ icon: Icon, title, desc, tint, color }) => (
              <div key={title} className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                <span
                  className={`mb-4 flex size-10 items-center justify-center rounded-xl ${tint} ${color}`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mb-1 text-sm font-bold">{title}</h3>
                <p className="text-xs leading-5 text-[#6B7280]">{desc}</p>
              </div>
            ))}
          </div>
          <p className="flex items-center gap-2 text-xs text-[#6B7280]">
            <LockKeyhole className="size-4" aria-hidden="true" />
            {t(
              "তোমার অ্যাকাউন্ট ও সাপোর্ট টিকিটের তথ্য সুরক্ষিত রাখার জন্য তৈরি।",
              "Designed to keep your account and support ticket information secure.",
            )}
          </p>
        </section>

        <section
          className="order-1 lg:order-2"
          aria-label={t("লগইন ও প্রথমবারের সেটআপ", "Login and first-time setup")}
        >
          <div className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-[0_4px_20px_rgba(17,24,39,0.05)]">
            <div className="border-b border-[#E5E7EB] px-5 py-5 sm:px-7">
              <div className="mb-5 flex items-center gap-2 text-xs font-bold text-[#0E7B4F]">
                <CheckCircle2 className="size-4" />{" "}
                {t("শিক্ষার্থী ও সাপোর্ট টিম", "Students & Support Team")}
              </div>
              <div
                className="grid grid-cols-2 gap-2 rounded-xl bg-[#F3F4F6] p-1"
                role="tablist"
                aria-label={t("অ্যাকাউন্ট", "Account")}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "login"}
                  onClick={() => switchMode("login")}
                  className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8001D] ${mode === "login" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"}`}
                >
                  {t("লগইন", "Login")}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "register"}
                  onClick={() => switchMode("register")}
                  className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8001D] ${mode === "register" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"}`}
                >
                  {t("প্রথমবার সেটআপ", "First-time setup")}
                </button>
              </div>
            </div>
            <div className="px-5 py-7 sm:px-7">
              {mode === "login" ? (
                <>
                  <h2 className="font-display text-2xl font-bold">
                    {t("তোমার অ্যাকাউন্টে লগইন করো", "Log in to your account")}
                  </h2>
                  <p className="mb-6 mt-2 text-sm text-[#6B7280]">
                    {t(
                      "শিক্ষার্থী লগইন নম্বর অথবা সাপোর্ট টিমের ইউজারনেম ব্যবহার করো।",
                      "Use your student login number or support team username.",
                    )}
                  </p>
                  {notice && (
                    <p
                      role="status"
                      className="mb-4 rounded-lg border border-[#BBE7C9] bg-[#F0FBF4] px-3 py-2 text-sm text-[#0E7B4F]"
                    >
                      {notice}
                    </p>
                  )}
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-identifier">
                        {t("ইউজারনেম / লগইন নম্বর", "Username / Login Number")}
                      </Label>
                      <Input
                        id="login-identifier"
                        autoComplete="username"
                        placeholder="01XXXXXXXXX"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        maxLength={40}
                        required
                        className="min-h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">{t("পাসওয়ার্ড", "Password")}</Label>
                      <Input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="min-h-11"
                      />
                    </div>
                    {error && (
                      <p
                        role="alert"
                        className="rounded-lg border border-[#F4C6CC] bg-[#FFF5F6] px-3 py-2 text-sm text-[#931212]"
                      >
                        {error}
                      </p>
                    )}
                    <Button
                      type="submit"
                      className="min-h-11 w-full font-bold"
                      disabled={busy !== null}
                    >
                      {busy === "login" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ArrowRight className="size-4" />
                      )}
                      {t("লগইন করো", "Log In")}
                    </Button>
                    <button
                      type="button"
                      onClick={() => switchMode("register")}
                      className="min-h-11 w-full text-center text-sm font-semibold text-[#931212] hover:underline"
                    >
                      {t("প্রথমবার? পাসওয়ার্ড সেট করো", "First time here? Set your password")}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <h2 className="font-display text-2xl font-bold">
                    {t("প্রথমবারের সেটআপ", "First-time setup")}
                  </h2>
                  <p className="mb-6 mt-2 text-sm text-[#6B7280]">
                    {t(
                      "তোমার তথ্য ১০ মিনিট স্কুল আগেই যুক্ত করেছে। লগইন নম্বর ও স্টুডেন্ট আইডি (অথবা TMS আইডি) দিয়ে যাচাই করে পাসওয়ার্ড সেট করো।",
                      "10 Minute School has already added you. Verify with your login number and Student ID (or TMS ID), then choose a password.",
                    )}
                  </p>
                  {notice && (
                    <p
                      role="status"
                      className="mb-4 rounded-lg border border-[#BBE7C9] bg-[#F0FBF4] px-3 py-2 text-sm text-[#0E7B4F]"
                    >
                      {notice}
                    </p>
                  )}
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-login-number">{t("লগইন নম্বর", "Login Number")}</Label>
                      <Input
                        id="reg-login-number"
                        inputMode="numeric"
                        autoComplete="username"
                        placeholder="01XXXXXXXXX"
                        value={regLoginNumber}
                        onChange={(e) => setRegLoginNumber(e.target.value)}
                        maxLength={20}
                        required
                        className="min-h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-verifier">
                        {t("স্টুডেন্ট আইডি অথবা TMS আইডি", "Student ID or TMS ID")}
                      </Label>
                      <Input
                        id="reg-verifier"
                        autoComplete="off"
                        placeholder={t(
                          "যেমন 10MS-1234 অথবা TMS12345678",
                          "e.g. 10MS-1234 or TMS12345678",
                        )}
                        value={regVerifier}
                        onChange={(e) => setRegVerifier(e.target.value)}
                        maxLength={40}
                        required
                        className="min-h-11"
                      />
                      <p className="text-xs text-[#6B7280]">
                        {t(
                          "না জানলে তোমার ক্লাস ক্যাপ্টেন বা সাপোর্ট টিমের সাথে যোগাযোগ করো।",
                          "Not sure? Ask your class captain or the support team.",
                        )}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">{t("পাসওয়ার্ড", "Password")}</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        minLength={6}
                        required
                        className="min-h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm-password">
                        {t("পাসওয়ার্ড আবার লিখো", "Confirm Password")}
                      </Label>
                      <Input
                        id="reg-confirm-password"
                        type="password"
                        autoComplete="new-password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        minLength={6}
                        required
                        className="min-h-11"
                      />
                    </div>
                    {error && (
                      <p
                        role="alert"
                        className="rounded-lg border border-[#F4C6CC] bg-[#FFF5F6] px-3 py-2 text-sm text-[#931212]"
                      >
                        {error}
                      </p>
                    )}
                    <Button
                      type="submit"
                      className="min-h-11 w-full font-bold"
                      disabled={busy !== null}
                    >
                      {busy === "register" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <KeyRound className="size-4" />
                      )}
                      {t("পাসওয়ার্ড সেট করে ঢুকে পড়ো", "Set password & continue")}
                    </Button>
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="min-h-11 w-full text-center text-sm font-semibold text-[#931212] hover:underline"
                    >
                      {t("আগে থেকেই অ্যাকাউন্ট আছে? লগইন করো", "Already have an account? Log in")}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
      <footer className="border-t border-[#E5E7EB] bg-white px-4 py-5 text-center text-xs text-[#6B7280]">
        10 Minute School · Cap10 Support
      </footer>
    </main>
  );
}

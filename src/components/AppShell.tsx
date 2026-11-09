import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { LifeBuoy, LogOut, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth.functions";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { segmentLabel } from "@/lib/class-segments";

export type NavItem = { to: string; label: string; icon: ReactNode; exact?: boolean };

// Translate only known UI labels; preserve custom labels and routes unchanged.
const navigationTranslations: Record<string, string> = {
  ড্যাশবোর্ড: "Dashboard",
  হোম: "Home",
  "আমার সমস্যা": "My Tickets",
  "আমার টিকিট": "My Tickets",
  "সমস্যা জানাও": "Submit a Ticket",
  "নতুন সমস্যা": "New Ticket",
  "নতুন টিকিট": "New Ticket",
  "সমস্যা রিপোর্ট": "Report an Issue",
  "কোর্স স্ট্রাকচার": "Course Structure",
  "কোর্সের কাঠামো": "Course Structure",
  "ক্লাস রুটিন": "Class Schedule",
  রুটিন: "Schedule",
  প্রোফাইল: "Profile",
  নোটিফিকেশন: "Notifications",
  সেটিংস: "Settings",
  "সবার সমস্যা": "Community Tickets",
  "সব সমস্যা": "All Tickets",
  টিকিটসমূহ: "Tickets",
  শিক্ষার্থীরা: "Students",
  শিক্ষার্থী: "Students",
  রিপোর্ট: "Reports",
  টিম: "Team",
  সারসংক্ষেপ: "Overview",
  "সমস্যা ওয়ার্কস্পেস": "Issue Desk",
  "শিক্ষার্থী ডেটাবেজ": "Student Database",
  নোটিশ: "Notices",
  "অ্যাক্টিভিটি লগ": "Activity Log",
  "কোর্স নোট": "Course Notes",
  "কোর্স অ্যাক্টিভিটি": "Course Activity",
  "সমস্যা জানান": "Report an Issue",
  "প্রায়োরিটি সমস্যা জানান": "Report a Priority Issue",
  "ক্যাপ্টেন ভয়েস": "Captain Voice",
  "আমার জমা": "My Submissions",
  "ক্লাসের সমস্যা": "Class Issues",
  "ক্লাসভিত্তিক ড্যাশবোর্ড": "Class Dashboards",
  "শিক্ষার্থী ডেটাবেজ ": "Student Database",
};

export function AppShell({
  nav,
  variant,
  title,
  subtitle,
  segment,
  children,
}: {
  nav: NavItem[];
  variant: "student" | "staff";
  title: string;
  subtitle: string;
  /** The authenticated student's class segment (shown as a header badge). */
  segment?: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  const visibleNav = nav;

  const translatedSubtitle =
    language === "en"
      ? (({ "সাপোর্ট টিম": "Support Team" } as Record<string, string>)[subtitle] ?? subtitle)
      : subtitle;

  const batchLabel = segment
    ? segmentLabel(segment, language)
    : t("সাপোর্ট টিম ডেস্ক", "Support Team Desk");

  async function signOut() {
    try {
      await logout();
      await router.invalidate();
      await navigate({ to: "/", replace: true });
    } catch {
      toast.error(
        t("সাইন আউট করা যায়নি। আবার চেষ্টা করো।", "Could not sign out. Please try again."),
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4">
          <button
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("মেনু খুলুন বা বন্ধ করুন", "Toggle menu")}
            aria-expanded={open}
            type="button"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Link
            to={(variant === "staff" ? "/staff" : "/student") as never}
            className="group flex items-center gap-3"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground shadow-sm transition-transform group-hover:scale-105">
              <LifeBuoy className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="font-display block text-sm font-semibold">
                {t("ক্যাপ১০ সাপোর্ট", "Cap10 Support")}
              </span>
              <span className="block text-xs text-muted-foreground">{batchLabel}</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{translatedSubtitle}</p>
            </div>
            <div
              role="group"
              aria-label={t("ভাষা নির্বাচন", "Choose language")}
              className="inline-flex items-center rounded-md border border-border bg-background p-0.5"
            >
              <button
                type="button"
                onClick={() => setLanguage("bn")}
                aria-pressed={language === "bn"}
                className={cn(
                  "rounded px-2 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  language === "bn"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                aria-pressed={language === "en"}
                className={cn(
                  "rounded px-2 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  language === "en"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                EN
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">{t("লগআউট", "Log out")}</span>
            </Button>
          </div>
        </div>
        <div className="h-0.5 w-full bg-gradient-to-r from-primary via-primary/30 to-transparent" />
      </header>

      <div className="mx-auto flex max-w-[1500px] gap-6 px-4 py-6">
        <aside
          className={cn(
            "fixed inset-x-0 top-16 z-20 border-b border-white/10 bg-[#2a0a12] p-3 lg:static lg:block lg:w-60 lg:shrink-0 lg:rounded-2xl lg:border lg:border-white/10 lg:bg-[#2a0a12] lg:p-3 lg:shadow-xl",
            open ? "block" : "hidden",
          )}
        >
          <nav className="flex flex-col gap-1 lg:sticky lg:top-24">
            {visibleNav.map((item) => (
              <Link
                key={item.to}
                to={item.to as never}
                activeOptions={{ exact: item.exact ?? false }}
                onClick={() => setOpen(false)}
                className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-200/60 transition-all before:absolute before:left-0 before:top-1/2 before:h-0 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-primary before:content-[''] before:transition-all before:duration-300 hover:bg-white/10 hover:text-white"
                activeProps={{
                  className:
                    "bg-[#8B1E2D] text-white shadow-lg shadow-[#4A0E17]/50 before:h-2/3 hover:bg-[#A52436] hover:text-white",
                }}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5 transition-colors group-hover:bg-white/15">
                  {item.icon}
                </span>
                {language === "en"
                  ? (navigationTranslations[item.label] ?? item.label)
                  : item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

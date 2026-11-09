import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ResolvedNotifications } from "@/components/ResolvedNotifications";
import { buildStudentNav, studentSubtitle } from "@/components/student-nav";
import { getCurrentUser } from "@/lib/auth.functions";
import { useLanguage } from "@/lib/language-context";

// Presentation-level guard only; every captain server function re-checks
// the role via requireCaptain() in session.server.ts.
export const Route = createFileRoute("/captain")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (user.role === "staff") throw redirect({ to: "/staff" });
    if (user.role !== "student") throw redirect({ to: "/" });
    if (user.account_role !== "captain") throw redirect({ to: "/student" });
    return { captain: user };
  },
  component: CaptainLayout,
});

function CaptainLayout() {
  const { captain } = Route.useRouteContext();
  const { language } = useLanguage();
  return (
    <AppShell
      nav={buildStudentNav(true)}
      variant="student"
      title={captain.name}
      subtitle={studentSubtitle(true, captain.login_number, language)}
      segment={captain.class_segment}
    >
      <ResolvedNotifications />
      <Outlet />
    </AppShell>
  );
}

import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { ResolvedNotifications } from "@/components/ResolvedNotifications";
import { buildStudentNav, studentSubtitle } from "@/components/student-nav";
import { getCurrentUser } from "@/lib/auth.functions";
import { useLanguage } from "@/lib/language-context";

export const Route = createFileRoute("/student")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (user.role === "staff") throw redirect({ to: "/staff" });
    if (user.role !== "student") throw redirect({ to: "/" });
    return { student: user };
  },
  component: StudentLayout,
});

function StudentLayout() {
  const { student } = Route.useRouteContext();
  const { language } = useLanguage();
  const isCaptain = student.account_role === "captain";

  return (
    <AppShell
      nav={buildStudentNav(isCaptain)}
      variant="student"
      title={student.name}
      subtitle={studentSubtitle(isCaptain, student.login_number, language)}
      segment={student.class_segment}
    >
      <ResolvedNotifications />
      <Outlet />
    </AppShell>
  );
}

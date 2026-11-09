import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import {
  Bell,
  LayoutDashboard,
  Megaphone,
  School,
  ScrollText,
  Settings,
  Table2,
  Users,
} from "lucide-react";

import { AppShell, type NavItem } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth.functions";
import { useLanguage } from "@/lib/language-context";

const nav: NavItem[] = [
  { to: "/staff", label: "সারসংক্ষেপ", icon: <LayoutDashboard className="size-4" />, exact: true },
  { to: "/staff/classes", label: "ক্লাসভিত্তিক ড্যাশবোর্ড", icon: <School className="size-4" /> },
  { to: "/staff/tickets", label: "Issue Desk", icon: <Table2 className="size-4" /> },
  { to: "/staff/captain-voice", label: "ক্যাপ্টেন ভয়েস", icon: <Megaphone className="size-4" /> },
  { to: "/staff/students", label: "শিক্ষার্থী ডেটাবেজ", icon: <Users className="size-4" /> },
  { to: "/staff/notices", label: "নোটিশ", icon: <Bell className="size-4" /> },
  { to: "/staff/audit", label: "অ্যাক্টিভিটি লগ", icon: <ScrollText className="size-4" /> },
  { to: "/staff/settings", label: "সেটিংস", icon: <Settings className="size-4" /> },
];

export const Route = createFileRoute("/staff")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (user.role === "student") throw redirect({ to: "/student" });
    if (user.role !== "staff") throw redirect({ to: "/" });
    return { staff: user };
  },
  component: StaffLayout,
});

function StaffLayout() {
  const { staff } = Route.useRouteContext();
  const { t } = useLanguage();

  return (
    <AppShell
      nav={nav}
      variant="staff"
      title={staff.username}
      subtitle={t("সাপোর্ট টিম", "Support Team")}
    >
      <Outlet />
    </AppShell>
  );
}

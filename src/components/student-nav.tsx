import {
  Bell,
  FilePlus2,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  UserRound,
  Users,
} from "lucide-react";

import type { NavItem } from "@/components/AppShell";

/** One sidebar for students and captains; captains get the Captain Voice section too. */
export function buildStudentNav(isCaptain: boolean): NavItem[] {
  return [
    {
      to: "/student",
      label: "ড্যাশবোর্ড",
      icon: <LayoutDashboard className="size-4" />,
      exact: true,
    },
    { to: "/student/report", label: "সমস্যা জানান", icon: <FilePlus2 className="size-4" /> },
    { to: "/student/issues", label: "আমার সমস্যা", icon: <ListChecks className="size-4" /> },
    ...(isCaptain
      ? [
          {
            to: "/captain",
            label: "ক্যাপ্টেন ভয়েস",
            icon: <Megaphone className="size-4" />,
            exact: true,
          },
          { to: "/captain/submissions", label: "আমার জমা", icon: <Inbox className="size-4" /> },
          {
            to: "/captain/class-issues",
            label: "ক্লাসের সমস্যা",
            icon: <Users className="size-4" />,
          },
        ]
      : []),
    { to: "/student/notices", label: "নোটিশ", icon: <Bell className="size-4" /> },
    { to: "/student/profile", label: "প্রোফাইল", icon: <UserRound className="size-4" /> },
  ];
}

export function studentSubtitle(isCaptain: boolean, loginNumber: string, language: "bn" | "en") {
  if (!isCaptain) return loginNumber;
  return `${language === "bn" ? "ক্লাস ক্যাপ্টেন" : "Class Captain"} · ${loginNumber}`;
}

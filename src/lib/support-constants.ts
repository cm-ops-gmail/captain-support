export const CATEGORIES = [
  "App",
  "Website",
  "Product/Course Content",
  "Live/Recorded Class",
  "Exam/Quiz",
  "Payment/Subscription",
  "Account/Login",
  "Experience/Feedback",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Optional second-level type per category. "Other" is always allowed. */
export const SUB_TYPES: Record<Category, string[]> = {
  App: [
    "Crash",
    "Slow / Freeze",
    "Login problem",
    "Video won't play",
    "Download / Offline",
    "Notification",
    "UI / Display bug",
    "Other",
  ],
  Website: [
    "Page not loading",
    "Slow / Freeze",
    "Login problem",
    "Video won't play",
    "UI / Display bug",
    "Broken link",
    "Other",
  ],
  "Product/Course Content": [
    "Wrong / missing content",
    "Lecture sheet / PDF",
    "Content quality",
    "Course access",
    "Other",
  ],
  "Live/Recorded Class": [
    "Video won't play",
    "Audio problem",
    "Buffering",
    "Class missing",
    "Wrong schedule",
    "Other",
  ],
  "Exam/Quiz": ["Can't submit", "Wrong answer key", "Result not showing", "Timer problem", "Other"],
  "Payment/Subscription": [
    "Payment failed",
    "Charged but no access",
    "Refund",
    "Coupon / Discount",
    "Other",
  ],
  "Account/Login": [
    "Can't log in",
    "OTP not received",
    "Change phone / email",
    "Profile info",
    "Other",
  ],
  "Experience/Feedback": [
    "Suggestion",
    "Complaint",
    "Teacher / Instructor",
    "Support experience",
    "Appreciation",
    "Other",
  ],
  Other: ["Other"],
};

export const PLATFORMS = ["android", "ios", "web", "desktop", "other"] as const;
export type Platform = (typeof PLATFORMS)[number];

const PLATFORM_LABELS: Record<Platform, { en: string; bn: string }> = {
  android: { en: "Android app", bn: "অ্যান্ড্রয়েড অ্যাপ" },
  ios: { en: "iPhone / iPad app", bn: "আইফোন / আইপ্যাড অ্যাপ" },
  web: { en: "Website (browser)", bn: "ওয়েবসাইট (ব্রাউজার)" },
  desktop: { en: "Desktop app", bn: "ডেস্কটপ অ্যাপ" },
  other: { en: "Other", bn: "অন্যান্য" },
};

export function labelPlatform(
  value: string | null | undefined,
  language: DisplayLanguage = "en",
): string {
  if (!value) return "—";
  return PLATFORM_LABELS[value as Platform]?.[language] ?? value;
}

/* ------------------------------ Captain Voice ------------------------------ */

export const CAPTAIN_KINDS = ["improvement", "experience", "proposal"] as const;
export type CaptainKind = (typeof CAPTAIN_KINDS)[number];

export const CAPTAIN_KIND_LABELS: Record<
  CaptainKind,
  { en: string; bn: string; hintEn: string; hintBn: string }
> = {
  improvement: {
    en: "Improvement pointer",
    bn: "উন্নতির পরামর্শ",
    hintEn: "Something 10MS can do better in the App, Website, classes or content.",
    hintBn: "অ্যাপ, ওয়েবসাইট, ক্লাস বা কনটেন্টে ১০ মিনিট স্কুল কী আরও ভালো করতে পারে।",
  },
  experience: {
    en: "Experience",
    bn: "অভিজ্ঞতা",
    hintEn: "Share your class's experience with TenTen — what works and what doesn't.",
    hintBn: "টেনটেন নিয়ে তোমার ক্লাসের অভিজ্ঞতা শেয়ার করো — কী ভালো লাগছে, কী লাগছে না।",
  },
  proposal: {
    en: "Proposal / Plan",
    bn: "প্রস্তাব / পরিকল্পনা",
    hintEn: "A concrete plan or initiative you'd like 10MS to try.",
    hintBn: "একটি নির্দিষ্ট পরিকল্পনা বা উদ্যোগ যা তুমি চাও ১০ মিনিট স্কুল চেষ্টা করুক।",
  },
};

export const CAPTAIN_AREAS = [
  "App",
  "Website",
  "Product/Content",
  "Classes",
  "Exams",
  "Community",
  "Support",
  "Other",
] as const;

const CAPTAIN_AREA_BN: Record<string, string> = {
  App: "অ্যাপ",
  Website: "ওয়েবসাইট",
  "Product/Content": "প্রোডাক্ট / কনটেন্ট",
  Classes: "ক্লাস",
  Exams: "পরীক্ষা",
  Community: "কমিউনিটি",
  Support: "সাপোর্ট",
  Other: "অন্যান্য",
};

export function labelCaptainArea(
  value: string | null | undefined,
  language: DisplayLanguage = "en",
): string {
  if (!value) return "—";
  return language === "bn" ? (CAPTAIN_AREA_BN[value] ?? value) : value;
}

export const CAPTAIN_STATUSES = [
  "New",
  "Under Review",
  "Planned",
  "Implemented",
  "Declined",
] as const;
export type CaptainStatus = (typeof CAPTAIN_STATUSES)[number];

export const CAPTAIN_STATUS_STYLES: Record<string, string> = {
  New: "bg-status-open/15 text-status-open border-status-open/30",
  "Under Review": "bg-status-review/15 text-status-review border-status-review/30",
  Planned: "bg-status-waiting/15 text-status-waiting border-status-waiting/30",
  Implemented: "bg-status-resolved/15 text-status-resolved border-status-resolved/30",
  Declined: "bg-status-closed/15 text-status-closed border-status-closed/30",
};

const CAPTAIN_STATUS_BN: Record<string, string> = {
  New: "নতুন",
  "Under Review": "পর্যালোচনাধীন",
  Planned: "পরিকল্পনায় আছে",
  Implemented: "বাস্তবায়িত",
  Declined: "গৃহীত হয়নি",
};

export function labelCaptainStatus(
  value: string | null | undefined,
  language: DisplayLanguage = "en",
): string {
  if (!value) return "—";
  return language === "bn" ? (CAPTAIN_STATUS_BN[value] ?? value) : value;
}

export function labelCaptainKind(
  value: string | null | undefined,
  language: DisplayLanguage = "en",
): string {
  if (!value) return "—";
  return CAPTAIN_KIND_LABELS[value as CaptainKind]?.[language] ?? value;
}

export const STATUSES = ["Open", "In Progress", "Resolved", "Closed"] as const;
export type TicketStatus = (typeof STATUSES)[number];
export type DisplayLanguage = "bn" | "en";

export const STATUS_STYLES: Record<string, string> = {
  Open: "bg-status-open/15 text-status-open border-status-open/30",
  "In Progress": "bg-status-review/15 text-status-review border-status-review/30",
  Resolved: "bg-status-resolved/15 text-status-resolved border-status-resolved/30",
  Closed: "bg-status-closed/15 text-status-closed border-status-closed/30",
};

export const STATUS_SHORT: Record<string, string> = {
  Open: "Open",
  "In Progress": "In Progress",
  Resolved: "Resolved",
  Closed: "Closed",
};

export const ALLOWED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "video/mp4",
  "video/webm",
];
export const MAX_FILE_MB = 8;
export const MAX_FILES = 5;

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const PRIORITY_BN: Record<string, string> = {
  Normal: "সাধারণ",
  normal: "সাধারণ",
  High: "গুরুত্বপূর্ণ",
  high: "গুরুত্বপূর্ণ",
  Important: "গুরুত্বপূর্ণ",
  important: "গুরুত্বপূর্ণ",
  Urgent: "অতি জরুরি",
  urgent: "অতি জরুরি",
  Low: "কম",
  low: "কম",
};

const CATEGORY_BN: Record<string, string> = {
  App: "অ্যাপ",
  Website: "ওয়েবসাইট",
  "Product/Course Content": "প্রোডাক্ট / কোর্স কনটেন্ট",
  "Live/Recorded Class": "লাইভ / রেকর্ডেড ক্লাস",
  "Exam/Quiz": "পরীক্ষা / কুইজ",
  "Payment/Subscription": "পেমেন্ট / সাবস্ক্রিপশন",
  "Account/Login": "অ্যাকাউন্ট / লগইন",
  "Experience/Feedback": "অভিজ্ঞতা / মতামত",
  Other: "অন্যান্য",
};

const SUB_TYPE_BN: Record<string, string> = {
  Crash: "অ্যাপ বন্ধ হয়ে যায়",
  "Slow / Freeze": "ধীর / আটকে যায়",
  "Login problem": "লগইন সমস্যা",
  "Video won't play": "ভিডিও চলে না",
  "Download / Offline": "ডাউনলোড / অফলাইন",
  Notification: "নোটিফিকেশন",
  "UI / Display bug": "ডিসপ্লে / ডিজাইনে সমস্যা",
  "Page not loading": "পেজ লোড হয় না",
  "Broken link": "লিংক কাজ করে না",
  "Wrong / missing content": "ভুল / অনুপস্থিত কনটেন্ট",
  "Lecture sheet / PDF": "লেকচার শিট / পিডিএফ",
  "Content quality": "কনটেন্টের মান",
  "Course access": "কোর্সে প্রবেশ",
  "Audio problem": "অডিও সমস্যা",
  Buffering: "বাফারিং",
  "Class missing": "ক্লাস পাওয়া যাচ্ছে না",
  "Wrong schedule": "ভুল সময়সূচি",
  "Can't submit": "জমা দেওয়া যায় না",
  "Wrong answer key": "উত্তরপত্রে ভুল",
  "Result not showing": "ফলাফল দেখাচ্ছে না",
  "Timer problem": "টাইমারে সমস্যা",
  "Payment failed": "পেমেন্ট ব্যর্থ",
  "Charged but no access": "টাকা কেটেছে কিন্তু অ্যাক্সেস নেই",
  Refund: "রিফান্ড",
  "Coupon / Discount": "কুপন / ছাড়",
  "Can't log in": "লগইন করা যায় না",
  "OTP not received": "ওটিপি আসেনি",
  "Change phone / email": "ফোন / ইমেইল পরিবর্তন",
  "Profile info": "প্রোফাইলের তথ্য",
  Suggestion: "পরামর্শ",
  Complaint: "অভিযোগ",
  "Teacher / Instructor": "শিক্ষক / ইন্সট্রাক্টর",
  "Support experience": "সাপোর্টের অভিজ্ঞতা",
  Appreciation: "প্রশংসা",
  Other: "অন্যান্য",
};

export function labelSubType(
  value: string | null | undefined,
  language: DisplayLanguage = "en",
): string {
  if (!value) return "—";
  return language === "bn" ? (SUB_TYPE_BN[value] ?? value) : value;
}

const STATUS_BN: Record<string, string> = {
  Open: "খোলা",
  "In Progress": "কাজ চলছে",
  Resolved: "সমাধান হয়েছে",
  Closed: "বন্ধ",
  "In Review": "পর্যালোচনাধীন",
  "Waiting for Information": "তথ্যের অপেক্ষায়",
};

export function labelCategory(
  value: string | null | undefined,
  language: DisplayLanguage = "en",
): string {
  if (!value) return "—";
  return language === "bn" ? (CATEGORY_BN[value] ?? value) : value;
}

export function labelStatus(
  value: string | null | undefined,
  short = false,
  language: DisplayLanguage = "en",
): string {
  if (!value) return "—";
  if (language === "bn") return STATUS_BN[value] ?? value;
  return short ? (STATUS_SHORT[value] ?? value) : value;
}

export function labelPriority(
  value: string | null | undefined,
  language: DisplayLanguage = "bn",
): string {
  if (!value) return "—";
  if (language === "en") return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  return PRIORITY_BN[value] ?? value;
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export function bn(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

export function formatDateBn(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("bn-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShortBn(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("bn-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatBytesBn(bytes: number | null | undefined): string {
  return bn(formatBytes(bytes));
}

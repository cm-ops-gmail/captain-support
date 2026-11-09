/**
 * Single source of truth for Cap10 class segments.
 * Keep in sync with the CHECK constraints in supabase/migrations/*_cap10_init.sql.
 */
export const CLASS_SEGMENTS = [
  "class_6",
  "class_7",
  "class_8",
  "class_9",
  "ssc_27",
  "ssc_28",
  "hsc_27",
  "hsc_28",
] as const;

export type ClassSegment = (typeof CLASS_SEGMENTS)[number];
export type Language = "bn" | "en";

export const SEGMENT_LABELS: Record<ClassSegment, { en: string; bn: string }> = {
  class_6: { en: "Class 6", bn: "ষষ্ঠ শ্রেণি" },
  class_7: { en: "Class 7", bn: "সপ্তম শ্রেণি" },
  class_8: { en: "Class 8", bn: "অষ্টম শ্রেণি" },
  class_9: { en: "Class 9", bn: "নবম শ্রেণি" },
  ssc_27: { en: "SSC 27", bn: "এসএসসি ২৭" },
  ssc_28: { en: "SSC 28", bn: "এসএসসি ২৮" },
  hsc_27: { en: "HSC 27", bn: "এইচএসসি ২৭" },
  hsc_28: { en: "HSC 28", bn: "এইচএসসি ২৮" },
};

/** Accent colour per segment for dashboard cards (Tailwind classes). */
export const SEGMENT_ACCENTS: Record<ClassSegment, string> = {
  class_6: "from-sky-500/15 border-sky-500/30 text-sky-700",
  class_7: "from-cyan-500/15 border-cyan-500/30 text-cyan-700",
  class_8: "from-teal-500/15 border-teal-500/30 text-teal-700",
  class_9: "from-emerald-500/15 border-emerald-500/30 text-emerald-700",
  ssc_27: "from-amber-500/15 border-amber-500/30 text-amber-700",
  ssc_28: "from-orange-500/15 border-orange-500/30 text-orange-700",
  hsc_27: "from-rose-500/15 border-rose-500/30 text-rose-700",
  hsc_28: "from-red-600/15 border-red-600/30 text-red-700",
};

export function isClassSegment(value: unknown): value is ClassSegment {
  return typeof value === "string" && (CLASS_SEGMENTS as readonly string[]).includes(value);
}

export function segmentLabel(value: string | null | undefined, language: Language = "en"): string {
  if (!value) return "—";
  return isClassSegment(value) ? SEGMENT_LABELS[value][language] : value;
}

/**
 * Parses free-form CSV values ("Class 6", "class-6", "6", "SSC 27",
 * "SSC-2027", "hsc28", "এইচএসসি ২৮") into a segment id.
 */
export function parseClassSegment(raw: string | null | undefined): ClassSegment | null {
  if (!raw) return null;
  const bnDigits = "০১২৩৪৫৬৭৮৯";
  const ascii = raw.replace(/[০-৯]/g, (d) => String(bnDigits.indexOf(d)));
  const value = ascii
    .trim()
    .toLowerCase()
    .replace(/[\s_\-.]+/g, "");
  if (isClassSegment(raw.trim().toLowerCase())) return raw.trim().toLowerCase() as ClassSegment;
  for (const segment of CLASS_SEGMENTS) {
    if (SEGMENT_LABELS[segment].bn.replace(/\s+/g, "") === raw.trim().replace(/\s+/g, ""))
      return segment;
  }
  const classMatch = value.match(/^(?:class)?([6-9])$/);
  if (classMatch) return `class_${classMatch[1]}` as ClassSegment;
  const examMatch = value.match(/^(ssc|hsc)(?:20)?(27|28)$/);
  if (examMatch) return `${examMatch[1]}_${examMatch[2]}` as ClassSegment;
  return null;
}

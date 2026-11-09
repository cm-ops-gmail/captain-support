import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, FileAudio, FileText, FileVideo, ImageIcon, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getAttachmentUrl } from "@/lib/attachments.functions";
import { useLanguage } from "@/lib/language-context";
import { formatBytesBn, formatDateShortBn } from "@/lib/support-constants";

export type AttachmentRow = {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  external_url: string | null;
  storage_path: string | null;
  created_at: string;
};

function iconFor(type: string | null) {
  if (!type) return <FileText className="size-4" />;
  if (type === "link") return <Link2 className="size-4" />;
  if (type.startsWith("image/")) return <ImageIcon className="size-4" />;
  if (type.startsWith("audio/")) return <FileAudio className="size-4" />;
  if (type.startsWith("video/")) return <FileVideo className="size-4" />;
  return <FileText className="size-4" />;
}

function formatBytesEn(bytes: number | null) {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1024;
    unit += 1;
  } while (value >= 1024 && unit < units.length - 1);
  return `${Number(value.toFixed(value >= 10 ? 1 : 2))} ${units[unit]}`;
}

function formatDateEn(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(parsed);
}

export function AttachmentList({ attachments }: { attachments: AttachmentRow[] }) {
  const { language, t } = useLanguage();
  const resolve = useServerFn(getAttachmentUrl);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function load(id: string) {
    setLoading(id);
    try {
      const { url } = await resolve({ data: { id } });
      setUrls((prev) => ({ ...prev, [id]: url }));
      return url;
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("এই সংযুক্তিটি খোলা যায়নি।", "Could not open this attachment."),
      );
      return null;
    } finally {
      setLoading(null);
    }
  }

  if (!attachments.length) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        {t("এই টিকিটে কোনো সংযুক্তি নেই।", "There are no attachments on this ticket.")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {attachments.map((attachment) => {
        const type = attachment.file_type ?? "";
        const url = urls[attachment.id];
        const isImage = type.startsWith("image/");
        const isAudio = type.startsWith("audio/");
        const isVideo = type.startsWith("video/");
        const isLink = type === "link" || (!!attachment.external_url && !attachment.storage_path);
        return (
          <li key={attachment.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-muted-foreground">{iconFor(attachment.file_type)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{attachment.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {isLink
                    ? t("এক্সটার্নাল লিংক", "External link")
                    : (attachment.file_type ?? t("ফাইল", "File"))}{" "}
                  ·{" "}
                  {isLink
                    ? "—"
                    : language === "bn"
                      ? formatBytesBn(attachment.file_size)
                      : formatBytesEn(attachment.file_size)}{" "}
                  ·{" "}
                  {language === "bn"
                    ? formatDateShortBn(attachment.created_at)
                    : formatDateEn(attachment.created_at)}
                </p>
              </div>
              {isLink ? (
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={attachment.external_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    <ExternalLink className="size-4" />
                    {t("লিংক খুলুন", "Open link")}
                  </a>
                </Button>
              ) : url ? (
                <Button size="sm" variant="outline" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                    {t("খুলুন", "Open")}
                  </a>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading === attachment.id}
                  onClick={() => load(attachment.id)}
                >
                  {loading === attachment.id
                    ? t("লোড হচ্ছে...", "Loading...")
                    : isImage || isAudio || isVideo
                      ? t("প্রিভিউ", "Preview")
                      : t("ডাউনলোড", "Download")}
                </Button>
              )}
            </div>
            {url && isImage ? (
              <img
                src={url}
                alt={attachment.file_name}
                className="mt-3 max-h-80 w-auto rounded-lg border border-border"
                loading="lazy"
              />
            ) : null}
            {url && isAudio ? <audio className="mt-3 w-full" controls src={url} /> : null}
            {url && isVideo ? (
              <video className="mt-3 max-h-80 w-full rounded-lg" controls src={url} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

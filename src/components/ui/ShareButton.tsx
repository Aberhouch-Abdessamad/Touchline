"use client";

import { Share2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title: string;
  text?: string;
  className?: string;
  withLabel?: boolean;
}

export function ShareButton({
  title,
  text,
  className,
  withLabel = false,
}: ShareButtonProps) {
  const { push } = useToast();
  const { t } = useI18n();

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // The user dismissed the native sheet; fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      push(t.common.shareCopied, "success");
    } catch {
      push(t.matches.share.clipboardError, "error");
    }
  };

  return (
    <button
      type="button"
      className={cn("icon-button", withLabel && "icon-button--labelled", className)}
      onClick={share}
      aria-label={t.matches.share.page}
      title={t.matches.share.page}
    >
      <Share2 size={17} aria-hidden="true" />
      {withLabel ? <span>{t.common.share}</span> : null}
    </button>
  );
}

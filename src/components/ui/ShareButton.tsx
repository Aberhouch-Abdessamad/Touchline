"use client";

import { Share2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
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
      push("Link copied to clipboard.", "success");
    } catch {
      push("Could not access the clipboard. Copy the address bar instead.", "error");
    }
  };

  return (
    <button
      type="button"
      className={cn("icon-button", withLabel && "icon-button--labelled", className)}
      onClick={share}
      aria-label="Share this page"
      title="Share this page"
    >
      <Share2 size={17} aria-hidden="true" />
      {withLabel ? <span>Share</span> : null}
    </button>
  );
}

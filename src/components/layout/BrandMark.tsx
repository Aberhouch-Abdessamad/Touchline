import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("brand-mark", className)} aria-hidden="true">
      <svg viewBox="0 0 36 36" role="presentation">
        <path
          d="M7 27V9h22v18H7Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity="0.32"
        />
        <path
          d="M7 18h22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity="0.32"
        />
        <circle
          cx="18"
          cy="18"
          r="4.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity="0.32"
        />
        <path
          d="M11 26.5 18 8l7 18.5"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="20" r="2.4" fill="var(--accent)" />
      </svg>
    </span>
  );
}

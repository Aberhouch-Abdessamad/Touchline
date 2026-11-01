import { cn, initials } from "@/lib/utils";

interface LogoProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  decorative?: boolean;
}

export function TeamLogo({
  src,
  name,
  size = 28,
  className,
  decorative = true,
}: LogoProps) {
  if (!src) {
    return (
      <span
        className={cn("crest crest--fallback", className)}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(9, Math.round(size * 0.34)),
        }}
        aria-hidden={decorative ? "true" : undefined}
        aria-label={decorative ? undefined : name}
      >
        {initials(name)}
      </span>
    );
  }
  return (
    <span
      className={cn("crest", className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={decorative ? "" : name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

export function LeagueLogo({
  src,
  name,
  size = 40,
  className,
  decorative = true,
}: LogoProps) {
  if (!src) {
    return (
      <span
        className={cn("league-mark league-mark--fallback", className)}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(9, Math.round(size * 0.3)),
        }}
        aria-hidden={decorative ? "true" : undefined}
        aria-label={decorative ? undefined : name}
      >
        {initials(name)}
      </span>
    );
  }
  return (
    <span
      className={cn("league-mark", className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={decorative ? "" : name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

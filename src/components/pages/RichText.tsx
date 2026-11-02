"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Minimal rich-text renderer for dictionary strings. Dictionary prose may use
 * two inline marks (see `src/lib/i18n/domains/content.ts`):
 *
 * - `[label](/href)` → a `<Link>` for internal paths (external URLs open in a
 *   new tab with `rel="noopener noreferrer"`).
 * - `` `code` `` → an inline `<code>` run. Code, paths and JSON stay verbatim
 *   in both languages.
 *
 * Interpolate first (`f()`), then render through this component.
 */

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/;
const CODE_PATTERN = /`([^`]+)`/;

function renderCodeRuns(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remainder = text;
  let index = 0;
  for (;;) {
    const match = CODE_PATTERN.exec(remainder);
    if (!match) {
      if (remainder) {
        nodes.push(<span key={`${keyPrefix}txt${index}`}>{remainder}</span>);
      }
      return nodes;
    }
    if (match.index > 0) {
      nodes.push(
        <span key={`${keyPrefix}txt${index}`}>{remainder.slice(0, match.index)}</span>,
      );
    }
    nodes.push(<code key={`${keyPrefix}code${index}`}>{match[1]}</code>);
    remainder = remainder.slice(match.index + match[0].length);
    index += 1;
  }
}

function renderRichText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remainder = text;
  let index = 0;
  for (;;) {
    const match = LINK_PATTERN.exec(remainder);
    if (!match) {
      nodes.push(...renderCodeRuns(remainder, `p${index}`));
      return nodes;
    }
    if (match.index > 0) {
      nodes.push(...renderCodeRuns(remainder.slice(0, match.index), `p${index}`));
    }
    const [, label, href] = match;
    if (href.startsWith("/")) {
      nodes.push(
        <Link key={`link${index}`} href={href}>
          {label}
        </Link>,
      );
    } else {
      nodes.push(
        <a key={`link${index}`} href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>,
      );
    }
    remainder = remainder.slice(match.index + match[0].length);
    index += 1;
  }
}

export function RichText({ text }: { text: string }) {
  return <>{renderRichText(text)}</>;
}

/**
 * Dictionary values: strings, arrays of strings, nested objects, or arrays of
 * labelled objects (e.g. FAQ entries). Keep arrays homogeneous so the typed
 * `ar` side can structurally match the `en` side.
 */
export type DictNode =
  | string
  | { readonly [key: string]: DictNode }
  | readonly DictNode[];

/**
 * Define one translated domain. The `ar` side must structurally match the
 * `en` side (same keys, both sides typed), so a missing Arabic key is a
 * compile error.
 */
export function defineDomain<N extends DictNode>(domain: { en: N; ar: N }) {
  return domain;
}

/**
 * Public product name for the AI analyst, used anywhere the assistant is
 * shown to people (badges, notes, error messages). It deliberately carries no
 * provider, gateway or model identity: the deployment's real model id stays
 * server-side in `AI_MODEL` and is never stored or returned.
 */
export const AI_PUBLIC_NAME = "Touchline AI";

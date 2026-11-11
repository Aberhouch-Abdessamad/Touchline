/**
 * Server start-up hook (Next.js instrumentation). Starts the background
 * verification of AI predictions: finished matches are detected, their actual
 * results fetched from the football API and each stored prediction evaluated.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startBackgroundVerification } = await import(
    "@/lib/predictions/maintain"
  );
  startBackgroundVerification();
}

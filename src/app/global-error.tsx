"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "40px 20px",
          background: "#f5f3ed",
          color: "#141c17",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <main style={{ maxWidth: 520, textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#6b766e",
            }}
          >
            Touchline
          </p>
          <h1
            style={{
              margin: "10px 0 0",
              fontSize: 30,
              lineHeight: 1.12,
              letterSpacing: "-0.04em",
            }}
          >
            The app could not start
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 14,
              lineHeight: 1.6,
              color: "#4a554d",
            }}
          >
            A fatal error stopped the root layout from rendering. Reloading
            usually clears it. Your locally stored favourites are unaffected.
          </p>
          {error.digest ? (
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#6b766e" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 22,
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "10px 16px",
                border: 0,
                borderRadius: 10,
                background: "#1d2a22",
                color: "#f5f3ed",
                fontSize: 13,
                fontWeight: 650,
                cursor: "pointer",
              }}
            >
              Reload the app
            </button>
            <a
              href="/"
              style={{
                padding: "10px 16px",
                border: "1px solid #d8d4c7",
                borderRadius: 10,
                color: "#141c17",
                fontSize: 13,
                fontWeight: 650,
                textDecoration: "none",
              }}
            >
              Go to the home page
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}

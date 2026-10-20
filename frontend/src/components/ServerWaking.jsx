import { useServerHealth } from "../hooks/useServerHealth";

/**
 * Non-blocking banner shown while the backend is still waking up.
 *
 * Appears only after 3 seconds without a reply, so a healthy server is
 * never announced. The page stays usable underneath — this informs, it
 * does not gate.
 *
 * Context: Render's free tier sleeps the backend after ~15 minutes, and
 * the first request afterwards takes 30-50 seconds.
 */
export default function ServerWaking() {
  const { status } = useServerHealth();

  if (status === "checking" || status === "awake") return null;

  const down = status === "down";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 9998,
        maxWidth: 560,
        margin: "0 auto",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 18px",
        borderRadius: "var(--radius-md)",
        background: "var(--color-bg-surface)",
        border: `1px solid ${down ? "var(--color-status-danger)" : "var(--color-border-strong)"}`,
        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        fontFamily: "var(--sansf)",
        fontSize: 13.5,
        lineHeight: 1.6,
        color: "var(--color-text-primary)",
      }}
    >
      {!down && (
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            width: 14,
            height: 14,
            marginTop: 3,
            borderRadius: "50%",
            border: "2px solid var(--color-border-default)",
            borderTopColor: "var(--color-bg-primary)",
            animation: "spin 0.9s linear infinite",
          }}
        />
      )}

      <div>
        {down ? (
          <>
            <strong style={{ display: "block", marginBottom: 2 }}>
              Can&apos;t reach the server
            </strong>
            <span style={{ color: "var(--color-text-secondary)" }}>
              The server did not respond. Please refresh the page, or try again
              in a few minutes.
            </span>
          </>
        ) : (
          <>
            <strong style={{ display: "block", marginBottom: 2 }}>
              Waking up the server
            </strong>
            <span style={{ color: "var(--color-text-secondary)" }}>
              This can take up to a minute on the free hosting tier. The page
              will work normally as soon as it responds.
            </span>
          </>
        )}
      </div>
    </div>
  );
}

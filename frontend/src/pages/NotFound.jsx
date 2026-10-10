import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DASHBOARDS = {
  user:         "/user",
  phlebotomist: "/phlebotomist",
  admin:        "/admin",
  mlt:          "/mlt",
};

/**
 * 404.
 *
 * Previously `path="*"` silently redirected to the dashboard or home,
 * so a mistyped or dead link bounced the user with no explanation and
 * looked like a bug. This tells them what happened and offers the right
 * way back depending on whether they are signed in.
 */
export default function NotFound() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const home = user ? DASHBOARDS[user.role] || "/" : "/";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--color-bg-page)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--sansf)",
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <p
          style={{
            fontFamily: "var(--monof)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
            marginBottom: 14,
          }}
        >
          Error 404
        </p>

        <h1
          style={{
            fontFamily: "var(--display)",
            fontSize: 34,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            marginBottom: 14,
          }}
        >
          We couldn&apos;t find that page.
        </h1>

        <p
          style={{
            fontSize: 15,
            lineHeight: 1.65,
            color: "var(--color-text-secondary)",
            marginBottom: 10,
          }}
        >
          The address may be mistyped, or the page may have moved.
        </p>

        <p
          style={{
            fontFamily: "var(--monof)",
            fontSize: 12.5,
            color: "var(--color-text-muted)",
            wordBreak: "break-all",
            marginBottom: 28,
          }}
        >
          {pathname}
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn btn-primary" to={home}>
            {user ? "Back to your dashboard" : "Back to the home page"}
          </Link>
          {!user && (
            <Link className="btn btn-outline" to="/login">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

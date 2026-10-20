import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";

/**
 * The app below the router. Shared by the browser entry (main.jsx) and
 * the build-time pre-render (entry-server.jsx) so the two render the
 * same tree; hydration fails on any difference.
 *
 * ErrorBoundary sits inside the router so its fallback can still use
 * router context, and outside AuthProvider so a failure while restoring
 * the session is caught too rather than blanking the page.
 */
export default function AppShell() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            // Ink and paper from theme.css (was an unrelated navy palette).
            style: {
              background:   "#16211F",
              color:        "#F4F2ED",
              border:       "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              fontFamily:   "var(--sansf)",
              fontSize:     "14px",
            },
            success: { iconTheme: { primary: "#2E7D57", secondary: "#fff" } },
            error:   { iconTheme: { primary: "#B3261E", secondary: "#fff" } },
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}

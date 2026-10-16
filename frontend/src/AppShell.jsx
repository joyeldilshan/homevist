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
            style: {
              background: "#1a2235",
              color:      "#F1F5F9",
              border:     "1px solid #1e2d45",
            },
            success: { iconTheme: { primary: "#10B981", secondary: "#fff" } },
            error:   { iconTheme: { primary: "#C62828", secondary: "#fff" } },
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

/*
 * ErrorBoundary sits inside BrowserRouter so its fallback can still use
 * router context, and outside AuthProvider so a failure while restoring
 * the session is caught too rather than blanking the page.
 */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/*
      * Opt in to the two v7 behaviours React Router already warns about
      * on every page load. Both are safe here: there is no Suspense
      * boundary for startTransition to interact with, and the only splat
      * route ("*" -> NotFound) renders no nested relative links.
      *
      * Silences two console warnings per page view and removes two
      * behaviour changes from the eventual v7 upgrade, which the
      * dependency advisories will require anyway.
      */}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
    </BrowserRouter>
  </React.StrictMode>
);

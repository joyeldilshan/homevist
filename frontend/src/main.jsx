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
    <BrowserRouter>
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

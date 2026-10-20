import { Component } from "react";

/**
 * Catches render errors anywhere below it so a single bad component
 * cannot blank the whole app.
 *
 * Must be a class: React has no hook equivalent of componentDidCatch.
 *
 * Note what this does NOT catch, so nobody assumes more coverage than
 * there is: event handlers, async code, and errors thrown inside the
 * boundary itself. Those still need their own try/catch — the API layer
 * in utils/api.js already handles request failures.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Left as console.error on purpose: this is the one place where
    // losing the stack would make a production bug genuinely unfixable.
    // Wire this to a reporting service (Sentry etc.) when you have one.
    console.error("Unhandled render error:", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.assign("/");
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isDev = import.meta.env.DEV;

    return (
      <div
        role="alert"
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
            Something went wrong
          </p>

          <h1
            style={{
              fontFamily: "var(--display)",
              fontSize: 30,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              marginBottom: 14,
            }}
          >
            This page could not be displayed.
          </h1>

          <p
            style={{
              fontSize: 15,
              lineHeight: 1.65,
              color: "var(--color-text-secondary)",
              marginBottom: 26,
            }}
          >
            The error has been logged. Your data has not been affected — nothing
            was saved or changed by this.
          </p>

          <button className="btn btn-primary" onClick={this.handleReload}>
            Back to the start
          </button>

          {/* Stack only in development — never leak internals to a user. */}
          {isDev && (
            <pre
              style={{
                marginTop: 28,
                padding: 14,
                textAlign: "left",
                overflow: "auto",
                maxHeight: 220,
                fontSize: 12,
                lineHeight: 1.5,
                background: "var(--color-bg-subtle)",
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-secondary)",
              }}
            >
              {String(error?.stack || error)}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

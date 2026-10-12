import { vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * Shared harness for rendering authenticated pages without a backend.
 *
 * The API layer, the auth context and the socket hook are all mocked, so
 * these tests need no server and no database. They answer one question:
 * does this page render for this role without throwing?
 *
 * They deliberately do NOT assert on data, because the data is fake. Real
 * data flow is covered by the browser sweep in scripts/dashboard-sweep.mjs.
 */

export const ROLE_USERS = {
  admin:        { _id: "a1", name: "Alex Morgan",  email: "admin@example.com",        role: "admin" },
  user:         { _id: "u1", name: "Jamie Price",  email: "patient@example.com",      role: "user", address: "1 Sample Street, Cardiff, CF10 1AA" },
  phlebotomist: { _id: "p1", name: "Sam Okafor",   email: "phlebotomist1@example.com", role: "phlebotomist", isAvailable: true },
  mlt:          { _id: "m1", name: "Jordan Ellis", email: "lab@example.com",          role: "mlt" },
};

/**
 * Every GET the dashboards make, answered with an empty collection.
 * Empty is the interesting case: it exercises the empty-state branches
 * that a populated database would skip.
 */
export function makeApiMock() {
  const empty = (key) => Promise.resolve({ data: { success: true, [key]: [] } });
  return {
    default: {
      get: vi.fn((url) => {
        if (url.includes("/bookings"))      return empty("bookings");
        if (url.includes("/test-types"))    return empty("testTypes");
        if (url.includes("/phlebotomists")) return empty("phlebotomists");
        if (url.includes("/plans"))         return empty("plans");
        if (url.includes("/subscriptions")) return empty("subscriptions");
        if (url.includes("/reports"))       return empty("reports");
        if (url.includes("/samples"))       return empty("samples");
        return Promise.resolve({ data: { success: true } });
      }),
      post:  vi.fn(() => Promise.resolve({ data: { success: true } })),
      patch: vi.fn(() => Promise.resolve({ data: { success: true } })),
      put:   vi.fn(() => Promise.resolve({ data: { success: true } })),
      delete: vi.fn(() => Promise.resolve({ data: { success: true } })),
    },
    API_BASE_URL: "http://localhost:5000/api",
  };
}

export function renderPage(ui, { route = "/" } = {}) {
  // Same future flags as main.jsx, so tests exercise the real router
  // behaviour and do not emit the v7 warnings into test output.
  return render(
    <MemoryRouter
      initialEntries={[route]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      {ui}
    </MemoryRouter>
  );
}

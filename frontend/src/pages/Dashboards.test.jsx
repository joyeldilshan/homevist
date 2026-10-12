import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderPage, ROLE_USERS, makeApiMock } from "../test/renderWithMocks";

/**
 * Render smoke tests for Login and all four dashboards.
 *
 * No backend and no database: the API layer, auth context and socket
 * hook are mocked. Each test asks only "does this page render for this
 * role without throwing", which is the class of bug that took the
 * landing page down.
 *
 * What these do NOT cover is listed in the README section added with
 * this change — chiefly real data shapes, and anything that only
 * happens after a successful network round-trip.
 */

vi.mock("../utils/api", () => makeApiMock());
vi.mock("../../utils/api", () => makeApiMock());

// Socket hook: no server in tests.
vi.mock("../hooks/useSocket", () => ({
  useBookingSocket: () => ({ connected: false }),
  useSocket: () => ({ connected: false }),
}));
vi.mock("../../hooks/useSocket", () => ({
  useBookingSocket: () => ({ connected: false }),
  useSocket: () => ({ connected: false }),
}));

// Auth context: swapped per test via setAuthUser below.
let currentUser = null;
const authMock = {
  useAuth: () => ({
    user: currentUser,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  }),
  AuthProvider: ({ children }) => children,
};
vi.mock("../context/AuthContext", () => authMock);
vi.mock("../../context/AuthContext", () => authMock);

const setAuthUser = (u) => { currentUser = u; };

/* Imported after the mocks are registered. */
const { default: Login }        = await import("./Login");
const { default: UserDash }     = await import("./user/Dashboard");
const { default: AdminDash }    = await import("./admin/Dashboard");
const { default: PhleboDash }   = await import("./phlebotomist/Dashboard");
const { default: MltDash }      = await import("./mlt/Dashboard");

const PAGES = [
  { name: "Login",                  Component: Login,      user: null },
  { name: "Patient dashboard",      Component: UserDash,   user: ROLE_USERS.user },
  { name: "Admin dashboard",        Component: AdminDash,  user: ROLE_USERS.admin },
  { name: "Phlebotomist dashboard", Component: PhleboDash, user: ROLE_USERS.phlebotomist },
  { name: "Lab (MLT) dashboard",    Component: MltDash,    user: ROLE_USERS.mlt },
];

describe("page render smoke tests", () => {
  let errorSpy;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
    setAuthUser(null);
  });

  for (const { name, Component, user } of PAGES) {
    it(`${name} renders without throwing`, () => {
      setAuthUser(user);
      expect(() => renderPage(<Component />)).not.toThrow();
    });

    it(`${name} logs no React render errors`, () => {
      setAuthUser(user);
      renderPage(<Component />);
      const logged = errorSpy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(logged).not.toMatch(/Cannot read propert/i);
      expect(logged).not.toMatch(/is not a function/i);
      expect(logged).not.toMatch(/does not recognize the .* prop/i);
    });
  }
});

describe("Login specifics", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    setAuthUser(null);
  });
  afterEach(() => { vi.restoreAllMocks(); setAuthUser(null); });

  it("shows the sign-in form", () => {
    renderPage(<Login />);
    expect(document.querySelector('input[type="email"]')).toBeTruthy();
    expect(document.querySelector("#login-password")).toBeTruthy();
  });

  /*
   * Demo mode is off unless VITE_DEMO_MODE=true. The panel must not
   * appear — and crucially no demo email may be in the DOM — in a
   * default build.
   */
  it("does not show the demo panel by default", () => {
    const { container } = renderPage(<Login />);
    expect(screen.queryByText(/try the demo/i)).toBeNull();
    expect(container.textContent).not.toMatch(/admin@example\.com/);
    expect(container.textContent).not.toMatch(/phlebotomist1@example\.com/);
  });
});

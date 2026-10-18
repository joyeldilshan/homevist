import { describe, it, expect } from "vitest";
import { dashboardFor, tabFromSearch } from "./returnTo";

describe("dashboardFor", () => {
  it("returns to the dashboard link a signed-out patient opened", () => {
    expect(dashboardFor("user", { pathname: "/user", search: "?tab=reports" })).toBe("/user?tab=reports");
  });
  it("never sends anyone to another role's page or anywhere else", () => {
    expect(dashboardFor("user", { pathname: "/admin", search: "?tab=x" })).toBe("/user");
    expect(dashboardFor("admin", { pathname: "/user", search: "?tab=reports" })).toBe("/admin");
    expect(dashboardFor("user", { pathname: "//evil.example.com", search: "" })).toBe("/user");
    expect(dashboardFor("mlt", undefined)).toBe("/mlt");
  });
});

describe("tabFromSearch", () => {
  const ids = ["home", "reports"];
  it("opens a known tab", () => expect(tabFromSearch("?tab=reports", ids, "home")).toBe("reports"));
  it("ignores an unknown or missing tab", () => {
    expect(tabFromSearch("?tab=admin", ids, "home")).toBe("home");
    expect(tabFromSearch("", ids, "home")).toBe("home");
  });
});

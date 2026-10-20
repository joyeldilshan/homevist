/**
 * Where to go after signing in.
 *
 * Each role has one dashboard. When a signed-out visitor opened a
 * dashboard link (the report email links to /user?tab=reports), the route
 * guard sends them to sign-in with that location; afterwards they return
 * to it, query included, but only if it is their own role's dashboard.
 * The path is never taken from the link itself, so this cannot redirect
 * anywhere else.
 */
export const DASHBOARDS = {
  user:         "/user",
  phlebotomist: "/phlebotomist",
  admin:        "/admin",
  mlt:          "/mlt",
};

export function dashboardFor(role, from) {
  const home = DASHBOARDS[role] || "/user";
  if (from && from.pathname === home && typeof from.search === "string" && from.search.startsWith("?")) {
    return home + from.search;
  }
  return home;
}

/** The tab named in ?tab=, if it is one of the given ids. */
export function tabFromSearch(search, ids, fallback) {
  const t = new URLSearchParams(search || "").get("tab");
  return t && ids.includes(t) ? t : fallback;
}

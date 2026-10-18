import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { DASHBOARDS, dashboardFor } from "./utils/returnTo";
import StorageNotice   from "./components/StorageNotice";
import ServerWaking    from "./components/ServerWaking";

/*
 * Route-level code splitting.
 *
 * Everything used to ship in one ~641 kB chunk, so a visitor who only
 * ever sees the landing page still downloaded all four dashboards. Each
 * route is now its own chunk, fetched when it is first visited.
 *
 * Home is lazy too, so its stylesheet (pages/landing/landing.css, most
 * of the app's CSS) is split out and /login, /register and the
 * dashboards never download it. It costs the landing page nothing: "/"
 * is pre-rendered, so it paints from HTML before any JS, and
 * scripts/prerender.mjs links Home's CSS and modulepreloads its chunk
 * in that page's <head>. On a client-side visit, Vite's dynamic-import
 * helper waits for the CSS before the page renders, so there is no
 * unstyled flash.
 */
const Home            = lazy(() => import("./pages/Home"));

const AuthPage        = lazy(() => import("./pages/Login"));
const UserDashboard   = lazy(() => import("./pages/user/Dashboard"));
const PhleboDashboard = lazy(() => import("./pages/phlebotomist/Dashboard"));
const AdminDashboard  = lazy(() => import("./pages/admin/Dashboard"));
const MLTDashboard    = lazy(() => import("./pages/mlt/Dashboard"));
const Privacy         = lazy(() => import("./pages/Privacy"));
const Terms           = lazy(() => import("./pages/Terms"));
const NotFound        = lazy(() => import("./pages/NotFound"));

// Shown while a page's chunk loads. Same paper ground and brand dot as
// the pages themselves (it used to be a near-black screen with an emoji).
function Loading() {
  return (
    <div role="status" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, minHeight:"100vh",
                                background:"var(--color-bg-page)", color:"var(--color-text-secondary)", fontFamily:"var(--sansf)", fontSize:15 }}>
      <span aria-hidden="true" style={{ width:12, height:12, borderRadius:"50%", background:"var(--terracotta-600)", animation:"ping 1.2s ease-out infinite" }} />
      Loading…
    </div>
  );
}

function RoleRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  // Remember where they were going (e.g. the report email's link to
  // /user?tab=reports) so sign-in can return them there.
  if (!user)              return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== role) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;

  // Maps each role to its dashboard path. Unknown roles → null (no redirect).
  const dash = user ? DASHBOARDS[user.role] : null;
  // After signing in on /login: back to the dashboard link they opened.
  const afterSignIn = user ? dashboardFor(user.role, location.state?.from) : null;

  return (
    <>
      {/* Chunk fetches are fast; this only shows if the network is slow. */}
      <Suspense fallback={<Loading />}>
        <Routes>
        <Route path="/" element={ dash ? <Navigate to={dash} replace /> : <Home /> } />

        <Route path="/home"     element={<Home />} />
        <Route path="/login"    element={ dash ? <Navigate to={afterSignIn} replace /> : <AuthPage /> } />
        <Route path="/register" element={ dash ? <Navigate to={afterSignIn} replace /> : <AuthPage /> } />

        {/* Public — reachable while signed out and while signed in */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms"   element={<Terms />} />

        <Route path="/user"         element={<RoleRoute role="user"><UserDashboard /></RoleRoute>} />
        <Route path="/phlebotomist" element={<RoleRoute role="phlebotomist"><PhleboDashboard /></RoleRoute>} />
        <Route path="/admin"        element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>} />
        <Route path="/mlt" element={<RoleRoute role="mlt"><MLTDashboard /></RoleRoute>} />

        {/* Show a real 404 rather than silently bouncing the user. */}
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <StorageNotice />
      <ServerWaking />
    </>
  );
}
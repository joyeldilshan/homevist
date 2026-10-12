import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import StorageNotice   from "./components/StorageNotice";
import ServerWaking    from "./components/ServerWaking";

/*
 * Route-level code splitting.
 *
 * Everything used to ship in one ~641 kB chunk, so a visitor who only
 * ever sees the landing page still downloaded all four dashboards. Each
 * route is now its own chunk, fetched when it is first visited.
 *
 * Home is eagerly imported on purpose: it is the first paint for most
 * visitors, and lazy-loading it would add a network round-trip before
 * anything appears.
 */
import Home from "./pages/Home";

const AuthPage        = lazy(() => import("./pages/Login"));
const UserDashboard   = lazy(() => import("./pages/user/Dashboard"));
const PhleboDashboard = lazy(() => import("./pages/phlebotomist/Dashboard"));
const AdminDashboard  = lazy(() => import("./pages/admin/Dashboard"));
const MLTDashboard    = lazy(() => import("./pages/mlt/Dashboard"));
const Privacy         = lazy(() => import("./pages/Privacy"));
const Terms           = lazy(() => import("./pages/Terms"));
const NotFound        = lazy(() => import("./pages/NotFound"));

// Maps each role to its dashboard path. Unknown roles → null (no redirect).
const DASHBOARDS = {
  user:         "/user",
  phlebotomist: "/phlebotomist",
  admin:        "/admin",
  mlt:          "/mlt",
};

function Loading() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#07080F" }}>
      <div style={{ fontSize:40 }}>🩸</div>
    </div>
  );
}

function RoleRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user)              return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;

  const dash = user ? DASHBOARDS[user.role] : null;

  return (
    <>
      {/* Chunk fetches are fast; this only shows if the network is slow. */}
      <Suspense fallback={<Loading />}>
        <Routes>
        <Route path="/" element={ dash ? <Navigate to={dash} replace /> : <Home /> } />

        <Route path="/home"     element={<Home />} />
        <Route path="/login"    element={ dash ? <Navigate to={dash} replace /> : <AuthPage /> } />
        <Route path="/register" element={ dash ? <Navigate to={dash} replace /> : <AuthPage /> } />

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
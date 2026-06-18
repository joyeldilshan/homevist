import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Home            from "./pages/Home";
import AuthPage        from "./pages/Login";
import UserDashboard   from "./pages/user/Dashboard";
import PhleboDashboard from "./pages/phlebotomist/Dashboard";
import AdminDashboard  from "./pages/admin/Dashboard";
import MLTDashboard from "./pages/mlt/Dashboard"; 

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
    <Routes>
      <Route path="/" element={ dash ? <Navigate to={dash} replace /> : <Home /> } />

      <Route path="/home"     element={<Home />} />
      <Route path="/login"    element={ dash ? <Navigate to={dash} replace /> : <AuthPage /> } />
      <Route path="/register" element={ dash ? <Navigate to={dash} replace /> : <AuthPage /> } />

      <Route path="/user"         element={<RoleRoute role="user"><UserDashboard /></RoleRoute>} />
      <Route path="/phlebotomist" element={<RoleRoute role="phlebotomist"><PhleboDashboard /></RoleRoute>} />
      <Route path="/admin"        element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>} />
      <Route path="/mlt" element={<RoleRoute role="mlt"><MLTDashboard /></RoleRoute>} />

      <Route path="*" element={<Navigate to={dash || "/"} replace />} />
    </Routes>
  );
}
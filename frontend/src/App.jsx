import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Home            from "./pages/home";
import AuthPage        from "./pages/Login";
import UserDashboard   from "./pages/user/Dashboard";
import PhleboDashboard from "./pages/phlebotomist/Dashboard";
import AdminDashboard  from "./pages/admin/Dashboard";

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

  return (
    <Routes>
      {/* Home — if already logged in, go to their dashboard */}
      <Route path="/" element={
        user
          ? <Navigate to={`/${user.role}`} replace />
          : <Home />
      } />

      <Route path="/home"     element={<Home />} />
      <Route path="/login"    element={user ? <Navigate to={`/${user.role}`} replace /> : <AuthPage />} />
      <Route path="/register" element={user ? <Navigate to={`/${user.role}`} replace /> : <AuthPage />} />

      <Route path="/user"         element={<RoleRoute role="user"><UserDashboard /></RoleRoute>} />
      <Route path="/phlebotomist" element={<RoleRoute role="phlebotomist"><PhleboDashboard /></RoleRoute>} />
      <Route path="/admin"        element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
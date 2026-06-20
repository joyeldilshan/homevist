import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

// ── Auth context ───────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Restore user from sessionStorage on first load.
  // sessionStorage is cleared when the tab is closed, so a new visitor
  // always starts logged-out on the home page.
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // On mount, if a token exists, the stored user is trusted.
  // (api.js auto-attaches the token to every request.)
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setUser(null);
    }
    setLoading(false);
  }, []);

  // Save auth data consistently
  const persist = (data) => {
    const token = data.token || data.accessToken;
    const u     = data.user  || data.data?.user || data.data || null;
    if (token) sessionStorage.setItem("token", token);
    if (u) {
      sessionStorage.setItem("user", JSON.stringify(u));
      setUser(u);
    }
    return u;
  };

  // ── Login ──
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const u = persist(res.data);
    if (!u) throw new Error("Login response missing user.");
    return u;
  };

  // ── Register ──
  const register = async (payload) => {
    const res = await api.post("/auth/register", payload);
    const u = persist(res.data);
    if (!u) throw new Error("Register response missing user.");
    return u;
  };

  // ── Logout ──
  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
  };

  // ── Update local user object (e.g. after profile/availability change) ──
  const updateUser = (patch) => {
    setUser(prev => {
      const next = { ...prev, ...patch };
      sessionStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}

export default AuthContext;
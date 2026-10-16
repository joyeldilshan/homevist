import { createContext, useContext, useState } from "react";
import api from "../utils/api";

// ── Auth context ───────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Restore user from sessionStorage on first load.
  // sessionStorage is cleared when the tab is closed, so a new visitor
  // always starts logged-out on the home page.
  //
  // Read synchronously, not in an effect: both values are in the same
  // synchronous store, so there is nothing to wait for. The old effect
  // made every first render the full-screen <Loading /> instead of the
  // page, which flashed on every visit and would replace the
  // pre-rendered landing page (scripts/prerender.mjs) on hydration.
  // A stored user is only trusted alongside a token; api.js attaches the
  // token to every request. On the server, sessionStorage does not exist
  // and the catch returns null — the signed-out page, as pre-rendered.
  const [user, setUser] = useState(() => {
    try {
      const token  = sessionStorage.getItem("token");
      const stored = sessionStorage.getItem("user");
      return token && stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  // Kept for the consumers that read it; restoring is now synchronous.
  const loading = false;

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
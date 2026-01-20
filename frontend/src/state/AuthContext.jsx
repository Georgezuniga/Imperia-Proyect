import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("token", token || "");
    if (!token) {
      localStorage.removeItem("user");
      setUser(null);
    }
  }, [token]);

  async function refreshMe() {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.auth.me(token);
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
    } catch (e) {
      setToken("");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refreshMe(); }, []); // eslint-disable-line

  async function login(email, password) {
    const data = await api.auth.login({ email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  async function register(full_name, email, password) {
    const data = await api.auth.register({ full_name, email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  function logout() {
    setToken("");
    setUser(null);
    localStorage.removeItem("user");
  }

  const value = useMemo(() => ({ token, user, loading, login, register, logout, refreshMe }), [token, user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

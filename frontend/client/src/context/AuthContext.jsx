import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("blockpay_token")));

  useEffect(() => {
    if (!localStorage.getItem("blockpay_token")) {
      return;
    }

    api
      .profile()
      .then((data) => setUser(data.user))
      .catch(() => setToken(""))
      .finally(() => setLoading(false));
  }, []);

  async function login(payload) {
    const data = await api.login(payload);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const data = await api.register(payload);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    setToken("");
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, setUser, loading, login, register, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

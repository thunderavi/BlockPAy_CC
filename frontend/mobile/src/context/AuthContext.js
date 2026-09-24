import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setAuthToken, setUnauthorizedHandler } from "../services/api";
const TOKEN_KEY = "blockpay_jwt"; const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [token, setToken] = useState(null); const [loading, setLoading] = useState(true);
  const clearSession = useCallback(async () => { setAuthToken(""); setToken(null); setUser(null); await SecureStore.deleteItemAsync(TOKEN_KEY); }, []);
  const restoreSession = useCallback(async () => { setLoading(true); try { const stored = await SecureStore.getItemAsync(TOKEN_KEY); if (!stored) return; setAuthToken(stored); const data = await api.profile(); setToken(stored); setUser(data.user); } catch { await clearSession(); } finally { setLoading(false); } }, [clearSession]);
  useEffect(() => { restoreSession(); }, [restoreSession]); useEffect(() => { setUnauthorizedHandler(clearSession); return () => setUnauthorizedHandler(null); }, [clearSession]);
  async function applyAuth(data) { setAuthToken(data.token); await SecureStore.setItemAsync(TOKEN_KEY, data.token); setToken(data.token); setUser(data.user); return data.user; }
  const login = (p) => api.login(p).then(applyAuth); const register = (p) => api.register(p).then(applyAuth);
  const logout = async () => { try { await api.logout(); } catch {} await clearSession(); };
  const value = useMemo(() => ({ user, token, loading, setUser, login, register, logout, restoreSession }), [user, token, loading, restoreSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);

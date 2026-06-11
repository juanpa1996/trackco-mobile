import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiLogin, apiRegisterPushToken, type TraccarUser } from "../services/traccarService";
import { setOnUnauthorized } from "../services/authStore";
import { getExpoPushToken, requestNotificationPermissions, registerBackgroundFetch } from "../services/notificationService";

const STORAGE_KEY = "trackco_session";

interface AuthContextValue {
  token: string | null;
  user: TraccarUser | null;
  jsessionid: string | null;
  loading: boolean;
  sessionReady: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<TraccarUser | null>(null);
  const [jsessionid, setJsessionid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const { token: t, user: u, jsessionid: sid } = JSON.parse(raw);
          if (t && u) { setToken(t); setUser(u); setJsessionid(sid ?? null); }
        } catch { /* corrupt storage */ }
      }
      setSessionReady(true);
    });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setJsessionid(null);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  // Register logout as the 401 handler so any API call that gets "session expired" auto-logs out
  useEffect(() => {
    setOnUnauthorized(logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { token: t, user: u, jsessionid: sid } = await apiLogin(email, password);
      setToken(t);
      setUser(u);
      setJsessionid(sid);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token: t, user: u, jsessionid: sid }));

      const granted = await requestNotificationPermissions();
      if (granted) {
        registerBackgroundFetch();
        const pushToken = await getExpoPushToken();
        if (pushToken) apiRegisterPushToken(t, pushToken);
      }
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, jsessionid, loading, sessionReady, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be inside AuthProvider");
  return ctx;
}

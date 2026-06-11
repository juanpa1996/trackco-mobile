import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiEvents } from "../services/traccarService";
import { sendLocalAlert } from "../services/notificationService";
import { Alert } from "../services/alertService";
import { useAuthContext } from "./AuthContext";
import { useVehiclesContext } from "./VehiclesContext";
import { EVENT_LABEL, EVENT_COLOR } from "../utils/events";
import { timeAgo } from "../utils/time";

const POLL_MS = 10_000;
const ALERTS_STORAGE_KEY = "trackco_alerts";

interface AlertsContextValue {
  alerts: Alert[];
  unreadCount: number;
  setAlerts: (alerts: Alert[]) => void;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

export function AlertsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuthContext();
  const { devices } = useVehiclesContext();
  const [alerts, setAlertsState] = useState<Alert[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const devicesRef = useRef(devices);
  const tokenRef = useRef(token);
  useEffect(() => { devicesRef.current = devices; }, [devices]);

  // Load persisted alerts on mount
  useEffect(() => {
    AsyncStorage.getItem(ALERTS_STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setAlertsState(JSON.parse(raw)); } catch {}
      }
      setStorageLoaded(true);
    });
  }, []);

  // Persist alerts whenever they change (skip until storage is loaded to avoid overwriting)
  useEffect(() => {
    if (!storageLoaded || alerts.length === 0) return;
    AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts, storageLoaded]);

  // Clear persisted alerts on logout (token goes non-null → null)
  useEffect(() => {
    const wasLoggedIn = tokenRef.current !== null;
    tokenRef.current = token;
    if (wasLoggedIn && token === null) {
      setAlertsState([]);
      AsyncStorage.removeItem(ALERTS_STORAGE_KEY);
    }
  }, [token]);

  const fetchAlerts = useCallback(async (t: string) => {
    try {
      const events = await apiEvents(t);
      const nameMap = Object.fromEntries(devicesRef.current.map((d) => [d.id, d.name]));
      setAlertsState((prev) => {
        const prevIds = new Set(prev.map((a) => a.id));
        const newAlerts = events
          .filter((e) => !prevIds.has(String(e.id)))
          .map((e): Alert => ({
            id:          String(e.id),
            vehicleName: nameMap[e.deviceId] ?? String(e.deviceId),
            color:       EVENT_COLOR[e.type] ?? "#F59E0B",
            message:     EVENT_LABEL[e.type] ?? e.type,
            time:        timeAgo(e.serverTime),
            read:        false,
          }));

        newAlerts.slice(0, 3).forEach((a) => {
          sendLocalAlert(`⚠️ ${a.message}`, a.vehicleName);
        });
        if (newAlerts.length > 3) {
          sendLocalAlert(`${newAlerts.length} nuevas alertas`, "Abre la app para verlas");
        }

        return [...newAlerts, ...prev].slice(0, 100);
      });
    } catch {
      // Silently ignore — alert polling is best-effort
    }
  }, []);

  useEffect(() => {
    if (!storageLoaded || !token) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    fetchAlerts(token);
    timerRef.current = setInterval(() => fetchAlerts(token), POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [token, fetchAlerts, storageLoaded]);

  const setAlerts = useCallback((updated: Alert[]) => setAlertsState(updated), []);
  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <AlertsContext.Provider value={{ alerts, unreadCount, setAlerts }}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlertsContext(): AlertsContextValue {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlertsContext must be inside AlertsProvider");
  return ctx;
}

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  apiLogin, apiDevices, apiEvents,
  type TraccarUser, type TraccarDevice, type TraccarPosition, type TraccarEvent,
} from "../services/traccarService";
import { useTraccarSocket } from "../hooks/useTraccarSocket";
import { Vehicle } from "../data/mockData";
import { Alert } from "../services/alertService";
import {
  requestNotificationPermissions, sendLocalAlert, registerBackgroundFetch,
} from "../services/notificationService";

const STORAGE_KEY = "trackco_session";

const POLL_MS = 10_000;

function resolveType(category?: string): Vehicle["type"] {
  const c = (category ?? "").toLowerCase();
  if (c.includes("motorcycle") || c.includes("moto") || c.includes("scooter")) return "moto";
  if (c.includes("truck") || c.includes("van") || c.includes("bus")) return "truck";
  return "car";
}

function resolveStatus(device: TraccarDevice, position?: TraccarPosition, hasAlert?: boolean): Vehicle["status"] {
  if (hasAlert) return "alert";
  if (device.status === "offline") return "offline";
  const kmh = Math.round((position?.speed ?? 0) * 1.852);
  if (position?.attributes?.motion || kmh > 3) return "moving";
  return "stopped";
}

function timeAgo(iso: string): string {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Hace unos seg";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} d`;
}

const EVENT_LABEL: Record<string, string> = {
  deviceOverspeed: "Exceso de velocidad",
  geofenceExit:    "Salida de zona",
  geofenceEnter:   "Entrada a zona",
  ignitionOff:     "Motor apagado",
  ignitionOn:      "Motor encendido",
  deviceMoving:    "En movimiento",
  deviceStopped:   "Detenido",
  lowBattery:      "Batería baja",
  deviceOffline:   "Sin señal",
};

const EVENT_COLOR: Record<string, "#F59E0B" | "#EF4444" | "#6C47FF"> = {
  deviceOverspeed: "#EF4444",
  lowBattery:      "#EF4444",
  geofenceExit:    "#F59E0B",
  geofenceEnter:   "#F59E0B",
  deviceOffline:   "#EF4444",
  ignitionOff:     "#6C47FF",
  ignitionOn:      "#6C47FF",
  deviceMoving:    "#F59E0B",
  deviceStopped:   "#6C47FF",
};

interface AppContextValue {
  token: string | null;
  user: TraccarUser | null;
  jsessionid: string | null;
  vehicles: Vehicle[];
  alerts: Alert[];
  loading: boolean;
  sessionReady: boolean;
  error: string | null;
  unreadCount: number;
  wsConnected: boolean;
  focusedVehicleId: string | null;
  setFocusedVehicleId: (id: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setAlerts: (alerts: Alert[]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<TraccarUser | null>(null);
  const [jsessionid, setJsessionid] = useState<string | null>(null);
  const [baseDevices, setBaseDevices] = useState<TraccarDevice[]>([]);
  const [basePositions, setBasePositions] = useState<Record<number, TraccarPosition>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedVehicleId, setFocusedVehicleId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore session from storage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const { token: t, user: u, jsessionid: sid } = JSON.parse(raw);
          if (t && u) { setToken(t); setUser(u); setJsessionid(sid ?? null); }
        } catch { /* corrupt storage — ignore */ }
      }
      setSessionReady(true);
    });
  }, []);

  // WebSocket for live positions (replaces polling for position updates)
  const { positions: wsPositions, devices: wsDevices, connected: wsConnected } = useTraccarSocket(jsessionid);

  const fetchData = useCallback(async (t: string) => {
    try {
      setError(null);
      const [{ devices, positions }, events] = await Promise.all([
        apiDevices(t),
        apiEvents(t),
      ]);

      const posMap = Object.fromEntries(positions.map((p) => [p.deviceId, p]));
      setBaseDevices(devices);
      setBasePositions(posMap);

      const nameMap = Object.fromEntries(devices.map((d) => [d.id, d.name]));

      setAlerts((prev) => {
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

        // Fire local notification for each new alert (max 3)
        newAlerts.slice(0, 3).forEach((a) => {
          sendLocalAlert(`⚠️ ${a.message}`, a.vehicleName);
        });
        if (newAlerts.length > 3) {
          sendLocalAlert(`${newAlerts.length} nuevas alertas`, "Abre la app para verlas");
        }

        return [
          ...newAlerts,
          ...prev.map((a) => ({ ...a })),
        ].slice(0, 100); // keep last 100
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { token: t, user: u, jsessionid: sid } = await apiLogin(email, password);
      setToken(t);
      setUser(u);
      setJsessionid(sid);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token: t, user: u, jsessionid: sid }));
      // Request notification permissions after login and register background task
      requestNotificationPermissions().then((granted) => {
        if (granted) registerBackgroundFetch();
      });
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setJsessionid(null);
    setBaseDevices([]);
    setBasePositions({});
    setAlerts([]);
    if (timerRef.current) clearInterval(timerRef.current);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchData(token).finally(() => setLoading(false));
    timerRef.current = setInterval(() => fetchData(token), POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [token, fetchData]);

  // Merge base positions with live WebSocket positions — WS wins if available
  const vehicles: Vehicle[] = baseDevices.map((d): Vehicle => {
    const livePos = wsPositions[d.id];
    const basePos = basePositions[d.id];
    const pos = livePos ?? basePos;
    const kmh = Math.round((pos?.speed ?? 0) * 1.852);
    const wsDevice = wsDevices[d.id];
    const effectiveStatus = wsDevice?.status ?? d.status;
    return {
      id: String(d.id),
      name: d.name,
      plate: d.uniqueId,
      type: resolveType(d.category),
      status: resolveStatus({ ...d, status: effectiveStatus as TraccarDevice["status"] }, pos, false),
      speed: kmh,
      lat: pos?.latitude ?? 6.2442,
      lng: pos?.longitude ?? -75.5812,
      battery: pos?.attributes?.batteryLevel ?? 0,
      address: "—",
      lastUpdate: timeAgo(d.lastUpdate),
    };
  });

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <AppContext.Provider value={{
      token, user, jsessionid, vehicles, alerts, loading, sessionReady, error,
      unreadCount, wsConnected, focusedVehicleId, setFocusedVehicleId,
      login, logout, setAlerts,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be inside AppProvider");
  return ctx;
}

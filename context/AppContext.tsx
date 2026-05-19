import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import {
  apiLogin, apiDevices, apiEvents,
  type TraccarUser, type TraccarDevice, type TraccarPosition, type TraccarEvent,
} from "../services/traccarService";
import { Vehicle } from "../data/mockData";
import { Alert } from "../services/alertService";

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
  vehicles: Vehicle[];
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedVehicleId, setFocusedVehicleId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (t: string) => {
    try {
      setError(null);
      const [{ devices, positions }, events] = await Promise.all([
        apiDevices(t),
        apiEvents(t),
      ]);

      const posMap = Object.fromEntries(positions.map((p) => [p.deviceId, p]));
      const alertIds = new Set(events.map((e) => e.deviceId));
      const nameMap = Object.fromEntries(devices.map((d) => [d.id, d.name]));

      setVehicles(devices.map((d): Vehicle => {
        const pos = posMap[d.id];
        const kmh = Math.round((pos?.speed ?? 0) * 1.852);
        return {
          id: String(d.id),
          name: d.name,
          plate: d.uniqueId,
          type: resolveType(d.category),
          status: resolveStatus(d, pos, alertIds.has(d.id)),
          speed: kmh,
          lat: pos?.latitude ?? 6.2442,
          lng: pos?.longitude ?? -75.5812,
          battery: pos?.attributes?.batteryLevel ?? 0,
          address: "—",
          lastUpdate: timeAgo(d.lastUpdate),
        };
      }));

      setAlerts(events.map((e): Alert => ({
        id:          String(e.id),
        vehicleName: nameMap[e.deviceId] ?? String(e.deviceId),
        color:       EVENT_COLOR[e.type] ?? "#F59E0B",
        message:     EVENT_LABEL[e.type] ?? e.type,
        time:        timeAgo(e.serverTime),
        read:        false,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { token: t, user: u } = await apiLogin(email, password);
      setToken(t);
      setUser(u);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setVehicles([]);
    setAlerts([]);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchData(token).finally(() => setLoading(false));
    timerRef.current = setInterval(() => fetchData(token), POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [token, fetchData]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <AppContext.Provider value={{
      token, user, vehicles, alerts, loading, error,
      unreadCount, focusedVehicleId, setFocusedVehicleId,
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

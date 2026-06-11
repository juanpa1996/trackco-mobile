import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { apiEvents } from "../services/traccarService";
import { sendLocalAlert } from "../services/notificationService";
import { Alert } from "../services/alertService";
import { useAuthContext } from "./AuthContext";
import { useVehiclesContext } from "./VehiclesContext";

const POLL_MS = 10_000;

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

function timeAgo(iso: string): string {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Hace unos seg";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} d`;
}

interface AlertsContextValue {
  alerts: Alert[];
  unreadCount: number;
  setAlerts: (alerts: Alert[]) => void;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

export function AlertsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuthContext();
  const { devices } = useVehiclesContext();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const devicesRef = useRef(devices);
  useEffect(() => { devicesRef.current = devices; }, [devices]);

  const fetchAlerts = useCallback(async (t: string) => {
    try {
      const events = await apiEvents(t);
      const nameMap = Object.fromEntries(devicesRef.current.map((d) => [d.id, d.name]));
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

        newAlerts.slice(0, 3).forEach((a) => {
          sendLocalAlert(`⚠️ ${a.message}`, a.vehicleName);
        });
        if (newAlerts.length > 3) {
          sendLocalAlert(`${newAlerts.length} nuevas alertas`, "Abre la app para verlas");
        }

        return [...newAlerts, ...prev.map((a) => ({ ...a }))].slice(0, 100);
      });
    } catch {
      // silently ignore fetch errors for alerts
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setAlerts([]);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    fetchAlerts(token);
    timerRef.current = setInterval(() => fetchAlerts(token), POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [token, fetchAlerts]);

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

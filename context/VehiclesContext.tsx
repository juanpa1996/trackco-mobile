import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { apiDevices, type TraccarDevice, type TraccarPosition } from "../services/traccarService";
import { useTraccarSocket } from "../hooks/useTraccarSocket";
import { Vehicle } from "../data/mockData";
import { useAuthContext } from "./AuthContext";

const POLL_MS = 10_000;

const CATEGORY_TYPE_MAP: Record<string, Vehicle["type"]> = {
  car: "car", pickup: "car", offroad: "car", van: "car", default: "car", arrow: "car",
  motorcycle: "moto", moto: "moto", scooter: "moto",
  truck: "truck", bus: "truck", tractor: "truck",
  bicycle: "bicycle",
  boat: "boat", ship: "boat",
  person: "person",
  animal: "pet",
  phone: "phone",
  object: "object",
};

function resolveType(category?: string): Vehicle["type"] {
  return CATEGORY_TYPE_MAP[(category ?? "").toLowerCase().trim()] ?? "car";
}

function resolveStatus(device: TraccarDevice, position?: TraccarPosition): Vehicle["status"] {
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

interface VehiclesContextValue {
  vehicles: Vehicle[];
  devices: TraccarDevice[];
  loading: boolean;
  error: string | null;
  wsConnected: boolean;
  focusedVehicleId: string | null;
  setFocusedVehicleId: (id: string | null) => void;
}

const VehiclesContext = createContext<VehiclesContextValue | null>(null);

export function VehiclesProvider({ children }: { children: ReactNode }) {
  const { token, jsessionid } = useAuthContext();
  const [baseDevices, setBaseDevices] = useState<TraccarDevice[]>([]);
  const [basePositions, setBasePositions] = useState<Record<number, TraccarPosition>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedVehicleId, setFocusedVehicleId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { positions: wsPositions, devices: wsDevices, connected: wsConnected } = useTraccarSocket(jsessionid);
  const wsConnectedRef = useRef(wsConnected);
  useEffect(() => { wsConnectedRef.current = wsConnected; }, [wsConnected]);

  const fetchVehicles = useCallback(async (t: string) => {
    try {
      setError(null);
      const { devices, positions } = await apiDevices(t);
      const posMap = Object.fromEntries(positions.map((p) => [p.deviceId, p]));
      setBaseDevices(devices);
      setBasePositions(posMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setBaseDevices([]);
      setBasePositions({});
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setLoading(true);
    fetchVehicles(token).finally(() => setLoading(false));
    // Skip REST poll when WebSocket is active — WS already delivers live positions
    timerRef.current = setInterval(() => {
      if (!wsConnectedRef.current) fetchVehicles(token);
    }, POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [token, fetchVehicles]);

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
      status: resolveStatus({ ...d, status: effectiveStatus as TraccarDevice["status"] }, pos),
      speed: kmh,
      lat: pos?.latitude ?? 6.2442,
      lng: pos?.longitude ?? -75.5812,
      battery: pos?.attributes?.batteryLevel ?? 0,
      address: "—",
      lastUpdate: timeAgo(d.lastUpdate),
    };
  });

  return (
    <VehiclesContext.Provider value={{
      vehicles, devices: baseDevices, loading, error, wsConnected, focusedVehicleId, setFocusedVehicleId,
    }}>
      {children}
    </VehiclesContext.Provider>
  );
}

export function useVehiclesContext(): VehiclesContextValue {
  const ctx = useContext(VehiclesContext);
  if (!ctx) throw new Error("useVehiclesContext must be inside VehiclesProvider");
  return ctx;
}

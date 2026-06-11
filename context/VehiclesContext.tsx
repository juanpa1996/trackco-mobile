import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { apiDevices, type TraccarDevice, type TraccarPosition } from "../services/traccarService";
import { useTraccarSocket } from "../hooks/useTraccarSocket";
import { Vehicle } from "../data/mockData";
import { useAuthContext } from "./AuthContext";
import { timeAgo } from "../utils/time";
import { reverseGeocode } from "../utils/geocoding";

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
  const [addressMap, setAddressMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedVehicleId, setFocusedVehicleId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const geocodingRef = useRef<Set<string>>(new Set());
  const lastGeoKey = useRef<Record<string, string>>({});

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
      setAddressMap({});
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setLoading(true);
    fetchVehicles(token).finally(() => setLoading(false));
    // Skip REST poll for positions when WebSocket is active
    timerRef.current = setInterval(() => {
      if (!wsConnectedRef.current) fetchVehicles(token);
    }, POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [token, fetchVehicles]);

  // Resolve addresses when positions change (rate-limited via geocoding util)
  useEffect(() => {
    baseDevices.forEach((d) => {
      const id = String(d.id);
      const pos = wsPositions[d.id] ?? basePositions[d.id];
      if (!pos) return;

      const geoKey = `${pos.latitude.toFixed(4)},${pos.longitude.toFixed(4)}`;
      if (lastGeoKey.current[id] === geoKey || geocodingRef.current.has(id)) return;

      lastGeoKey.current[id] = geoKey;
      geocodingRef.current.add(id);
      reverseGeocode(pos.latitude, pos.longitude).then((addr) => {
        geocodingRef.current.delete(id);
        setAddressMap((prev) => ({ ...prev, [id]: addr }));
      });
    });
  }, [baseDevices, basePositions, wsPositions]);

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
      address: addressMap[String(d.id)] ?? "—",
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

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  apiGeofences, apiCreateGeofence, apiDeleteGeofence,
  type TraccarGeofence,
} from "../services/geofenceService";
import { shapeToWkt, type GeofenceShape } from "../utils/geofence";
import { useAuthContext } from "./AuthContext";

interface GeofencesContextValue {
  geofences: TraccarGeofence[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createGeofence: (name: string, shape: GeofenceShape, description?: string) => Promise<void>;
  removeGeofence: (id: number) => Promise<void>;
}

const GeofencesContext = createContext<GeofencesContextValue | null>(null);

export function GeofencesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuthContext();
  const [geofences, setGeofences] = useState<TraccarGeofence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setGeofences(await apiGeofences(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar geocercas");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) refresh();
    else setGeofences([]);
  }, [token, refresh]);

  const createGeofence = useCallback(
    async (name: string, shape: GeofenceShape, description?: string) => {
      if (!token) return;
      const created = await apiCreateGeofence(token, {
        name,
        area: shapeToWkt(shape),
        description,
      });
      setGeofences((prev) => [...prev, created]);
    },
    [token]
  );

  const removeGeofence = useCallback(
    async (id: number) => {
      if (!token) return;
      await apiDeleteGeofence(token, id);
      setGeofences((prev) => prev.filter((g) => g.id !== id));
    },
    [token]
  );

  return (
    <GeofencesContext.Provider
      value={{ geofences, loading, error, refresh, createGeofence, removeGeofence }}
    >
      {children}
    </GeofencesContext.Provider>
  );
}

export function useGeofencesContext(): GeofencesContextValue {
  const ctx = useContext(GeofencesContext);
  if (!ctx) throw new Error("useGeofencesContext must be inside GeofencesProvider");
  return ctx;
}

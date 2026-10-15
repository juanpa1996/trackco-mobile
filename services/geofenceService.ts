import { triggerUnauthorized } from "./authStore";

const API = "https://app.trackco.com.co/api";

export interface TraccarGeofence {
  id: number;
  name: string;
  description?: string;
  area: string; // WKT: CIRCLE (...) o POLYGON ((...))
  attributes?: Record<string, unknown>;
}

function checkUnauthorized(res: Response): void {
  if (res.status === 401) {
    triggerUnauthorized();
    throw new Error("Sesión expirada");
  }
}

/** Lista todas las geocercas del usuario. */
export async function apiGeofences(token: string): Promise<TraccarGeofence[]> {
  const res = await fetch(`${API}/traccar/geofences`, {
    headers: { "x-traccar-token": token },
  });
  checkUnauthorized(res);
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? "Error al cargar geocercas");
  return data.geofences ?? [];
}

/** Crea una geocerca. `area` en formato WKT. */
export async function apiCreateGeofence(
  token: string,
  payload: { name: string; area: string; description?: string }
): Promise<TraccarGeofence> {
  const res = await fetch(`${API}/traccar/geofences`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-traccar-token": token },
    body: JSON.stringify(payload),
  });
  checkUnauthorized(res);
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? "No se pudo crear la geocerca");
  return data.geofence;
}

/** Actualiza una geocerca existente. */
export async function apiUpdateGeofence(
  token: string,
  id: number,
  payload: { name: string; area: string; description?: string }
): Promise<TraccarGeofence> {
  const res = await fetch(`${API}/traccar/geofences/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-traccar-token": token },
    body: JSON.stringify({ id, ...payload }),
  });
  checkUnauthorized(res);
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? "No se pudo actualizar la geocerca");
  return data.geofence;
}

/** Elimina una geocerca. */
export async function apiDeleteGeofence(token: string, id: number): Promise<void> {
  const res = await fetch(`${API}/traccar/geofences/${id}`, {
    method: "DELETE",
    headers: { "x-traccar-token": token },
  });
  checkUnauthorized(res);
  // Traccar devuelve 204 sin cuerpo; el proxy puede devolver {success:true}
  if (res.status === 204) return;
  const data = await res.json().catch(() => ({ success: res.ok }));
  if (!data.success) throw new Error(data.error ?? "No se pudo eliminar la geocerca");
}

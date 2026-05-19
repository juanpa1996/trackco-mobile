const API = "https://app.trackco.com.co/api";

export interface TraccarUser {
  id: number;
  name: string;
  email: string;
  administrator: boolean;
}

export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: "online" | "offline" | "unknown";
  lastUpdate: string;
  category?: string;
  contact?: string;
}

export interface TraccarPosition {
  id: number;
  deviceId: number;
  fixTime: string;
  deviceTime: string;
  latitude: number;
  longitude: number;
  speed: number; // knots
  attributes?: {
    batteryLevel?: number;
    motion?: boolean;
    totalDistance?: number;
    [key: string]: unknown;
  };
}

export interface TraccarEvent {
  id: number;
  deviceId: number;
  type: string;
  serverTime: string;
}

export async function apiLogin(email: string, password: string): Promise<{ token: string; user: TraccarUser }> {
  const res = await fetch(`${API}/traccar/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? "Credenciales incorrectas");
  return { token: data.token, user: data.user };
}

export async function apiDevices(token: string): Promise<{ devices: TraccarDevice[]; positions: TraccarPosition[] }> {
  const res = await fetch(`${API}/traccar/devices`, {
    headers: { "x-traccar-token": token },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? "Error dispositivos");
  return { devices: data.devices ?? [], positions: data.positions ?? [] };
}

export async function apiEvents(token: string): Promise<TraccarEvent[]> {
  const res = await fetch(`${API}/traccar/events`, {
    headers: { "x-traccar-token": token },
  });
  const data = await res.json();
  return data.success ? (data.events ?? []) : [];
}

export async function apiHistory(
  token: string,
  deviceId: string,
  from: string,
  to: string
): Promise<TraccarPosition[]> {
  const params = new URLSearchParams({ deviceId, from, to });
  const res = await fetch(`${API}/traccar/history?${params}`, {
    headers: { "x-traccar-token": token },
  });
  const data = await res.json();
  return data.success ? (data.positions ?? []) : [];
}

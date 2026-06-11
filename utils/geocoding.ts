const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
let lastRequestAt = 0;

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

async function throttledFetch(lat: number, lng: number): Promise<string> {
  const now = Date.now();
  const wait = Math.max(0, lastRequestAt + 1100 - now);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
      {
        headers: { "User-Agent": "TrackCo-GPS/1.0 (contacto@trackco.com.co)" },
        signal: AbortSignal.timeout(5000),
      }
    );
    const data = await res.json();
    const a = data.address ?? {};
    const parts = [
      a.road ?? a.pedestrian ?? a.path,
      a.suburb ?? a.neighbourhood ?? a.quarter,
      a.city ?? a.town ?? a.municipality,
    ].filter(Boolean);
    return parts.join(", ") || data.display_name?.split(",")[0] || "—";
  } catch {
    return "—";
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = cacheKey(lat, lng);

  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const promise = throttledFetch(lat, lng).then((addr) => {
    cache.set(key, addr);
    pending.delete(key);
    return addr;
  });
  pending.set(key, promise);
  return promise;
}

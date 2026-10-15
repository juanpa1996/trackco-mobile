// Conversión entre geometría del mapa y el formato WKT que usa Traccar.
//
// Traccar guarda el campo `area` de cada geocerca en WKT, con el orden
// "latitud longitud" (separados por espacio) y los pares separados por coma:
//   Círculo:  CIRCLE (6.2518 -75.5636, 250)      -> centro + radio en metros
//   Polígono: POLYGON ((6.25 -75.56, 6.26 -75.57, 6.25 -75.58))

export interface LatLng {
  lat: number;
  lng: number;
}

export type GeofenceShape =
  | { kind: "circle"; center: LatLng; radius: number }   // radio en metros
  | { kind: "polygon"; points: LatLng[] };

const NUM = "(-?\\d+(?:\\.\\d+)?)";

/** Construye el WKT de un círculo (radio en metros). */
export function circleToWkt(center: LatLng, radius: number): string {
  return `CIRCLE (${center.lat} ${center.lng}, ${Math.round(radius)})`;
}

/** Construye el WKT de un polígono. Cierra el anillo automáticamente. */
export function polygonToWkt(points: LatLng[]): string {
  const ring = points.slice();
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first.lat !== last.lat || first.lng !== last.lng)) {
    ring.push(first); // WKT exige anillo cerrado
  }
  const coords = ring.map((p) => `${p.lat} ${p.lng}`).join(", ");
  return `POLYGON ((${coords}))`;
}

/** Convierte una figura a WKT. */
export function shapeToWkt(shape: GeofenceShape): string {
  return shape.kind === "circle"
    ? circleToWkt(shape.center, shape.radius)
    : polygonToWkt(shape.points);
}

/** Parsea el WKT de Traccar a una figura. Devuelve null si no se reconoce. */
export function wktToShape(area: string): GeofenceShape | null {
  if (!area) return null;
  const text = area.trim();

  const circle = new RegExp(`^CIRCLE\\s*\\(\\s*${NUM}\\s+${NUM}\\s*,\\s*${NUM}\\s*\\)$`, "i").exec(text);
  if (circle) {
    return {
      kind: "circle",
      center: { lat: parseFloat(circle[1]), lng: parseFloat(circle[2]) },
      radius: parseFloat(circle[3]),
    };
  }

  const polygon = /^POLYGON\s*\(\s*\((.+)\)\s*\)$/i.exec(text);
  if (polygon) {
    const points = polygon[1]
      .split(",")
      .map((pair) => pair.trim().split(/\s+/).map(Number))
      .filter((p) => p.length === 2 && p.every((n) => Number.isFinite(n)))
      .map(([lat, lng]) => ({ lat, lng }));
    if (points.length >= 3) return { kind: "polygon", points };
  }

  return null;
}

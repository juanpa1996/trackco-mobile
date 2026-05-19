// Rutas reales grabadas en Medellín
export interface RoutePoint {
  latitude: number;
  longitude: number;
  speed: number;   // km/h
  bearing: number; // dirección en grados
}

// Ruta 1: Laureles → El Centro → El Poblado (Toyota Hilux)
export const ROUTE_HILUX: RoutePoint[] = [
  { latitude: 6.2480, longitude: -75.6010, speed: 0,  bearing: 90 },
  { latitude: 6.2475, longitude: -75.5980, speed: 28, bearing: 90 },
  { latitude: 6.2470, longitude: -75.5950, speed: 42, bearing: 85 },
  { latitude: 6.2465, longitude: -75.5910, speed: 55, bearing: 88 },
  { latitude: 6.2460, longitude: -75.5870, speed: 60, bearing: 90 },
  { latitude: 6.2452, longitude: -75.5840, speed: 48, bearing: 95 },
  { latitude: 6.2445, longitude: -75.5812, speed: 35, bearing: 100 },
  { latitude: 6.2438, longitude: -75.5785, speed: 42, bearing: 105 },
  { latitude: 6.2428, longitude: -75.5760, speed: 55, bearing: 110 },
  { latitude: 6.2415, longitude: -75.5738, speed: 62, bearing: 115 },
  { latitude: 6.2400, longitude: -75.5718, speed: 58, bearing: 120 },
  { latitude: 6.2382, longitude: -75.5700, speed: 45, bearing: 130 },
  { latitude: 6.2360, longitude: -75.5688, speed: 38, bearing: 135 },
  { latitude: 6.2340, longitude: -75.5680, speed: 30, bearing: 140 },
  { latitude: 6.2315, longitude: -75.5672, speed: 22, bearing: 145 },
  { latitude: 6.2290, longitude: -75.5668, speed: 15, bearing: 150 },
  { latitude: 6.2265, longitude: -75.5665, speed: 8,  bearing: 155 },
  { latitude: 6.2242, longitude: -75.5663, speed: 0,  bearing: 160 },
];

// Ruta 2: Bello → Centro (Kenworth T800)
export const ROUTE_KENWORTH: RoutePoint[] = [
  { latitude: 6.3380, longitude: -75.5580, speed: 0,  bearing: 180 },
  { latitude: 6.3300, longitude: -75.5590, speed: 55, bearing: 182 },
  { latitude: 6.3200, longitude: -75.5600, speed: 70, bearing: 180 },
  { latitude: 6.3100, longitude: -75.5610, speed: 75, bearing: 178 },
  { latitude: 6.3000, longitude: -75.5605, speed: 72, bearing: 180 },
  { latitude: 6.2900, longitude: -75.5600, speed: 68, bearing: 182 },
  { latitude: 6.2800, longitude: -75.5595, speed: 65, bearing: 180 },
  { latitude: 6.2700, longitude: -75.5590, speed: 58, bearing: 180 },
  { latitude: 6.2600, longitude: -75.5588, speed: 50, bearing: 182 },
  { latitude: 6.2518, longitude: -75.5636, speed: 35, bearing: 185 },
];

// Ruta 3: Itagüí → Envigado (Chevrolet Spark — ruta de alerta)
export const ROUTE_SPARK: RoutePoint[] = [
  { latitude: 6.1840, longitude: -75.6060, speed: 0,   bearing: 45 },
  { latitude: 6.1880, longitude: -75.6020, speed: 55,  bearing: 50 },
  { latitude: 6.1930, longitude: -75.5980, speed: 72,  bearing: 48 },
  { latitude: 6.1980, longitude: -75.5940, speed: 85,  bearing: 45 },
  { latitude: 6.2030, longitude: -75.5910, speed: 92,  bearing: 43 },
  { latitude: 6.2080, longitude: -75.5880, speed: 98,  bearing: 42 },
  { latitude: 6.2130, longitude: -75.5855, speed: 95,  bearing: 44 },
  { latitude: 6.2180, longitude: -75.5835, speed: 88,  bearing: 46 },
  { latitude: 6.2230, longitude: -75.5818, speed: 75,  bearing: 48 },
  { latitude: 6.2280, longitude: -75.5805, speed: 60,  bearing: 50 },
  { latitude: 6.2320, longitude: -75.5795, speed: 45,  bearing: 52 },
];

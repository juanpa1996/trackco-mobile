export type VehicleStatus = "moving" | "stopped" | "alert" | "offline";

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  type: "car" | "moto" | "truck";
  status: VehicleStatus;
  speed: number;
  lat: number;
  lng: number;
  battery: number;
  address: string;
  lastUpdate: string;
}

export const VEHICLES: Vehicle[] = [
  {
    id: "v1",
    name: "Toyota Hilux",
    plate: "ABC-123",
    type: "car",
    status: "moving",
    speed: 62,
    lat: 6.2442,
    lng: -75.5812,
    battery: 95,
    address: "Av. El Poblado, Medellín",
    lastUpdate: "Hace 10 seg",
  },
  {
    id: "v2",
    name: "Honda CB500F",
    plate: "MED-456",
    type: "moto",
    status: "stopped",
    speed: 0,
    lat: 6.2518,
    lng: -75.5636,
    battery: 72,
    address: "Calle 10, El Centro",
    lastUpdate: "Hace 3 min",
  },
  {
    id: "v3",
    name: "Chevrolet Spark GT",
    plate: "CAR-789",
    type: "car",
    status: "alert",
    speed: 98,
    lat: 6.232,
    lng: -75.59,
    battery: 88,
    address: "Autopista Sur, Itagüí",
    lastUpdate: "Hace 5 seg",
  },
  {
    id: "v4",
    name: "Renault Logan",
    plate: "LOG-321",
    type: "car",
    status: "offline",
    speed: 0,
    lat: 6.268,
    lng: -75.57,
    battery: 12,
    address: "Bello, Antioquia",
    lastUpdate: "Hace 2 h",
  },
];

export const ALERTS = [
  { id: "a1", vehicleName: "Chevrolet Spark GT", message: "Exceso de velocidad: 98 km/h", time: "Hace 2 min", color: "#F59E0B", read: false },
  { id: "a2", vehicleName: "Renault Logan", message: "Batería baja del dispositivo: 12%", time: "Hace 2 h", color: "#EF4444", read: false },
  { id: "a3", vehicleName: "Toyota Hilux", message: "Salió de la zona permitida", time: "Hace 3 h", color: "#6C47FF", read: true },
];

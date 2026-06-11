export type VehicleStatus = "moving" | "stopped" | "alert" | "offline";

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  type: "car" | "moto" | "truck" | "bicycle" | "boat" | "person" | "pet" | "phone" | "object";
  status: VehicleStatus;
  speed: number;
  lat: number;
  lng: number;
  battery: number;
  address: string;
  lastUpdate: string;
}

import { VEHICLES, Vehicle } from "../data/mockData";

export function getVehicles(): Vehicle[] {
  return VEHICLES;
}

export function getVehicleById(id: string): Vehicle | undefined {
  return VEHICLES.find(v => v.id === id);
}

export function getFleetSummary() {
  return {
    total:   VEHICLES.length,
    moving:  VEHICLES.filter(v => v.status === "moving").length,
    stopped: VEHICLES.filter(v => v.status === "stopped").length,
    alert:   VEHICLES.filter(v => v.status === "alert").length,
    offline: VEHICLES.filter(v => v.status === "offline").length,
  };
}

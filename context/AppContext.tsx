import { ReactNode } from "react";
import { AuthProvider } from "./AuthContext";
import { VehiclesProvider } from "./VehiclesContext";
import { AlertsProvider } from "./AlertsContext";
import { GeofencesProvider } from "./GeofencesContext";

export { useAuthContext } from "./AuthContext";
export { useVehiclesContext } from "./VehiclesContext";
export { useAlertsContext } from "./AlertsContext";
export { useGeofencesContext } from "./GeofencesContext";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <VehiclesProvider>
        <AlertsProvider>
          <GeofencesProvider>
            {children}
          </GeofencesProvider>
        </AlertsProvider>
      </VehiclesProvider>
    </AuthProvider>
  );
}

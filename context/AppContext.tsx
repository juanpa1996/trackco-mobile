import { ReactNode } from "react";
import { AuthProvider } from "./AuthContext";
import { VehiclesProvider } from "./VehiclesContext";
import { AlertsProvider } from "./AlertsContext";

export { useAuthContext } from "./AuthContext";
export { useVehiclesContext } from "./VehiclesContext";
export { useAlertsContext } from "./AlertsContext";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <VehiclesProvider>
        <AlertsProvider>
          {children}
        </AlertsProvider>
      </VehiclesProvider>
    </AuthProvider>
  );
}

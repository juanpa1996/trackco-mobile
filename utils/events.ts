export const EVENT_LABEL: Record<string, string> = {
  deviceOverspeed: "Exceso de velocidad",
  geofenceExit:    "Salida de zona",
  geofenceEnter:   "Entrada a zona",
  ignitionOff:     "Motor apagado",
  ignitionOn:      "Motor encendido",
  deviceMoving:    "En movimiento",
  deviceStopped:   "Detenido",
  lowBattery:      "Batería baja",
  deviceOffline:   "Sin señal",
};

export const EVENT_COLOR: Record<string, "#F59E0B" | "#EF4444" | "#6C47FF"> = {
  deviceOverspeed: "#EF4444",
  lowBattery:      "#EF4444",
  geofenceExit:    "#F59E0B",
  geofenceEnter:   "#F59E0B",
  deviceOffline:   "#EF4444",
  ignitionOff:     "#6C47FF",
  ignitionOn:      "#6C47FF",
  deviceMoving:    "#F59E0B",
  deviceStopped:   "#6C47FF",
};

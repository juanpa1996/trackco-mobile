export const Colors = {
  bg:           "#060B18",
  surface:      "#0D1425",
  surfaceAlt:   "#111827",
  border:       "rgba(255,255,255,0.07)",
  borderLight:  "rgba(255,255,255,0.04)",

  primary:      "#00D4FF",
  primaryDark:  "#00B4D8",

  text:         "#F1F5F9",
  textSub:      "#94A3B8",
  textMuted:    "#64748B",
  textFaint:    "#475569",
  textDark:     "#334155",

  statusMoving:  "#10B981",
  statusStopped: "#64748B",
  statusAlert:   "#F59E0B",
  statusOffline: "#EF4444",

  alertSpeed:    "#F59E0B",
  alertBattery:  "#EF4444",
  alertGeo:      "#6C47FF",
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  22,
  xxl: 32,
} as const;

export const Radius = {
  sm:  8,
  md:  14,
  lg:  18,
  xl:  24,
  pill: 99,
} as const;

export const Font = {
  xs:   9,
  sm:   11,
  base: 13,
  md:   15,
  lg:   18,
  xl:   22,
  xxl:  26,
} as const;

export const statusColor = (status: string): string =>
  ({ moving: Colors.statusMoving, stopped: Colors.statusStopped,
     alert: Colors.statusAlert, offline: Colors.statusOffline }[status] ?? Colors.textMuted);

export const statusLabel = (status: string): string =>
  ({ moving: "En movimiento", stopped: "Detenido",
     alert: "Alerta", offline: "Sin señal" }[status] ?? status);

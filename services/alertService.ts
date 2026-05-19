import { ALERTS } from "../data/mockData";

export type Alert = typeof ALERTS[number];

export function getAlerts(): Alert[] {
  return [...ALERTS];
}

export function getUnreadCount(alerts: Alert[]): number {
  return alerts.filter(a => !a.read).length;
}

export type AlertType = "speed" | "battery" | "geo";

export function getAlertType(color: string): AlertType {
  if (color === "#F59E0B") return "speed";
  if (color === "#EF4444") return "battery";
  return "geo";
}

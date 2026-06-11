import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useAlertsContext } from "../context/AlertsContext";
import { useVehiclesContext } from "../context/VehiclesContext";
import { Colors, Spacing, Radius, Font } from "../theme";

type TabNav = BottomTabNavigationProp<{ Mapa: undefined; Unidades: undefined; Alertas: undefined }>;

type AlertColor = "#F59E0B" | "#EF4444" | "#6C47FF";

const ALERT_TYPES: { color: AlertColor; icon: string; label: string }[] = [
  { color: "#F59E0B", icon: "speedometer",       label: "Velocidad" },
  { color: "#EF4444", icon: "battery-alert",     label: "Batería"   },
  { color: "#6C47FF", icon: "map-marker-radius", label: "Geocerca"  },
];

export default function AlertsScreen() {
  const { alerts, setAlerts } = useAlertsContext();
  const { setFocusedVehicleId } = useVehiclesContext();
  const navigation = useNavigation<TabNav>();
  const [activeFilter, setActiveFilter] = useState<AlertColor | null>(null);

  const markRead = (id: string) =>
    setAlerts(alerts.map(a => a.id === id ? { ...a, read: true } : a));
  const markAll = () =>
    setAlerts(alerts.map(a => ({ ...a, read: true })));

  const toggleFilter = (color: AlertColor) =>
    setActiveFilter(prev => prev === color ? null : color);

  const displayed = activeFilter ? alerts.filter(a => a.color === activeFilter) : alerts;
  const unread    = displayed.filter(a => !a.read);
  const read      = displayed.filter(a => a.read);
  const totalUnread = alerts.filter(a => !a.read).length;

  function goToMap(vehicleName: string) {
    const VEHICLE_NAME_TO_ID: Record<string, string> = {
      "Chevrolet Spark GT": "v3",
      "Renault Logan":      "v4",
      "Toyota Hilux":       "v1",
      "Honda CB500F":       "v2",
    };
    const vid = VEHICLE_NAME_TO_ID[vehicleName];
    if (vid) setFocusedVehicleId(vid);
    navigation.navigate("Mapa");
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Alertas</Text>
          <Text style={[s.subtitle, { color: totalUnread > 0 ? Colors.alertSpeed : Colors.textFaint }]}>
            {totalUnread > 0 ? `${totalUnread} sin resolver` : "Sin alertas pendientes"}
          </Text>
        </View>
        {totalUnread > 0 && (
          <TouchableOpacity onPress={markAll} style={s.clearBtn} activeOpacity={0.8}>
            <Ionicons name="checkmark-done" size={15} color={Colors.textSub} />
            <Text style={s.clearText}>Resolver todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      <View style={s.filterRow}>
        {ALERT_TYPES.map(({ color, icon, label }) => {
          const count    = alerts.filter(a => a.color === color && !a.read).length;
          const isActive = activeFilter === color;
          return (
            <TouchableOpacity
              key={color}
              activeOpacity={0.75}
              onPress={() => toggleFilter(color)}
              style={[
                s.filterPill,
                { borderColor: color + (isActive ? "80" : "35"), backgroundColor: color + (isActive ? "20" : "10") },
              ]}
            >
              <MaterialCommunityIcons name={icon as any} size={13} color={color} />
              <Text style={[s.filterLabel, { color }]}>{label}</Text>
              {count > 0 && (
                <View style={[s.filterBadge, { backgroundColor: color }]}>
                  <Text style={s.filterBadgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {unread.length === 0 && read.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={52} color={Colors.textDark} />
            <Text style={s.emptyTitle}>Sin alertas</Text>
            <Text style={s.emptyText}>
              {activeFilter ? "No hay alertas en esta categoría" : "Todo en orden"}
            </Text>
          </View>
        )}

        {unread.length > 0 && (
          <>
            <Text style={s.section}>PENDIENTES</Text>
            {unread.map(a => (
              <AlertRow key={a.id} alert={a} onRead={markRead} onGoToMap={goToMap} />
            ))}
          </>
        )}

        {read.length > 0 && (
          <>
            <Text style={[s.section, { marginTop: Spacing.md }]}>RESUELTAS</Text>
            {read.map(a => (
              <AlertRow key={a.id} alert={a} onRead={markRead} onGoToMap={goToMap} dimmed />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function AlertRow({
  alert, onRead, onGoToMap, dimmed = false,
}: {
  alert: { id: string; vehicleName: string; message: string; time: string; color: string; read: boolean };
  onRead: (id: string) => void;
  onGoToMap: (vehicleName: string) => void;
  dimmed?: boolean;
}) {
  const cfg = ALERT_TYPES.find(t => t.color === alert.color) ?? { icon: "alert", label: "Alerta" };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onGoToMap(alert.vehicleName)}
      style={[s.card, { opacity: dimmed ? 0.4 : 1 }]}
    >
      <View style={[s.cardLine, { backgroundColor: alert.color }]} />
      <View style={[s.iconBox, { backgroundColor: alert.color + "15" }]}>
        <MaterialCommunityIcons name={cfg.icon as any} size={20} color={alert.color} />
      </View>
      <View style={s.cardContent}>
        <View style={s.cardTop}>
          <Text style={s.vehicleName}>{alert.vehicleName}</Text>
          <Text style={s.timeText}>{alert.time}</Text>
        </View>
        <Text style={s.messageText}>{alert.message}</Text>
        <View style={s.cardBottom}>
          <View style={[s.typePill, { backgroundColor: alert.color + "12", borderColor: alert.color + "30" }]}>
            <Text style={[s.typeText, { color: alert.color }]}>{cfg.label.toUpperCase()}</Text>
          </View>
          <View style={s.mapHint}>
            <MaterialCommunityIcons name="map-outline" size={11} color={Colors.textDark} />
            <Text style={s.mapHintText}>Ver en mapa</Text>
          </View>
        </View>
      </View>
      {!dimmed && (
        <TouchableOpacity
          onPress={() => onRead(alert.id)}
          style={s.resolveBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="checkmark-circle-outline" size={28} color={alert.color} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  header:          { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: 14 },
  title:           { fontSize: Font.xxl, fontWeight: "800", color: Colors.text, letterSpacing: -0.4 },
  subtitle:        { fontSize: Font.base, marginTop: 2, fontWeight: "600" },
  clearBtn:        { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  clearText:       { color: Colors.textSub, fontSize: 12, fontWeight: "700" },
  filterRow:       { flexDirection: "row", gap: 8, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  filterPill:      { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1 },
  filterLabel:     { fontSize: Font.sm, fontWeight: "700" },
  filterBadge:     { width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  filterBadgeText: { fontSize: Font.xs, color: "white", fontWeight: "800" },
  list:            { padding: Spacing.lg, paddingTop: 0, paddingBottom: Spacing.xxl, gap: 8 },
  empty:           { alignItems: "center", gap: Spacing.sm, paddingVertical: 60 },
  emptyTitle:      { fontSize: Font.lg, fontWeight: "800", color: Colors.textMuted },
  emptyText:       { fontSize: Font.base, color: Colors.textDark },
  section:         { fontSize: Font.xs, color: Colors.textDark, fontWeight: "800", letterSpacing: 1.5, marginBottom: 8 },
  card:            { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: "hidden", gap: 12, paddingRight: 14 },
  cardLine:        { width: 3, alignSelf: "stretch" },
  iconBox:         { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", marginVertical: 14 },
  cardContent:     { flex: 1, paddingVertical: 12, gap: 3 },
  cardTop:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  vehicleName:     { fontSize: Font.base, fontWeight: "800", color: Colors.text },
  timeText:        { fontSize: Font.xs, color: Colors.textDark },
  messageText:     { fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  cardBottom:      { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  typePill:        { alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.sm, borderWidth: 1 },
  typeText:        { fontSize: Font.xs, fontWeight: "800", letterSpacing: 0.8 },
  mapHint:         { flexDirection: "row", alignItems: "center", gap: 3 },
  mapHintText:     { fontSize: Font.xs, color: Colors.textDark },
  resolveBtn:      { padding: 4 },
});

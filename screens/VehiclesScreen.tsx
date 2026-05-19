import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppContext } from "../context/AppContext";
import type { VehiclesStackParams } from "./VehicleDetailScreen";
import { Colors, Spacing, Radius, Font, statusColor, statusLabel } from "../theme";

type Props = NativeStackScreenProps<VehiclesStackParams, "VehicleList">;

const VEHICLE_ICON: Record<string, any> = {
  car: "car-side", moto: "motorbike", truck: "truck",
};

export default function VehiclesScreen({ navigation }: Props) {
  const { vehicles } = useAppContext();
  const total   = vehicles.length;
  const moving  = vehicles.filter(v => v.status === "moving").length;
  const alert   = vehicles.filter(v => v.status === "alert").length;
  const offline = vehicles.filter(v => v.status === "offline").length;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Unidades</Text>
        <Text style={s.subtitle}>{total} unidad{total !== 1 ? "es" : ""} registrada{total !== 1 ? "s" : ""}</Text>
      </View>

      {/* KPI row */}
      <View style={s.kpiRow}>
        {[
          { label: "Activos",   value: moving,  color: Colors.statusMoving,  icon: "check-circle-outline" },
          { label: "Alertas",   value: alert,   color: Colors.statusAlert,   icon: "alert-circle-outline" },
          { label: "Sin señal", value: offline, color: Colors.statusOffline, icon: "wifi-off" },
        ].map(k => (
          <View key={k.label} style={[s.kpi, { borderColor: k.color + "25" }]}>
            <Ionicons name={k.icon as any} size={20} color={k.color} />
            <Text style={[s.kpiVal, { color: k.color }]}>{k.value}</Text>
            <Text style={s.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {vehicles.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="car-outline" size={48} color={Colors.textDark} />
            <Text style={s.emptyText}>Sin unidades registradas</Text>
          </View>
        )}
        {vehicles.map(v => {
          const color = statusColor(v.status);
          return (
            <TouchableOpacity
              key={v.id}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("VehicleDetail", { vehicle: v })}
              style={s.card}
            >
              <View style={[s.cardAccent, { backgroundColor: color }]} />

              <View style={s.cardBody}>
                <View style={[s.iconBox, { backgroundColor: color + "15" }]}>
                  <MaterialCommunityIcons name={VEHICLE_ICON[v.type]} size={24} color={color} />
                </View>
                <View style={s.cardMeta}>
                  <Text style={s.vehicleName}>{v.name}</Text>
                  <Text style={s.vehiclePlate}>{v.plate}</Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: color + "15", borderColor: color + "30" }]}>
                  <View style={[s.dot, { backgroundColor: color }]} />
                  <Text style={[s.statusText, { color }]}>{statusLabel(v.status)}</Text>
                </View>
              </View>

              <View style={s.metricsRow}>
                <View style={s.metric}>
                  <MaterialCommunityIcons name="speedometer" size={14} color={Colors.textMuted} />
                  <Text style={[s.metricVal, { color: v.speed > 80 ? Colors.statusAlert : Colors.text }]}>{v.speed} km/h</Text>
                </View>
                <View style={s.metric}>
                  <MaterialCommunityIcons name="battery-80" size={14} color={v.battery < 20 ? Colors.statusOffline : Colors.textMuted} />
                  <Text style={[s.metricVal, { color: v.battery < 20 ? Colors.statusOffline : Colors.text }]}>{v.battery}%</Text>
                </View>
                <View style={s.metric}>
                  <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                  <Text style={s.metricTime}>{v.lastUpdate}</Text>
                </View>
                <View style={s.chevron}>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textDark} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.md },
  title:        { fontSize: Font.xxl, fontWeight: "800", color: Colors.text, letterSpacing: -0.4 },
  subtitle:     { fontSize: Font.base, color: Colors.textFaint, marginTop: 2 },
  kpiRow:       { flexDirection: "row", gap: 10, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  kpi:          { flex: 1, alignItems: "center", gap: 4, paddingVertical: 12, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: Radius.lg, borderWidth: 1 },
  kpiVal:       { fontSize: Font.xl, fontWeight: "800" },
  kpiLabel:     { fontSize: Font.xs, color: Colors.textFaint, fontWeight: "600" },
  list:         { padding: Spacing.lg, paddingTop: 0, gap: 10, paddingBottom: Spacing.xxl },
  empty:        { alignItems: "center", gap: Spacing.md, paddingVertical: 60 },
  emptyText:    { color: Colors.textDark, fontSize: Font.base },
  card:         { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  cardAccent:   { height: 2 },
  cardBody:     { flexDirection: "row", alignItems: "center", gap: Spacing.md, padding: 14 },
  iconBox:      { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardMeta:     { flex: 1 },
  vehicleName:  { fontSize: Font.base, fontWeight: "800", color: Colors.text },
  vehiclePlate: { fontSize: Font.sm, color: Colors.textMuted, marginTop: 2, letterSpacing: 0.8 },
  statusPill:   { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 1 },
  dot:          { width: 5, height: 5, borderRadius: 3 },
  statusText:   { fontSize: Font.xs, fontWeight: "700" },
  metricsRow:   { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 14, paddingBottom: 12 },
  metric:       { flexDirection: "row", alignItems: "center", gap: 5 },
  metricVal:    { fontSize: 12, fontWeight: "700" },
  metricTime:   { fontSize: 11, color: Colors.textMuted },
  chevron:      { flex: 1, alignItems: "flex-end" },
});

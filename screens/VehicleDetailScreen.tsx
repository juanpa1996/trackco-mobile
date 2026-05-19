import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Vehicle } from "../data/mockData";
import { Colors, Spacing, Radius, Font, statusColor, statusLabel } from "../theme";
import { useAppContext } from "../context/AppContext";

export type VehiclesStackParams = {
  VehicleList: undefined;
  VehicleDetail: { vehicle: Vehicle };
};

type Props = NativeStackScreenProps<VehiclesStackParams, "VehicleDetail">;

const VEHICLE_ICON: Record<string, any> = {
  car: "car-side", moto: "motorbike", truck: "truck",
};

export default function VehicleDetailScreen({ route, navigation }: Props) {
  const { vehicle: v } = route.params;
  const { setFocusedVehicleId } = useAppContext();
  const color = statusColor(v.status);

  function goToMap() {
    setFocusedVehicleId(v.id);
    navigation.getParent()?.navigate("Mapa");
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={s.headerTitle}>
          <Text style={s.title}>{v.name}</Text>
          <Text style={s.plate}>{v.plate}</Text>
        </View>
        <View style={[s.statusPill, { backgroundColor: color + "20", borderColor: color + "40" }]}>
          <View style={[s.dot, { backgroundColor: color }]} />
          <Text style={[s.statusText, { color }]}>{statusLabel(v.status)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        {/* Icon card */}
        <View style={[s.iconCard, { borderTopColor: color }]}>
          <View style={[s.iconBox, { backgroundColor: color + "15" }]}>
            <MaterialCommunityIcons name={VEHICLE_ICON[v.type]} size={40} color={color} />
          </View>
          <Text style={s.vehicleType}>
            {v.type === "car" ? "Automóvil" : v.type === "moto" ? "Motocicleta" : "Camión"}
          </Text>
        </View>

        {/* Metrics */}
        <View style={s.metricsCard}>
          <MetricRow
            icon="speedometer"
            label="Velocidad"
            value={`${v.speed} km/h`}
            color={v.speed > 80 ? Colors.alertSpeed : Colors.primary}
          />
          <Divider />
          <MetricRow
            icon="battery-80"
            label="Batería GPS"
            value={`${v.battery}%`}
            color={v.battery < 20 ? Colors.alertBattery : Colors.statusMoving}
          />
          <Divider />
          <MetricRow
            icon="clock-outline"
            label="Última actualización"
            value={v.lastUpdate}
            color={Colors.textSub}
          />
        </View>

        {/* Speed bar */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>VELOCIDAD  {v.speed} / 120 km/h</Text>
          <View style={s.bar}>
            <View style={[s.barFill, {
              width: `${Math.min((v.speed / 120) * 100, 100)}%`,
              backgroundColor: v.speed > 80 ? Colors.alertSpeed : Colors.primaryDark,
            }]} />
          </View>
        </View>

        {/* Battery bar */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>BATERÍA GPS  {v.battery}%</Text>
          <View style={s.bar}>
            <View style={[s.barFill, {
              width: `${v.battery}%`,
              backgroundColor: v.battery < 20 ? Colors.alertBattery : Colors.statusMoving,
            }]} />
          </View>
        </View>

        {/* Location */}
        <View style={s.locationCard}>
          <Ionicons name="location-outline" size={18} color={Colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={s.locationLabel}>UBICACIÓN ACTUAL</Text>
            <Text style={s.locationText}>{v.address}</Text>
            <Text style={s.coords}>{v.lat.toFixed(4)}, {v.lng.toFixed(4)}</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity style={[s.mapBtn, { borderColor: color + "40" }]} onPress={goToMap} activeOpacity={0.8}>
          <MaterialCommunityIcons name="map-marker-radius" size={20} color={color} />
          <Text style={[s.mapBtnText, { color }]}>Ver en mapa</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function MetricRow({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={s.metricRow}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={[s.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.bg },
  header:        { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md, gap: Spacing.md },
  backBtn:       { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.surface },
  headerTitle:   { flex: 1 },
  title:         { fontSize: Font.md, fontWeight: "800", color: Colors.text },
  plate:         { fontSize: Font.xs, color: Colors.textMuted, letterSpacing: 0.8, marginTop: 2 },
  statusPill:    { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill, borderWidth: 1 },
  dot:           { width: 5, height: 5, borderRadius: 3 },
  statusText:    { fontSize: Font.xs, fontWeight: "700" },
  body:          { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  iconCard:      { alignItems: "center", backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.xl, borderTopWidth: 3, gap: Spacing.sm },
  iconBox:       { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  vehicleType:   { fontSize: Font.sm, color: Colors.textMuted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  metricsCard:   { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  metricRow:     { flexDirection: "row", alignItems: "center", gap: Spacing.md, padding: Spacing.md },
  metricLabel:   { flex: 1, fontSize: Font.base, color: Colors.textSub },
  metricValue:   { fontSize: Font.base, fontWeight: "700" },
  divider:       { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  section:       { gap: 8 },
  sectionLabel:  { fontSize: Font.xs, color: Colors.textFaint, fontWeight: "700", letterSpacing: 1.2 },
  bar:           { height: 6, backgroundColor: Colors.borderLight, borderRadius: 3, overflow: "hidden" },
  barFill:       { height: 6, borderRadius: 3 },
  locationCard:  { flexDirection: "row", gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  locationLabel: { fontSize: Font.xs, color: Colors.textDark, fontWeight: "700", letterSpacing: 1, marginBottom: 3 },
  locationText:  { fontSize: Font.base, color: Colors.textSub },
  coords:        { fontSize: Font.xs, color: Colors.textDark, marginTop: 3 },
  mapBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, backgroundColor: Colors.surface },
  mapBtnText:    { fontSize: Font.base, fontWeight: "700" },
});

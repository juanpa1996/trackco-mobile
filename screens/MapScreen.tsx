import { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAppContext } from "../context/AppContext";
import { Vehicle } from "../data/mockData";

const STATUS_COLOR: Record<string, string> = {
  moving: "#22C55E", stopped: "#64748B", alert: "#F59E0B", offline: "#EF4444",
};
const STATUS_LABEL: Record<string, string> = {
  moving: "En movimiento", stopped: "Detenido", alert: "Alerta", offline: "Sin señal",
};

function buildMapHTML(vehicles: Vehicle[], selectedId: string) {
  const markers = vehicles.map((v) => {
    const color = STATUS_COLOR[v.status] ?? "#64748B";
    const isSelected = v.id === selectedId;
    const size = isSelected ? 15 : 10;
    const ring = isSelected ? `<circle cx="0" cy="0" r="22" fill="none" stroke="${color}" stroke-width="2" opacity="0.5"/>` : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="-22 -22 44 44">
      ${ring}
      <circle cx="0" cy="0" r="${size}" fill="${color}" opacity="0.9"/>
      <circle cx="0" cy="0" r="${size - 3}" fill="white" opacity="0.2"/>
    </svg>`;
    const encoded = `data:image/svg+xml;base64,${btoa(svg)}`;
    return `
      var icon_${v.id} = L.icon({ iconUrl: '${encoded}', iconSize: [44,44], iconAnchor: [22,22] });
      var m_${v.id} = L.marker([${v.lat}, ${v.lng}], { icon: icon_${v.id} })
        .addTo(map)
        .bindPopup('<div style="font-family:sans-serif;padding:4px 2px"><b style="color:#fff;font-size:13px">${v.name}</b><br><span style="color:#94A3B8;font-size:11px">${v.plate} · ${v.speed} km/h</span></div>');
      ${isSelected ? `m_${v.id}.openPopup(); map.setView([${v.lat}, ${v.lng}], 15, {animate:true});` : ""}
    `;
  }).join("\n");

  const center = vehicles.find((v) => v.id === selectedId) ?? vehicles[0];
  const lat = center?.lat ?? 6.2442;
  const lng = center?.lng ?? -75.5812;

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>* { margin:0;padding:0;box-sizing:border-box; } html,body,#map{width:100%;height:100%;} .leaflet-container{background:#060B18;} .leaflet-popup-content-wrapper{background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:white;} .leaflet-popup-tip{background:#111827;} .leaflet-popup-close-button{color:#64748B;}</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([${lat},${lng}],14);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20}).addTo(map);
  ${markers}
</script>
</body>
</html>`;
}

export default function MapScreen() {
  const { vehicles, loading, focusedVehicleId, setFocusedVehicleId } = useAppContext();
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const cardAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (vehicles.length && !selected) setSelected(vehicles[0]);
  }, [vehicles]);

  useEffect(() => {
    if (!focusedVehicleId) return;
    const v = vehicles.find((v) => v.id === focusedVehicleId);
    if (v) { setSelected(v); cardAnim.setValue(0); }
    setFocusedVehicleId(null);
  }, [focusedVehicleId, vehicles]);

  useEffect(() => {
    Animated.spring(cardAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
  }, [selected?.id]);

  if (loading && vehicles.length === 0) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#00D4FF" size="large" />
        <Text style={{ color: "#64748B", marginTop: 12, fontSize: 13 }}>Cargando vehículos…</Text>
      </View>
    );
  }

  if (vehicles.length === 0) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontSize: 32 }}>📡</Text>
        <Text style={{ color: "#64748B", marginTop: 12, fontSize: 14 }}>Sin dispositivos registrados</Text>
      </View>
    );
  }

  const sel = selected ?? vehicles[0];
  const selColor = STATUS_COLOR[sel.status];
  const mapHtml = buildMapHTML(vehicles, sel.id);

  return (
    <View style={s.container}>
      <WebView
        source={{ html: mapHtml }}
        style={s.map}
        scrollEnabled={false}
        key={sel.id + sel.lat + sel.lng}
        originWhitelist={["*"]}
      />

      {/* Top badge */}
      <View style={s.topOverlay}>
        <View style={s.liveTag}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>EN VIVO</Text>
        </View>
        <Text style={s.countBadge}>{vehicles.length} unidad{vehicles.length !== 1 ? "es" : ""}</Text>
      </View>

      {/* Bottom sheet */}
      <View style={s.sheet}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsList}>
          {vehicles.map((v) => {
            const active = sel.id === v.id;
            const color = STATUS_COLOR[v.status];
            return (
              <TouchableOpacity
                key={v.id}
                onPress={() => { setSelected(v); cardAnim.setValue(0); }}
                activeOpacity={0.75}
                style={[s.chip, active && { backgroundColor: color + "20", borderColor: color }]}
              >
                <View style={[s.chipDot, { backgroundColor: color }]} />
                <Text style={[s.chipText, { color: active ? color : "#94A3B8" }]}>
                  {v.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Animated.View style={[s.card, {
          opacity: cardAnim,
          transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }]}>
          <View style={s.cardHeader}>
            <View style={[s.accent, { backgroundColor: selColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.vehicleName}>{sel.name}</Text>
              <Text style={s.vehiclePlate}>{sel.plate}</Text>
            </View>
            <View style={[s.pill, { borderColor: selColor + "50", backgroundColor: selColor + "15" }]}>
              <Text style={[s.pillText, { color: selColor }]}>{STATUS_LABEL[sel.status]}</Text>
            </View>
          </View>

          <View style={s.metrics}>
            <View style={s.metric}>
              <MaterialCommunityIcons name="speedometer" size={17} color="#00D4FF" />
              <Text style={[s.metricVal, { color: sel.speed > 80 ? "#F59E0B" : "#F1F5F9" }]}>{sel.speed}</Text>
              <Text style={s.metricUnit}>km/h</Text>
            </View>
            <View style={s.divider} />
            <View style={s.metric}>
              <MaterialCommunityIcons
                name="battery-80"
                size={17}
                color={sel.battery > 0 ? (sel.battery < 20 ? "#EF4444" : "#22C55E") : "#334155"}
              />
              <Text style={[s.metricVal, { color: sel.battery < 20 && sel.battery > 0 ? "#EF4444" : "#F1F5F9" }]}>
                {sel.battery > 0 ? `${sel.battery}%` : "—"}
              </Text>
              <Text style={s.metricUnit}>GPS</Text>
            </View>
            <View style={s.divider} />
            <View style={[s.metric, { flex: 1.8 }]}>
              <Ionicons name="time-outline" size={15} color="#64748B" />
              <Text style={s.metricTime}>{sel.lastUpdate}</Text>
            </View>
          </View>

          {sel.speed > 0 && (
            <View style={s.speedBar}>
              <View style={[s.speedFill, {
                width: `${Math.min((sel.speed / 120) * 100, 100)}%` as any,
                backgroundColor: sel.speed > 80 ? "#F59E0B" : "#00D4FF",
              }]} />
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#060B18" },
  map:         { flex: 1 },
  topOverlay:  { position: "absolute", top: 52, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  liveTag:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(6,11,24,0.88)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(34,197,94,0.3)" },
  liveDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: "#22C55E" },
  liveText:    { color: "#22C55E", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  countBadge:  { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600", backgroundColor: "rgba(6,11,24,0.85)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  sheet:       { backgroundColor: "#0D1425", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.07)", paddingTop: 16, paddingBottom: 20 },
  chipsList:   { paddingHorizontal: 16, gap: 8, paddingBottom: 14 },
  chip:        { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" },
  chipDot:     { width: 7, height: 7, borderRadius: 4 },
  chipText:    { fontSize: 12, fontWeight: "700" },
  card:        { marginHorizontal: 16, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", overflow: "hidden" },
  cardHeader:  { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  accent:      { width: 3, height: 40, borderRadius: 2 },
  vehicleName: { fontSize: 15, fontWeight: "800", color: "#F1F5F9" },
  vehiclePlate:{ fontSize: 11, color: "#64748B", marginTop: 2, letterSpacing: 0.8 },
  pill:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  pillText:    { fontSize: 11, fontWeight: "700" },
  metrics:     { flexDirection: "row", borderTopWidth: 1, borderColor: "rgba(255,255,255,0.06)", paddingVertical: 12, paddingHorizontal: 16 },
  metric:      { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  metricVal:   { fontSize: 16, fontWeight: "800" },
  metricUnit:  { fontSize: 10, color: "#64748B", fontWeight: "600" },
  metricTime:  { fontSize: 11, color: "#64748B", fontWeight: "600", flex: 1 },
  divider:     { width: 1, height: 26, backgroundColor: "rgba(255,255,255,0.07)", marginHorizontal: 4 },
  speedBar:    { height: 2, backgroundColor: "rgba(255,255,255,0.06)", marginHorizontal: 16, marginBottom: 14, borderRadius: 1, overflow: "hidden" },
  speedFill:   { height: 2, borderRadius: 1 },
});

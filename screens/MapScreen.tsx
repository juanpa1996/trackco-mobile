import { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, ActivityIndicator, TextInput, useWindowDimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAppContext } from "../context/AppContext";
import { Vehicle } from "../data/mockData";
import { Colors, statusColor, statusLabel } from "../theme";

const VEHICLE_ICON: Record<string, string> = {
  car: "car-side", moto: "motorbike", truck: "truck",
};

function buildMapHTML(vehicles: Vehicle[], selectedId: string) {
  const markers = vehicles.map((v) => {
    const color = statusColor(v.status);
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
  L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',{maxZoom:20,attribution:'© Stadia Maps © OpenMapTiles © OpenStreetMap'}).addTo(map);
  ${markers}
</script>
</body>
</html>`;
}

const COLLAPSED_H = 230;

export default function MapScreen() {
  const { height: screenH } = useWindowDimensions();
  const EXPANDED_H = Math.round(screenH * 0.62);

  const { vehicles, loading, focusedVehicleId, setFocusedVehicleId, wsConnected } = useAppContext();
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const cardAnim  = useRef(new Animated.Value(1)).current;
  const sheetAnim = useRef(new Animated.Value(COLLAPSED_H)).current;

  useEffect(() => {
    if (vehicles.length && !selected) setSelected(vehicles[0]);
  }, [vehicles]);

  useEffect(() => {
    if (!focusedVehicleId) return;
    const v = vehicles.find((v) => v.id === focusedVehicleId);
    if (v) { selectVehicle(v); }
    setFocusedVehicleId(null);
  }, [focusedVehicleId, vehicles]);

  useEffect(() => {
    Animated.spring(cardAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
  }, [selected?.id]);

  function toggleSheet() {
    const toValue = expanded ? COLLAPSED_H : EXPANDED_H;
    Animated.spring(sheetAnim, { toValue, friction: 14, tension: 70, useNativeDriver: false }).start();
    setExpanded(!expanded);
    if (!expanded) setSearch("");
  }

  function selectVehicle(v: Vehicle) {
    setSelected(v);
    cardAnim.setValue(0);
    if (expanded) {
      Animated.spring(sheetAnim, { toValue: COLLAPSED_H, friction: 14, tension: 70, useNativeDriver: false }).start();
      setExpanded(false);
    }
  }

  if (loading && vehicles.length === 0) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={{ color: Colors.textMuted, marginTop: 12, fontSize: 13 }}>Cargando unidades…</Text>
      </View>
    );
  }

  if (vehicles.length === 0) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontSize: 32 }}>📡</Text>
        <Text style={{ color: Colors.textMuted, marginTop: 12, fontSize: 14 }}>Sin dispositivos registrados</Text>
      </View>
    );
  }

  const sel = selected ?? vehicles[0];
  const selColor = statusColor(sel.status);
  const mapHtml = buildMapHTML(vehicles, sel.id);

  const filtered = vehicles.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.plate.toLowerCase().includes(search.toLowerCase())
  );

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
        <View style={[s.liveTag, {
          borderColor:     wsConnected ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)",
          backgroundColor: wsConnected ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
        }]}>
          <View style={[s.liveDot, { backgroundColor: wsConnected ? Colors.statusMoving : Colors.statusOffline }]} />
          <Text style={[s.liveText, { color: wsConnected ? Colors.statusMoving : Colors.statusOffline }]}>
            {wsConnected ? "EN VIVO" : "POLLING"}
          </Text>
        </View>
        <Text style={s.countBadge}>{vehicles.length} unidad{vehicles.length !== 1 ? "es" : ""}</Text>
      </View>

      {/* Bottom sheet */}
      <Animated.View style={[s.sheet, { height: sheetAnim }]}>

        {/* Handle */}
        <TouchableOpacity onPress={toggleSheet} activeOpacity={0.7} style={s.handleArea}>
          <View style={s.handle} />
          {expanded && (
            <Text style={s.sheetTitle}>Unidades ({vehicles.length})</Text>
          )}
          <Ionicons
            name={expanded ? "chevron-down" : "chevron-up"}
            size={16}
            color={Colors.textMuted}
            style={s.chevronIcon}
          />
        </TouchableOpacity>

        {/* ── EXPANDED: vehicle list ── */}
        {expanded && (
          <>
            <View style={s.searchWrap}>
              <Ionicons name="search" size={15} color={Colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Buscar por nombre o ID…"
                placeholderTextColor={Colors.textDark}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
              {filtered.map((v) => {
                const color = statusColor(v.status);
                const isActive = sel.id === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    activeOpacity={0.75}
                    onPress={() => selectVehicle(v)}
                    style={[s.row, isActive && { borderColor: color + "40", backgroundColor: color + "08" }]}
                  >
                    <View style={[s.rowAccent, { backgroundColor: color }]} />
                    <View style={[s.rowIcon, { backgroundColor: color + "15" }]}>
                      <MaterialCommunityIcons name={VEHICLE_ICON[v.type] as any} size={20} color={color} />
                    </View>
                    <View style={s.rowMeta}>
                      <Text style={s.rowName}>{v.name}</Text>
                      <Text style={s.rowPlate}>{v.plate}</Text>
                    </View>
                    <View style={s.rowRight}>
                      <View style={[s.statusPill, { borderColor: color + "40", backgroundColor: color + "12" }]}>
                        <View style={[s.dot, { backgroundColor: color }]} />
                        <Text style={[s.statusText, { color }]}>{statusLabel(v.status)}</Text>
                      </View>
                      <Text style={[s.rowSpeed, { color: v.speed > 80 ? Colors.statusAlert : Colors.textSub }]}>
                        {v.speed} km/h
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {filtered.length === 0 && (
                <View style={s.noResults}>
                  <Ionicons name="search-outline" size={32} color={Colors.textDark} />
                  <Text style={s.noResultsText}>Sin resultados</Text>
                </View>
              )}
            </ScrollView>
          </>
        )}

        {/* ── COLLAPSED: chips + card ── */}
        {!expanded && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsList}>
              {vehicles.map((v) => {
                const active = sel.id === v.id;
                const color = statusColor(v.status);
                return (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => selectVehicle(v)}
                    activeOpacity={0.75}
                    style={[s.chip, active && { backgroundColor: color + "20", borderColor: color }]}
                  >
                    <View style={[s.chipDot, { backgroundColor: color }]} />
                    <Text style={[s.chipText, { color: active ? color : Colors.textSub }]}>{v.name}</Text>
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
                  <Text style={[s.pillText, { color: selColor }]}>{statusLabel(sel.status)}</Text>
                </View>
              </View>

              <View style={s.metrics}>
                <View style={s.metric}>
                  <MaterialCommunityIcons name="speedometer" size={17} color={Colors.primary} />
                  <Text style={[s.metricVal, { color: sel.speed > 80 ? Colors.statusAlert : Colors.text }]}>{sel.speed}</Text>
                  <Text style={s.metricUnit}>km/h</Text>
                </View>
                <View style={s.divider} />
                <View style={s.metric}>
                  <MaterialCommunityIcons
                    name="battery-80"
                    size={17}
                    color={sel.battery > 0 ? (sel.battery < 20 ? Colors.statusOffline : Colors.statusMoving) : Colors.textDark}
                  />
                  <Text style={[s.metricVal, { color: sel.battery < 20 && sel.battery > 0 ? Colors.statusOffline : Colors.text }]}>
                    {sel.battery > 0 ? `${sel.battery}%` : "—"}
                  </Text>
                  <Text style={s.metricUnit}>GPS</Text>
                </View>
                <View style={s.divider} />
                <View style={[s.metric, { flex: 1.8 }]}>
                  <Ionicons name="time-outline" size={15} color={Colors.textMuted} />
                  <Text style={s.metricTime}>{sel.lastUpdate}</Text>
                </View>
              </View>

              {sel.speed > 0 && (
                <View style={s.speedBar}>
                  <View style={[s.speedFill, {
                    width: `${Math.min((sel.speed / 120) * 100, 100)}%` as any,
                    backgroundColor: sel.speed > 80 ? Colors.statusAlert : Colors.primary,
                  }]} />
                </View>
              )}
            </Animated.View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  map:          { flex: 1 },
  topOverlay:   { position: "absolute", top: 52, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  liveTag:      { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(6,11,24,0.88)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  liveDot:      { width: 7, height: 7, borderRadius: 4 },
  liveText:     { fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  countBadge:   { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600", backgroundColor: "rgba(6,11,24,0.85)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },

  // Sheet
  sheet:        { backgroundColor: "#0D1425", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  handleArea:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  handle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", marginRight: 10 },
  sheetTitle:   { flex: 1, fontSize: 14, fontWeight: "800", color: Colors.text },
  chevronIcon:  { marginLeft: "auto" },

  // Search
  searchWrap:   { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 10, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  searchInput:  { flex: 1, color: Colors.text, fontSize: 13, padding: 0 },

  // Vehicle list rows
  listContent:  { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  row:          { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", overflow: "hidden", paddingRight: 14 },
  rowAccent:    { width: 3, alignSelf: "stretch" },
  rowIcon:      { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginHorizontal: 12 },
  rowMeta:      { flex: 1, paddingVertical: 12 },
  rowName:      { fontSize: 13, fontWeight: "700", color: Colors.text },
  rowPlate:     { fontSize: 11, color: Colors.textMuted, marginTop: 2, letterSpacing: 0.6 },
  rowRight:     { alignItems: "flex-end", gap: 4 },
  statusPill:   { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  dot:          { width: 5, height: 5, borderRadius: 3 },
  statusText:   { fontSize: 10, fontWeight: "700" },
  rowSpeed:     { fontSize: 11, fontWeight: "600" },
  noResults:    { alignItems: "center", gap: 10, paddingVertical: 32 },
  noResultsText:{ color: Colors.textDark, fontSize: 13 },

  // Chips (collapsed)
  chipsList:    { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  chip:         { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" },
  chipDot:      { width: 7, height: 7, borderRadius: 4 },
  chipText:     { fontSize: 12, fontWeight: "700" },

  // Selected card (collapsed)
  card:         { marginHorizontal: 16, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", overflow: "hidden" },
  cardHeader:   { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  accent:       { width: 3, height: 40, borderRadius: 2 },
  vehicleName:  { fontSize: 15, fontWeight: "800", color: Colors.text },
  vehiclePlate: { fontSize: 11, color: Colors.textMuted, marginTop: 2, letterSpacing: 0.8 },
  pill:         { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  pillText:     { fontSize: 11, fontWeight: "700" },
  metrics:      { flexDirection: "row", borderTopWidth: 1, borderColor: "rgba(255,255,255,0.06)", paddingVertical: 12, paddingHorizontal: 16 },
  metric:       { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  metricVal:    { fontSize: 16, fontWeight: "800" },
  metricUnit:   { fontSize: 10, color: Colors.textMuted, fontWeight: "600" },
  metricTime:   { fontSize: 11, color: Colors.textMuted, fontWeight: "600", flex: 1 },
  divider:      { width: 1, height: 26, backgroundColor: "rgba(255,255,255,0.07)", marginHorizontal: 4 },
  speedBar:     { height: 2, backgroundColor: "rgba(255,255,255,0.06)", marginHorizontal: 16, marginBottom: 14, borderRadius: 1, overflow: "hidden" },
  speedFill:    { height: 2, borderRadius: 1 },
});

import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppContext } from "../context/AppContext";
import { apiHistory, TraccarPosition } from "../services/traccarService";

interface RoutePoint { lat: number; lng: number; speed: number; time: string; }

function localDate(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

function speedColor(kmh: number) {
  if (kmh <= 0)  return "#64748B";
  if (kmh < 30)  return "#22C55E";
  if (kmh < 70)  return "#F59E0B";
  return "#EF4444";
}

function buildMapHTML(route: RoutePoint[], currentIndex: number) {
  if (route.length === 0) return `<html><body style="background:#060B18;display:flex;align-items:center;justify-content:center;height:100%;"><p style="color:#334155;font-family:sans-serif">Sin datos de ruta</p></body></html>`;

  const coords = route.map((p) => `[${p.lat},${p.lng}]`).join(",");
  const played = route.slice(0, currentIndex + 1).map((p) => `[${p.lat},${p.lng}]`).join(",");
  const cur = route[currentIndex] ?? route[0];

  // Speed segments for played route
  const segments = route.slice(0, currentIndex + 1).map((p, i, arr) => {
    if (i === 0) return "";
    const color = speedColor(p.speed);
    return `L.polyline([[${arr[i-1].lat},${arr[i-1].lng}],[${p.lat},${p.lng}]],{color:'${color}',weight:5,opacity:0.9,lineCap:'round'}).addTo(map);`;
  }).join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body,#map{width:100%;height:100%}.leaflet-container{background:#060B18}</style>
</head>
<body><div id="map"></div>
<script>
  var map=L.map('map',{zoomControl:false,attributionControl:false});
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',{maxZoom:16,attribution:'© Esri'}).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',{maxZoom:16,attribution:'',opacity:0.9}).addTo(map);
  var all=[${coords}];
  if(all.length>1){L.polyline(all,{color:'#334155',weight:3,opacity:0.5}).addTo(map); map.fitBounds(L.latLngBounds(all),{padding:[40,40],maxZoom:16});}
  ${segments}
  var startIcon=L.divIcon({className:'',html:'<div style="width:10px;height:10px;border-radius:50%;background:#22C55E;border:2px solid #111"></div>',iconSize:[10,10],iconAnchor:[5,5]});
  var endIcon=L.divIcon({className:'',html:'<div style="width:10px;height:10px;border-radius:50%;background:#EF4444;border:2px solid #111"></div>',iconSize:[10,10],iconAnchor:[5,5]});
  L.marker(all[0],{icon:startIcon}).addTo(map);
  if(all.length>1) L.marker(all[all.length-1],{icon:endIcon}).addTo(map);
  var curSvg='<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="-18 -18 36 36"><circle cx="0" cy="0" r="14" fill="#0284C7" opacity="0.3"/><circle cx="0" cy="0" r="9" fill="white"/><circle cx="0" cy="0" r="5" fill="#0284C7"/></svg>';
  var curIcon=L.divIcon({className:'',html:curSvg,iconSize:[36,36],iconAnchor:[18,18]});
  var curMarker=L.marker([${cur.lat},${cur.lng}],{icon:curIcon,zIndexOffset:1000}).addTo(map);
</script></body></html>`;
}

export default function HistoryScreen() {
  const { token, vehicles } = useAppContext();
  const [vehicleIdx, setVehicleIdx] = useState(0);
  const [dateOffset, setDateOffset] = useState(0);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const vehicle = vehicles[vehicleIdx] ?? null;
  const dateStr = localDate(dateOffset);
  const dateLabel = dateOffset === 0 ? "Hoy" : dateOffset === -1 ? "Ayer" : dateStr;

  const loadRoute = useCallback(async () => {
    if (!token || !vehicle) return;
    setLoadingRoute(true);
    setCurrentIndex(0);
    setIsPlaying(false);
    try {
      const from = new Date(`${dateStr}T00:00:00`).toISOString();
      const to   = new Date(`${dateStr}T23:59:59`).toISOString();
      const positions = await apiHistory(token, vehicle.id, from, to);
      setRoute(positions.map((p: TraccarPosition): RoutePoint => ({
        lat: p.latitude,
        lng: p.longitude,
        speed: Math.round((p.speed ?? 0) * 1.852),
        time: p.fixTime ?? p.deviceTime,
      })));
    } catch {
      setRoute([]);
    } finally {
      setLoadingRoute(false);
    }
  }, [token, vehicle, dateStr]);

  useEffect(() => { loadRoute(); }, [loadRoute]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isPlaying || !route.length) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= route.length - 1) { setIsPlaying(false); return prev; }
        return prev + 1;
      });
    }, 500 / playSpeed);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, playSpeed, route.length]);

  const totalKm = route.length > 1
    ? route.reduce((acc, p, i) => {
        if (i === 0) return 0;
        const R = 6371;
        const dLat = ((p.lat - route[i-1].lat) * Math.PI) / 180;
        const dLng = ((p.lng - route[i-1].lng) * Math.PI) / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(route[i-1].lat*Math.PI/180)*Math.cos(p.lat*Math.PI/180)*Math.sin(dLng/2)**2;
        return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      }, 0).toFixed(1)
    : "0";

  const maxSpeed = route.length ? Math.max(...route.map((p) => p.speed)) : 0;
  const progress = route.length > 1 ? currentIndex / (route.length - 1) : 0;
  const mapHtml  = buildMapHTML(route, currentIndex);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Historial</Text>

        {/* Date nav */}
        <View style={s.dateRow}>
          <TouchableOpacity onPress={() => setDateOffset((d) => d - 1)} style={s.dateBtn}>
            <Ionicons name="chevron-back" size={18} color="#94A3B8" />
          </TouchableOpacity>
          <Text style={s.dateLabel}>{dateLabel}</Text>
          <TouchableOpacity
            onPress={() => setDateOffset((d) => Math.min(d + 1, 0))}
            style={[s.dateBtn, dateOffset === 0 && { opacity: 0.3 }]}
            disabled={dateOffset === 0}
          >
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Vehicle selector */}
        {vehicles.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
            {vehicles.map((v, i) => (
              <TouchableOpacity
                key={v.id}
                onPress={() => setVehicleIdx(i)}
                style={[s.vChip, vehicleIdx === i && s.vChipActive]}
              >
                <Text style={[s.vChipText, vehicleIdx === i && { color: "#00D4FF" }]}>{v.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Stats */}
      <View style={s.stats}>
        {[
          { icon: "map-marker-distance", val: `${totalKm} km`, label: "Distancia", color: "#00D4FF" },
          { icon: "speedometer",         val: `${maxSpeed} km/h`, label: "Vel. máx", color: "#6C47FF" },
          { icon: "map-marker-multiple", val: `${route.length}`,  label: "Puntos",   color: "#22C55E" },
        ].map((s2) => (
          <View key={s2.label} style={s.statCard}>
            <MaterialCommunityIcons name={s2.icon as any} size={16} color={s2.color} />
            <Text style={s.statVal}>{s2.val}</Text>
            <Text style={s.statLabel}>{s2.label}</Text>
          </View>
        ))}
      </View>

      {/* Map */}
      <View style={s.mapWrap}>
        {loadingRoute ? (
          <View style={s.loader}>
            <ActivityIndicator color="#00D4FF" />
            <Text style={{ color: "#64748B", marginTop: 8, fontSize: 12 }}>Cargando ruta…</Text>
          </View>
        ) : (
          <WebView
            source={{ html: mapHtml }}
            style={{ flex: 1 }}
            scrollEnabled={false}
            key={dateStr + vehicle?.id + currentIndex}
            originWhitelist={["*"]}
          />
        )}
      </View>

      {/* Progress bar */}
      <View style={s.progressWrap}>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
        <View style={s.timeLabels}>
          <Text style={s.timeLabel}>{formatTime(route[0]?.time ?? "")}</Text>
          <Text style={[s.timeLabel, { color: "#00D4FF" }]}>{route.length > 0 ? `${currentIndex + 1}/${route.length}` : "—"}</Text>
          <Text style={s.timeLabel}>{formatTime(route[route.length - 1]?.time ?? "")}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={s.controls}>
        <TouchableOpacity onPress={() => { setIsPlaying(false); setCurrentIndex(0); }} style={s.ctrlBtn}>
          <Ionicons name="square" size={18} color="#94A3B8" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (isPlaying) setIsPlaying(false);
            else { if (currentIndex >= route.length - 1) setCurrentIndex(0); setIsPlaying(true); }
          }}
          disabled={route.length === 0}
          style={[s.playBtn, route.length === 0 && { opacity: 0.4 }]}
        >
          <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="white" />
          <Text style={s.playText}>{isPlaying ? "Pausar" : "Reproducir"}</Text>
        </TouchableOpacity>
        <View style={s.speedPills}>
          {[1, 2, 5].map((sp) => (
            <TouchableOpacity
              key={sp}
              onPress={() => setPlaySpeed(sp)}
              style={[s.speedPill, playSpeed === sp && s.speedPillActive]}
            >
              <Text style={[s.speedText, playSpeed === sp && { color: "#00D4FF" }]}>{sp}x</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#060B18" },
  header:       { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: "#0D1425", borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  title:        { fontSize: 20, fontWeight: "800", color: "white", marginBottom: 10 },
  dateRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  dateBtn:      { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  dateLabel:    { fontSize: 14, fontWeight: "700", color: "white", flex: 1, textAlign: "center" },
  vChip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" },
  vChipActive:  { borderColor: "#00D4FF", backgroundColor: "rgba(0,212,255,0.1)" },
  vChipText:    { fontSize: 12, fontWeight: "600", color: "#64748B" },
  stats:        { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  statCard:     { flex: 1, backgroundColor: "#0D1425", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 10, alignItems: "center", gap: 2 },
  statVal:      { fontSize: 14, fontWeight: "800", color: "white" },
  statLabel:    { fontSize: 10, color: "#64748B" },
  mapWrap:      { flex: 1, marginHorizontal: 12, marginBottom: 6, borderRadius: 16, overflow: "hidden", backgroundColor: "#0D1425" },
  loader:       { flex: 1, alignItems: "center", justifyContent: "center" },
  progressWrap: { paddingHorizontal: 16, marginBottom: 8 },
  progressBg:   { height: 3, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 99, backgroundColor: "#00D4FF" },
  timeLabels:   { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  timeLabel:    { fontSize: 10, color: "#475569" },
  controls:     { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  ctrlBtn:      { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  playBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, borderRadius: 14, backgroundColor: "#0284C7" },
  playText:     { color: "white", fontWeight: "700", fontSize: 14 },
  speedPills:   { flexDirection: "row", gap: 4 },
  speedPill:    { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  speedPillActive: { borderColor: "#00D4FF", backgroundColor: "rgba(0,212,255,0.1)" },
  speedText:    { fontSize: 11, fontWeight: "700", color: "#475569" },
});

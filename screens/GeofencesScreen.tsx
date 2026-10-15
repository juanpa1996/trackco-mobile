import { useState, useRef, useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, Modal, Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useGeofencesContext } from "../context/GeofencesContext";
import { wktToShape, type LatLng } from "../utils/geofence";
import { Colors } from "../theme";
import { ErrorBanner } from "../components/ErrorBanner";
import { SkeletonCard } from "../components/SkeletonCard";

const RADII = [100, 200, 300, 500, 1000, 2000]; // metros
const DEFAULT_CENTER: LatLng = { lat: 6.2442, lng: -75.5812 }; // Medellín

function buildPickerHTML(center: LatLng) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body,#map{width:100%;height:100%}.leaflet-container{background:#060B18}</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map',{zoomControl:true,attributionControl:false}).setView([${center.lat},${center.lng}],14);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',{maxZoom:18}).addTo(map);
  var marker=null, circle=null, radius=300;
  function send(o){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  function draw(latlng){
    if(marker){ marker.setLatLng(latlng); } else { marker=L.marker(latlng).addTo(map); }
    if(circle){ circle.setLatLng(latlng); circle.setRadius(radius); }
    else { circle=L.circle(latlng,{radius:radius,color:'#00D4FF',fillColor:'#00D4FF',fillOpacity:0.15,weight:2}).addTo(map); }
  }
  map.on('click', function(e){ draw(e.latlng); send({type:'point',lat:e.latlng.lat,lng:e.latlng.lng}); });
  // Llamado desde React Native para cambiar el radio del círculo actual
  window.setRadius = function(r){ radius=r; if(circle) circle.setRadius(r); };
</script>
</body>
</html>`;
}

export default function GeofencesScreen() {
  const { geofences, loading, error, createGeofence, removeGeofence } = useGeofencesContext();

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [radius, setRadius] = useState(300);
  const [center, setCenter] = useState<LatLng | null>(null);
  const [saving, setSaving] = useState(false);
  const webRef = useRef<WebView>(null);

  const pickerHtml = useMemo(() => buildPickerHTML(DEFAULT_CENTER), []);

  function openModal() {
    setName(""); setRadius(300); setCenter(null);
    setModalOpen(true);
  }

  function onMessage(e: { nativeEvent: { data: string } }) {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "point") setCenter({ lat: msg.lat, lng: msg.lng });
    } catch { /* ignore */ }
  }

  function pickRadius(r: number) {
    setRadius(r);
    webRef.current?.injectJavaScript(`window.setRadius(${r});true;`);
  }

  async function save() {
    if (!name.trim()) { Alert.alert("Falta el nombre", "Escribe un nombre para la geocerca."); return; }
    if (!center) { Alert.alert("Falta el centro", "Toca el mapa para marcar el centro."); return; }
    setSaving(true);
    try {
      await createGeofence(name.trim(), { kind: "circle", center, radius });
      setModalOpen(false);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo crear la geocerca");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(id: number, label: string) {
    Alert.alert("Eliminar geocerca", `¿Eliminar "${label}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => {
          try { await removeGeofence(id); }
          catch (err) { Alert.alert("Error", err instanceof Error ? err.message : "No se pudo eliminar"); }
        },
      },
    ]);
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Geocercas</Text>
          <Text style={s.subtitle}>{geofences.length} zona{geofences.length !== 1 ? "s" : ""}</Text>
        </View>
        <TouchableOpacity style={s.newBtn} onPress={openModal} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#001018" />
          <Text style={s.newBtnText}>Nueva</Text>
        </TouchableOpacity>
      </View>

      {error && <View style={{ paddingHorizontal: 16 }}><ErrorBanner message={error} /></View>}

      {loading && geofences.length === 0 ? (
        <View style={{ padding: 16, gap: 10 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      ) : geofences.length === 0 ? (
        <View style={s.empty}>
          <MaterialCommunityIcons name="map-marker-radius-outline" size={44} color={Colors.textDark} />
          <Text style={s.emptyText}>Sin geocercas todavía</Text>
          <Text style={s.emptyHint}>Crea una zona para recibir avisos de entrada y salida.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {geofences.map((g) => {
            const shape = wktToShape(g.area);
            const kind = shape?.kind === "polygon" ? "Polígono"
              : shape?.kind === "circle" ? `Círculo · ${Math.round(shape.radius)} m` : "—";
            return (
              <View key={g.id} style={s.row}>
                <View style={[s.rowIcon, { backgroundColor: Colors.primary + "15" }]}>
                  <MaterialCommunityIcons
                    name={shape?.kind === "polygon" ? "vector-polygon" : "map-marker-radius"}
                    size={20} color={Colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowName}>{g.name}</Text>
                  <Text style={s.rowMeta}>{kind}</Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(g.id, g.name)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={20} color={Colors.statusOffline} />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Modal crear geocerca ── */}
      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setModalOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Nueva geocerca</Text>
            <TouchableOpacity onPress={save} disabled={saving} hitSlop={10}>
              {saving ? <ActivityIndicator color={Colors.primary} />
                : <Text style={s.saveText}>Guardar</Text>}
            </TouchableOpacity>
          </View>

          <WebView
            ref={webRef}
            source={{ html: pickerHtml }}
            style={s.pickerMap}
            originWhitelist={["*"]}
            onMessage={onMessage}
          />

          <View style={s.form}>
            <Text style={s.hint}>
              {center ? "✓ Centro marcado. Ajusta el radio y guarda." : "Toca el mapa para marcar el centro."}
            </Text>
            <TextInput
              style={s.input}
              placeholder="Nombre de la geocerca"
              placeholderTextColor={Colors.textDark}
              value={name}
              onChangeText={setName}
            />
            <Text style={s.label}>Radio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {RADII.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => pickRadius(r)}
                  style={[s.radiusChip, radius === r && s.radiusChipActive]}
                >
                  <Text style={[s.radiusText, radius === r && { color: "#001018" }]}>
                    {r >= 1000 ? `${r / 1000} km` : `${r} m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
  title:       { fontSize: 22, fontWeight: "800", color: Colors.text },
  subtitle:    { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  newBtn:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22 },
  newBtnText:  { color: "#001018", fontWeight: "800", fontSize: 13 },

  list:        { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  row:         { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 14 },
  rowIcon:     { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowName:     { fontSize: 14, fontWeight: "700", color: Colors.text },
  rowMeta:     { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  empty:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  emptyText:   { color: Colors.textSub, fontSize: 15, fontWeight: "700" },
  emptyHint:   { color: Colors.textDark, fontSize: 13, textAlign: "center" },

  modal:       { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  modalTitle:  { fontSize: 16, fontWeight: "800", color: Colors.text },
  saveText:    { fontSize: 15, fontWeight: "800", color: Colors.primary },
  pickerMap:   { flex: 1 },
  form:        { padding: 16, gap: 10, backgroundColor: "#0D1425", borderTopWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  hint:        { fontSize: 12, color: Colors.textMuted },
  input:       { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  label:       { fontSize: 12, color: Colors.textSub, fontWeight: "700", marginTop: 2 },
  radiusChip:  { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" },
  radiusChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  radiusText:  { fontSize: 13, fontWeight: "700", color: Colors.textSub },
});

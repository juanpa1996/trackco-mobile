import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useAppContext } from "../context/AppContext";

export default function LoginScreen({ onLogin: _onLogin }: { onLogin?: () => void }) {
  const { login } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || password.length < 4) {
      setError("Correo o contraseña incorrectos");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
      // Navigation is driven by token state in AppNavigator — no callback needed
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={s.glow1} />
      <View style={s.glow2} />

      <View style={s.logoWrap}>
        <View style={s.logoBox}>
          <Text style={{ fontSize: 28 }}>📍</Text>
        </View>
        <Text style={s.logoText}>Track <Text style={s.logoAccent}>Co</Text></Text>
      </View>

      <View style={s.card}>
        <Text style={s.title}>Bienvenido</Text>
        <Text style={s.subtitle}>Ingresa a tu panel de rastreo GPS</Text>

        <Text style={s.label}>Correo electrónico</Text>
        <TextInput
          style={s.input}
          placeholder="tu@email.com"
          placeholderTextColor="#4A5568"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={s.label}>Contraseña</Text>
        <TextInput
          style={s.input}
          placeholder="••••••••"
          placeholderTextColor="#4A5568"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[s.btn, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={s.btnText}>Ingresar</Text>
          }
        </TouchableOpacity>
      </View>

      <Text style={s.footer}>🔒 Conexión cifrada · Track Co GPS</Text>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080D1A", alignItems: "center", justifyContent: "center", padding: 24 },
  glow1:     { position: "absolute", top: "15%", left: "10%", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(0,212,255,0.05)" },
  glow2:     { position: "absolute", bottom: "20%", right: "10%", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(108,71,255,0.06)" },
  logoWrap:  { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 36 },
  logoBox:   { width: 52, height: 52, borderRadius: 16, backgroundColor: "#0D1528", borderWidth: 1, borderColor: "rgba(0,212,255,0.3)", alignItems: "center", justifyContent: "center" },
  logoText:  { fontSize: 28, fontWeight: "800", color: "white" },
  logoAccent:{ color: "#00D4FF" },
  card:      { width: "100%", backgroundColor: "#0F1629", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  title:     { fontSize: 22, fontWeight: "700", color: "white", textAlign: "center", marginBottom: 4 },
  subtitle:  { fontSize: 13, color: "#64748B", textAlign: "center", marginBottom: 24 },
  label:     { fontSize: 13, color: "#94A3B8", marginBottom: 6 },
  input:     { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 14, color: "white", fontSize: 14, marginBottom: 16 },
  btn:       { borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8, backgroundColor: "#00D4FF" },
  btnText:   { color: "white", fontWeight: "700", fontSize: 15 },
  error:     { color: "#EF4444", fontSize: 13, textAlign: "center", marginBottom: 8 },
  footer:    { fontSize: 11, color: "#334155", marginTop: 24, textAlign: "center" },
});

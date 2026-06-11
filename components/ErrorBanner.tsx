import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={s.banner}>
      <Ionicons name="cloud-offline-outline" size={14} color="#FCA5A5" />
      <Text style={s.text} numberOfLines={1}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#FCA5A5",
  },
});

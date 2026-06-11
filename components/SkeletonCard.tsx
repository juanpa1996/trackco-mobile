import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { Colors, Radius, Spacing } from "../theme";

export function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.65] });

  return (
    <Animated.View style={[s.card, { opacity }]}>
      <View style={s.accent} />
      <View style={s.body}>
        <View style={s.iconBox} />
        <View style={s.meta}>
          <View style={s.line} />
          <View style={[s.line, s.lineShort]} />
        </View>
        <View style={s.pill} />
      </View>
      <View style={s.metrics}>
        <View style={[s.line, s.metricLine]} />
        <View style={[s.line, s.metricLine]} />
        <View style={[s.line, s.metricLine]} />
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card:       { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: "hidden", marginBottom: 10 },
  accent:     { height: 2, backgroundColor: Colors.border },
  body:       { flexDirection: "row", alignItems: "center", gap: Spacing.md, padding: 14 },
  iconBox:    { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.border },
  meta:       { flex: 1, gap: 6 },
  line:       { height: 10, borderRadius: 5, backgroundColor: Colors.border },
  lineShort:  { width: "55%" },
  pill:       { width: 72, height: 26, borderRadius: 99, backgroundColor: Colors.border },
  metrics:    { flexDirection: "row", gap: 16, paddingHorizontal: 14, paddingBottom: 12 },
  metricLine: { width: 48 },
});

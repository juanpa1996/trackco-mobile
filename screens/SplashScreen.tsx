import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import LogoSVG from "../components/LogoSVG";

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const logoScale   = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity  = useRef(new Animated.Value(0)).current;
  const ring1Scale  = useRef(new Animated.Value(0.5)).current;
  const ring1Opacity = useRef(new Animated.Value(0.6)).current;
  const ring2Scale  = useRef(new Animated.Value(0.5)).current;
  const ring2Opacity = useRef(new Animated.Value(0.4)).current;
  const barWidth    = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Pulse rings
    const pulse = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ring1Scale,   { toValue: 2.2, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(ring1Scale,   { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(ring1Opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
          Animated.timing(ring1Opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ]).start();

      setTimeout(() => {
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ring2Scale,   { toValue: 2.8, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(ring2Scale,   { toValue: 0.5, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ring2Opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
            Animated.timing(ring2Opacity, { toValue: 0.4, duration: 0, useNativeDriver: true }),
          ]),
        ]).start();
      }, 300);
    };
    pulse();
    const interval = setInterval(pulse, 1400);

    // Text fade in
    setTimeout(() => {
      Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 500);

    // Tagline
    setTimeout(() => {
      Animated.timing(tagOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 800);

    // Loading bar
    setTimeout(() => {
      Animated.timing(barWidth, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }).start();
    }, 700);

    // Fade out and finish
    setTimeout(() => {
      clearInterval(interval);
      Animated.timing(screenOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => onFinish());
    }, 2600);

    return () => clearInterval(interval);
  }, []);

  return (
    <Animated.View style={[s.container, { opacity: screenOpacity }]}>
      {/* Background glow */}
      <View style={s.glowTop} />
      <View style={s.glowBottom} />

      {/* Grid lines */}
      <View style={s.gridOverlay} />

      {/* Pulse rings behind logo */}
      <View style={s.ringContainer}>
        <Animated.View style={[s.ring, { transform: [{ scale: ring1Scale }], opacity: ring1Opacity, borderColor: "#00D4FF" }]} />
        <Animated.View style={[s.ring, { transform: [{ scale: ring2Scale }], opacity: ring2Opacity, borderColor: "#6C47FF" }]} />
      </View>

      {/* Logo */}
      <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}>
        <LogoSVG size={80} />
      </Animated.View>

      {/* Brand name */}
      <Animated.View style={[s.textBlock, { opacity: textOpacity }]}>
        <Text style={s.brand}>
          <Text style={s.brandWhite}>Safe</Text>
          <Text style={s.brandCyan}>Track</Text>
        </Text>
        <Animated.Text style={[s.tagline, { opacity: tagOpacity }]}>
          Always Tracked. Always Safe.
        </Animated.Text>
      </Animated.View>

      {/* Loading bar */}
      <View style={s.barTrack}>
        <Animated.View style={[s.barFill, {
          width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
        }]} />
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080D1A",
    alignItems: "center",
    justifyContent: "center",
  },
  glowTop: {
    position: "absolute", top: "15%", left: "20%",
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: "rgba(0,212,255,0.07)",
  },
  glowBottom: {
    position: "absolute", bottom: "20%", right: "15%",
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(108,71,255,0.08)",
  },
  gridOverlay: { position: "absolute", inset: 0 },
  ringContainer: {
    position: "absolute",
    width: 100, height: 100,
    alignItems: "center", justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 90, height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
  },
  textBlock: { alignItems: "center", marginTop: 24 },
  brand: { fontSize: 38, fontWeight: "800", letterSpacing: -0.5 },
  brandWhite: { color: "white" },
  brandCyan: { color: "#00D4FF" },
  tagline: { fontSize: 13, color: "#64748B", marginTop: 6, letterSpacing: 0.3 },
  barTrack: {
    position: "absolute", bottom: 80,
    width: "40%", height: 2.5,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#00D4FF",
    borderRadius: 2,
  },
});

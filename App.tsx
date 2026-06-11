import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import LoginScreen    from "./screens/LoginScreen";
import SplashScreen   from "./screens/SplashScreen";
import MapScreen      from "./screens/MapScreen";
import VehiclesScreen from "./screens/VehiclesScreen";
import AlertsScreen   from "./screens/AlertsScreen";
import HistoryScreen  from "./screens/HistoryScreen";
import VehicleDetailScreen from "./screens/VehicleDetailScreen";
import { AppProvider } from "./context/AppContext";
import { useAuthContext } from "./context/AuthContext";
import { useAlertsContext } from "./context/AlertsContext";

const Tab = createBottomTabNavigator();
const VehiclesStack = createNativeStackNavigator();

const TAB_ICON_FILLED: Record<string, string> = {
  Mapa: "map", Unidades: "car", Historial: "time", Alertas: "notifications",
};
const TAB_ICON_OUTLINE: Record<string, string> = {
  Mapa: "map-outline", Unidades: "car-outline", Historial: "time-outline", Alertas: "notifications-outline",
};

type Screen = "splash" | "login" | "app";

function VehiclesNavigator() {
  return (
    <VehiclesStack.Navigator screenOptions={{ headerShown: false }}>
      <VehiclesStack.Screen name="VehicleList"   component={VehiclesScreen as any} />
      <VehiclesStack.Screen name="VehicleDetail" component={VehicleDetailScreen as any} />
    </VehiclesStack.Navigator>
  );
}

function MainTabs() {
  const { unreadCount } = useAlertsContext();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0F1629",
          borderTopColor: "rgba(255,255,255,0.07)",
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarActiveTintColor:   "#00D4FF",
        tabBarInactiveTintColor: "#64748B",
        tabBarLabel: ({ color }) => (
          <Text style={{ color, fontSize: 11, fontWeight: "600" }}>{route.name}</Text>
        ),
        tabBarIcon: ({ color, focused }) => (
          <Ionicons
            name={(focused ? TAB_ICON_FILLED : TAB_ICON_OUTLINE)[route.name] as any}
            size={24}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Mapa"      component={MapScreen} />
      <Tab.Screen name="Unidades"  component={VehiclesNavigator} />
      <Tab.Screen name="Historial" component={HistoryScreen} />
      <Tab.Screen
        name="Alertas"
        component={AlertsScreen}
        options={{ tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { token, sessionReady } = useAuthContext();
  const [splashDone, setSplashDone] = useState(false);

  const ready = splashDone && sessionReady;
  const screen: Screen = !ready ? "splash" : token ? "app" : "login";

  return (
    <>
      <StatusBar style="light" backgroundColor="#080D1A" />
      {screen === "splash" && <SplashScreen onFinish={() => setSplashDone(true)} />}
      {screen === "login"  && <LoginScreen  onLogin={() => {}} />}
      {screen === "app"    && <MainTabs />}
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AppProvider>
    </GestureHandlerRootView>
  );
}

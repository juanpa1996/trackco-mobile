import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiDevices, apiEvents } from "./traccarService";

export const BACKGROUND_FETCH_TASK = "trackco-alert-check";
const LAST_ALERT_KEY = "trackco_last_alert_id";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function sendLocalAlert(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true, data: { type: "alert" } },
    trigger: null,
  });
}

export async function getExpoPushToken(): Promise<string | null> {
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({
      projectId: "4e2c09db-61b8-4371-a817-15f7ca0381f6",
    });
    return data;
  } catch {
    return null;
  }
}

export async function registerBackgroundFetch() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 5 * 60, // 5 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch {
    // Background fetch not available on all platforms/Expo Go
  }
}

const EVENT_LABEL: Record<string, string> = {
  deviceOverspeed: "Exceso de velocidad",
  geofenceExit:    "Salida de zona",
  geofenceEnter:   "Entrada a zona",
  ignitionOff:     "Motor apagado",
  ignitionOn:      "Motor encendido",
  deviceOffline:   "Sin señal",
  lowBattery:      "Batería baja",
};

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const raw = await AsyncStorage.getItem("trackco_session");
    if (!raw) return BackgroundFetch.BackgroundFetchResult.NoData;

    const { token } = JSON.parse(raw);
    if (!token) return BackgroundFetch.BackgroundFetchResult.NoData;

    const lastIdRaw = await AsyncStorage.getItem(LAST_ALERT_KEY);
    const lastId = lastIdRaw ? parseInt(lastIdRaw, 10) : 0;

    const [{ devices }, events] = await Promise.all([
      apiDevices(token),
      apiEvents(token),
    ]);

    const newEvents = events.filter((e) => e.id > lastId);
    if (newEvents.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

    const nameMap = Object.fromEntries(devices.map((d) => [d.id, d.name]));
    const maxId = Math.max(...newEvents.map((e) => e.id));

    for (const event of newEvents.slice(-3)) {
      const label = EVENT_LABEL[event.type] ?? event.type;
      const unit  = nameMap[event.deviceId] ?? `Unidad ${event.deviceId}`;
      await sendLocalAlert(`⚠️ ${label}`, unit);
    }

    if (newEvents.length > 3) {
      await sendLocalAlert(
        `${newEvents.length} nuevas alertas`,
        "Abre la app para verlas"
      );
    }

    await AsyncStorage.setItem(LAST_ALERT_KEY, String(maxId));
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

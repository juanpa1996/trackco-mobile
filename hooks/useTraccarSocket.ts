import { useEffect, useRef, useState, useCallback } from "react";
import { TraccarDevice, TraccarPosition } from "../services/traccarService";

const WS_URL = "ws://167.99.239.193:8082/api/socket";
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT = 10;

export interface LivePositions {
  [deviceId: number]: TraccarPosition;
}

export function useTraccarSocket(jsessionid: string | null) {
  const [positions, setPositions] = useState<LivePositions>({});
  const [devices, setDevices] = useState<Record<number, TraccarDevice>>({});
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!jsessionid) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // React Native WebSocket supports custom headers as 3rd argument (not in standard TS types)
    type RNWebSocket = new (url: string, protocols?: string[], options?: { headers?: Record<string, string> }) => WebSocket;
    const ws = new (WebSocket as unknown as RNWebSocket)(
      WS_URL, undefined, { headers: { Cookie: `JSESSIONID=${jsessionid}` } }
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectCount.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.positions?.length) {
          setPositions((prev) => {
            const next = { ...prev };
            (data.positions as TraccarPosition[]).forEach((p) => { next[p.deviceId] = p; });
            return next;
          });
        }
        if (data.devices?.length) {
          setDevices((prev) => {
            const next = { ...prev };
            (data.devices as TraccarDevice[]).forEach((d) => { next[d.id] = d; });
            return next;
          });
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (reconnectCount.current < MAX_RECONNECT) {
        reconnectCount.current++;
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      }
    };

    ws.onerror = () => ws.close();
  }, [jsessionid]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { positions, devices, connected };
}

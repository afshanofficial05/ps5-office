import { useEffect, useState } from 'react';

export function useRealtime(onEvent) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let ws = null;
    let reconnectTimer = null;

    const connect = () => {
      // Build WebSocket URL from API URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      // Convert http/https to ws/wss
      const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws/realtime';

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onEvent) {
            onEvent(data);
          }
        } catch (err) {
          console.error("Failed to parse realtime message", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        reconnectTimer = setTimeout(connect, 3000);
      };
      
      ws.onerror = (error) => {
        // Error will trigger close, which triggers reconnect
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.close();
      }
    };
  }, [onEvent]);

  return { isConnected };
}

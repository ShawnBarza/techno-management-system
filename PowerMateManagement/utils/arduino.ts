export enum DeviceStatus {
  ON = 'ON',
  OFF = 'OFF'
}

type StatusCallback = (status: DeviceStatus) => void;
let ws: WebSocket | null = null;
const subscribers: Map<string, StatusCallback[]> = new Map();

const ESP32_WS_URL = 'ws://192.168.4.1:81'; // Update with your ESP32's IP and port

export function initializeWebSocket() {
  ws = new WebSocket(ESP32_WS_URL);

  ws.onopen = () => {
    console.log('Connected to ESP32');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const deviceCallbacks = subscribers.get(data.device);
      if (deviceCallbacks) {
        deviceCallbacks.forEach(callback => callback(data.status));
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('Disconnected from ESP32');
    // Attempt to reconnect after 5 seconds
    setTimeout(initializeWebSocket, 5000);
  };
}

export function subscribeToDevice(device: string, callback: StatusCallback) {
  if (!subscribers.has(device)) {
    subscribers.set(device, []);
  }
  subscribers.get(device)?.push(callback);

  return () => {
    const callbacks = subscribers.get(device);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  };
}

export async function toggleDevice(device: string, status: DeviceStatus): Promise<void> {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error('WebSocket not connected');
  }

  const message = JSON.stringify({
    device,
    action: status
  });

  ws.send(message);
}

// Initialize WebSocket connection
initializeWebSocket();

import { WS_CONFIG, getWebSocketUrl } from '../config/constants';

export enum DeviceStatus {
  ON = 'ON',
  OFF = 'OFF'
}

type StatusCallback = (status: DeviceStatus) => void;
type ConnectionCallback = (connected: boolean) => void;
type TimerHandle = ReturnType<typeof setTimeout>;

let ws: WebSocket | null = null;
let connectionTimer: TimerHandle | null = null;
let retryCount = 0;
const subscribers: Map<string, StatusCallback[]> = new Map();
const connectionListeners: Set<ConnectionCallback> = new Set();

class ArduinoService {
  static initialize() {
    if (ws?.readyState === WebSocket.CONNECTING) return;
    
    try {
      ws = new WebSocket(getWebSocketUrl());
      
      connectionTimer = setTimeout(() => {
        if (ws?.readyState === WebSocket.CONNECTING) {
          ws.close();
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, WS_CONFIG.CONNECTION_TIMEOUT);

      ws.onopen = () => {
        console.log('Connected to ESP32');
        retryCount = 0;
        if (connectionTimer) clearTimeout(connectionTimer);
        this.notifyConnectionListeners(true);
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
        this.handleConnectionError(error);
      };

      ws.onclose = () => {
        console.log('Disconnected from ESP32');
        if (connectionTimer) clearTimeout(connectionTimer);
        ws = null;
        this.notifyConnectionListeners(false);
        this.retryConnection();
      };
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  private static handleConnectionError(error: any) {
    console.error('WebSocket error:', error);
    this.notifyConnectionListeners(false);
    this.retryConnection();
  }

  private static retryConnection() {
    if (retryCount < WS_CONFIG.MAX_RETRIES) {
      retryCount++;
      console.log(`Retrying connection (${retryCount}/${WS_CONFIG.MAX_RETRIES})...`);
      setTimeout(() => this.initialize(), WS_CONFIG.RETRY_INTERVAL);
    } else {
      console.log('Max retries reached. Please check your connection settings.');
    }
  }

  private static notifyConnectionListeners(connected: boolean) {
    connectionListeners.forEach(listener => listener(connected));
  }

  static subscribeToConnection(callback: ConnectionCallback) {
    connectionListeners.add(callback);
    return () => connectionListeners.delete(callback);
  }

  static subscribeToDevice(device: string, callback: StatusCallback) {
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

  static async toggleDevice(device: string, status: DeviceStatus): Promise<void> {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message = JSON.stringify({
      device,
      action: status
    });

    ws.send(message);
  }

  static isConnected() {
    return ws?.readyState === WebSocket.OPEN;
  }
}

export default ArduinoService;

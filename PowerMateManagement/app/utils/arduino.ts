import { WS_CONFIG } from '../config/constants';

export enum DeviceStatus {
  ON = 'ON',
  OFF = 'OFF'
}

type StatusCallback = (status: DeviceStatus) => void;
type ConnectionCallback = (connected: boolean) => void;

const subscribers: Map<string, StatusCallback[]> = new Map();
const connectionListeners: Set<ConnectionCallback> = new Set();

class ArduinoService {
  private static baseUrl = `http://${WS_CONFIG.HOST}:${WS_CONFIG.PORT}`;
  private static statusInterval: NodeJS.Timeout | null = null;

  static initialize() {
    // Start polling for status updates
    this.startStatusPolling();
    this.checkConnection();
  }

  private static async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'GET',
        timeout: 5000,
      });
      
      if (response.ok) {
        this.notifyConnectionListeners(true);
      } else {
        this.notifyConnectionListeners(false);
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      this.notifyConnectionListeners(false);
    }
  }

  private static startStatusPolling() {
    // Poll for status every 2 seconds
    this.statusInterval = setInterval(async () => {
      try {
        const response = await fetch(`${this.baseUrl}/status`);
        if (response.ok) {
          const data = await response.json();
          
          // Update device states
          const device1Callbacks = subscribers.get('device1');
          const device2Callbacks = subscribers.get('device2');
          
          if (device1Callbacks) {
            const status = data.r1 === 1 ? DeviceStatus.ON : DeviceStatus.OFF;
            device1Callbacks.forEach(callback => callback(status));
          }
          
          if (device2Callbacks) {
            const status = data.r2 === 1 ? DeviceStatus.ON : DeviceStatus.OFF;
            device2Callbacks.forEach(callback => callback(status));
          }
          
          this.notifyConnectionListeners(true);
        }
      } catch (error) {
        console.error('Status polling failed:', error);
        this.notifyConnectionListeners(false);
      }
    }, 2000);
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
    try {
      const relayNumber = device === 'device1' ? 1 : 2;
      const state = status === DeviceStatus.ON ? 1 : 0;
      
      const response = await fetch(`${this.baseUrl}/set?relay=${relayNumber}&state=${state}`, {
        method: 'GET',
        timeout: 5000,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Toggle device failed:', error);
      throw error;
    }
  }

  static async setTimer(device: string, onTime: number, offTime: number): Promise<void> {
    try {
      const relayNumber = device === 'device1' ? 1 : 2;
      
      const response = await fetch(`${this.baseUrl}/settimer?relay=${relayNumber}&on=${onTime}&off=${offTime}`, {
        method: 'GET',
        timeout: 5000,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Set timer failed:', error);
      throw error;
    }
  }

  static async getStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Get status failed:', error);
      throw error;
    }
  }

  static isConnected() {
    // This will be updated by the polling mechanism
    return true; // Simplified for now
  }

  static cleanup() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }
}

export default ArduinoService;
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { ESP32_CONFIG, getHttpUrl } from '../config/constants';
import { ESP32Status, RelayControl, TimerSchedule } from '../types/esp32';
import { TimerHandle, createInterval, clearIntervalSafe } from '../utils/TimerUtils';

export class ESP32Service {
  private static instance: ESP32Service;
  private baseUrl: string;
  private pollInterval: TimerHandle | null = null;
  private statusCallbacks: ((status: ESP32Status) => void)[] = [];

  private constructor() {
    this.baseUrl = getHttpUrl();
  }

  static getInstance(): ESP32Service {
    if (!ESP32Service.instance) {
      ESP32Service.instance = new ESP32Service();
    }
    return ESP32Service.instance;
  }

  // Test connection to ESP32
  async testConnection(ip?: string): Promise<boolean> {
    try {
      const url = ip ? `http://${ip}:80` : this.baseUrl;
      const response = await fetchWithTimeout(`${url}${ESP32_CONFIG.ENDPOINTS.STATUS}`, {
        method: 'GET',
        timeout: 3000
      });
      return response.ok;
    } catch (error) {
      console.error('ESP32 connection test failed:', error);
      return false;
    }
  }

  // Get current status from ESP32
  async getStatus(): Promise<ESP32Status | null> {
    try {
      const response = await fetchWithTimeout(`${this.baseUrl}${ESP32_CONFIG.ENDPOINTS.STATUS}`, {
        method: 'GET',
        timeout: 5000
      });

      if (response.ok) {
        const status: ESP32Status = await response.json();
        this.notifyStatusUpdate(status);
        return status;
      }
      return null;
    } catch (error) {
      console.error('Failed to get ESP32 status:', error);
      return null;
    }
  }

  // Set relay state (manual override)
  async setRelay(relay: number, state: boolean): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        relay: relay.toString(),
        state: state ? '1' : '0'
      });

      const response = await fetchWithTimeout(`${this.baseUrl}${ESP32_CONFIG.ENDPOINTS.SET_RELAY}?${params}`, {
        method: 'GET',
        timeout: 5000
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to set relay:', error);
      return false;
    }
  }

  // Set timer schedule
  async setTimer(relay: number, onTime: number, offTime: number): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        relay: relay.toString(),
        on: onTime.toString(),
        off: offTime.toString()
      });

      const response = await fetchWithTimeout(`${this.baseUrl}${ESP32_CONFIG.ENDPOINTS.SET_TIMER}?${params}`, {
        method: 'GET',
        timeout: 5000
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to set timer:', error);
      return false;
    }
  }

  // Start polling for status updates
  startPolling(): void {
    if (this.pollInterval) {
      clearIntervalSafe(this.pollInterval);
    }

    this.pollInterval = createInterval(() => {
      this.getStatus();
    }, ESP32_CONFIG.POLL_INTERVAL);
  }

  // Stop polling
  stopPolling(): void {
    clearIntervalSafe(this.pollInterval);
    this.pollInterval = null;
  }

  // Subscribe to status updates
  onStatusUpdate(callback: (status: ESP32Status) => void): void {
    this.statusCallbacks.push(callback);
  }

  // Remove status update callback
  removeStatusCallback(callback: (status: ESP32Status) => void): void {
    this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
  }

  private notifyStatusUpdate(status: ESP32Status): void {
    this.statusCallbacks.forEach(callback => callback(status));
  }

  // Update base URL for different IP
  setBaseUrl(ip: string): void {
    this.baseUrl = `http://${ip}:80`;
  }
}


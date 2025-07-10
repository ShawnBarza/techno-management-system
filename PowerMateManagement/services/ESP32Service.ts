import { ESP32Status } from '../types/esp32';
import { getHttpUrl, ESP32_CONFIG } from '../config/constants';

type StatusUpdateCallback = (status: ESP32Status) => void;

export class ESP32Service {
  private static instance: ESP32Service;
  private statusCallbacks: StatusUpdateCallback[] = [];
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private baseUrl = getHttpUrl();

  private constructor() {}

  public static getInstance(): ESP32Service {
    if (!ESP32Service.instance) {
      ESP32Service.instance = new ESP32Service();
    }
    return ESP32Service.instance;
  }

  public async testConnection(): Promise<boolean> {
    try {
      console.log('Testing connection to:', this.baseUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}${ESP32_CONFIG.ENDPOINTS.STATUS}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      const isConnected = response.ok;
      console.log('Connection test result:', isConnected);
      return isConnected;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  public async getStatus(): Promise<ESP32Status | null> {
    try {
      console.log('Getting status from:', `${this.baseUrl}${ESP32_CONFIG.ENDPOINTS.STATUS}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}${ESP32_CONFIG.ENDPOINTS.STATUS}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: ESP32Status = await response.json();
      console.log('Status received:', data);
      this.notifyStatusUpdate(data);
      return data;
    } catch (error) {
      console.error('Failed to get ESP32 status:', error);
      return null;
    }
  }

  public async setRelay(relay: number, state: boolean, override: boolean = false): Promise<boolean> {
    try {
      const url = `${this.baseUrl}${ESP32_CONFIG.ENDPOINTS.SET_RELAY}?relay=${relay}&state=${state ? 1 : 0}&override=${override ? 'true' : 'false'}`;
      console.log('Setting relay with URL:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      const success = response.ok;
      console.log('Relay set response:', success);
      return success;
    } catch (error) {
      console.error(`Failed to set relay ${relay}:`, error);
      return false;
    }
  }

  public async setTimer(relay: number, onTime: number, offTime: number): Promise<boolean> {
    try {
      const url = `${this.baseUrl}${ESP32_CONFIG.ENDPOINTS.SET_TIMER}?relay=${relay}&on=${onTime}&off=${offTime}`;
      console.log('Setting timer with URL:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error(`Failed to set timer for relay ${relay}:`, error);
      return false;
    }
  }

  public async clearOverride(relay: number): Promise<boolean> {
    try {
      const url = `${this.baseUrl}${ESP32_CONFIG.ENDPOINTS.CLEAR_OVERRIDE}?relay=${relay}`;
      console.log('Clearing override with URL:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error(`Failed to clear override for relay ${relay}:`, error);
      return false;
    }
  }

  public startPolling(interval = ESP32_CONFIG.POLL_INTERVAL): void {
    this.stopPolling();
    this.pollingInterval = setInterval(() => this.getStatus(), interval);
  }

  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  public onStatusUpdate(callback: StatusUpdateCallback): void {
    this.statusCallbacks.push(callback);
  }

  public removeStatusCallback(callback: StatusUpdateCallback): void {
    this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
  }

  private notifyStatusUpdate(status: ESP32Status): void {
    this.statusCallbacks.forEach(cb => cb(status));
  }
}
import { ESP32Status } from '../types/esp32';

const ESP32_BASE_URL = 'http://192.168.43.58'; // Use the IP from your config

type StatusUpdateCallback = (status: ESP32Status) => void;

export class ESP32Service {
  private static instance: ESP32Service;
  private statusCallbacks: StatusUpdateCallback[] = [];
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  public static getInstance(): ESP32Service {
    if (!ESP32Service.instance) {
      ESP32Service.instance = new ESP32Service();
    }
    return ESP32Service.instance;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${ESP32_BASE_URL}/status`);
      return response.ok;
    } catch (error) {
      console.error('Failed to connect to ESP32:', error);
      return false;
    }
  }

  public async getStatus(): Promise<ESP32Status | null> {
    try {
      const response = await fetch(`${ESP32_BASE_URL}/status`);
      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`);
      }
      const data: ESP32Status = await response.json();
      this.notifyStatusUpdate(data);
      return data;
    } catch (error) {
      console.error('Failed to get ESP32 status:', error);
      return null;
    }
  }

  // UPDATED: Added override parameter
  public async setRelay(relay: number, state: boolean, override: boolean = false): Promise<boolean> {
    try {
      const url = `${ESP32_BASE_URL}/set?relay=${relay}&state=${state ? 1 : 0}&override=${override ? 'true' : 'false'}`;
      console.log('Setting relay with URL:', url);
      const response = await fetch(url);
      const success = response.ok;
      console.log('Relay set response:', success);
      return success;
    } catch (error) {
      console.error(`Failed to set relay ${relay}:`, error);
      return false;
    }
  }

  // Use the correct timer endpoint from your config
  public async setTimer(relay: number, onTime: number, offTime: number): Promise<boolean> {
    try {
      const response = await fetch(`${ESP32_BASE_URL}/settimer?relay=${relay}&on=${onTime}&off=${offTime}`);
      return response.ok;
    } catch (error) {
      console.error(`Failed to set timer for relay ${relay}:`, error);
      return false;
    }
  }

  // NEW: Add clear override method
  public async clearOverride(relay: number): Promise<boolean> {
    try {
      const response = await fetch(`${ESP32_BASE_URL}/clearoverride?relay=${relay}`);
      return response.ok;
    } catch (error) {
      console.error(`Failed to clear override for relay ${relay}:`, error);
      return false;
    }
  }

  public startPolling(interval = 5000): void {
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
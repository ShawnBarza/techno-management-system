import { ESP32Status } from '../types/esp32';
import { ESP32_CONFIG } from '../config/constants';

type StatusUpdateCallback = (status: ESP32Status) => void;

export class ESP32Service {
  private static instance: ESP32Service;
  private statusCallbacks: StatusUpdateCallback[] = [];
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private currentIP: string | null = null;

  private constructor() {
    this.loadLastKnownIP();
  }

  public static getInstance(): ESP32Service {
    if (!ESP32Service.instance) {
      ESP32Service.instance = new ESP32Service();
    }
    return ESP32Service.instance;
  }

  // Load last successful IP from storage
  private async loadLastKnownIP(): Promise<void> {
    try {
      // Start with no IP - user must enter one manually
      this.currentIP = null;
      console.log('[ESP32Service] No default IP set - user must connect manually');
    } catch (error) {
      console.log('[ESP32Service] No previous IP found');
    }
  }

  // Save successful IP for future use
  private async saveLastKnownIP(ip: string): Promise<void> {
    try {
      // For now, just store in memory - you can implement AsyncStorage later
      this.currentIP = ip;
      console.log('[ESP32Service] Saved ESP32 IP:', ip);
    } catch (error) {
      console.error('[ESP32Service] Failed to save IP:', error);
    }
  }

  // Test connection to specific IP
  private async testConnectionToIP(ip: string): Promise<boolean> {
    const testUrl = `http://${ip}/status`;
    console.log('[ESP32Service] testConnectionToIP URL:', testUrl);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.log('[ESP32Service] testConnectionToIP status:', response.status);
      return response.ok;
    } catch (error) {
      console.error('[ESP32Service] testConnectionToIP error:', error);
      return false;
    }
  }

  // Set active device IP
  public async setDeviceIP(ip: string): Promise<boolean> {
    console.log('[ESP32Service] Attempting setDeviceIP:', ip);
    const isValid = await this.testConnectionToIP(ip);
    console.log('[ESP32Service] setDeviceIP result:', isValid);
    if (isValid) {
      await this.saveLastKnownIP(ip);
      return true;
    }
    return false;
  }

  // Get current base URL
  private getBaseUrl(): string {
    return `http://${this.currentIP || '192.168.4.1'}`;
  }

  public async testConnection(): Promise<boolean> {
    if (!this.currentIP) {
      console.warn('[ESP32Service] testConnection: no IP set');
      return false;
    }
    const url = `${this.getBaseUrl()}/status`;
    console.log('[ESP32Service] Testing connection to:', url);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      console.log('[ESP32Service] testConnection status:', response.status);
      return response.ok;
    } catch (error) {
      console.error('[ESP32Service] testConnection failed:', error);
      return false;
    }
  }

  public async getStatus(): Promise<ESP32Status | null> {
    if (!this.currentIP) {
      console.warn('[ESP32Service] getStatus: no IP set');
      return null;
    }
    const url = `${this.getBaseUrl()}/status`;
    console.log('[ESP32Service] Getting status from:', url);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      console.log('[ESP32Service] getStatus response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data: ESP32Status = await response.json();
      console.log('[ESP32Service] Status received:', data);
      this.notifyStatusUpdate(data);
      return data;
    } catch (error) {
      console.error('[ESP32Service] Failed to get ESP32 status:', error);
      return null;
    }
  }

  public async setRelay(relay: number, state: boolean, override: boolean = false): Promise<boolean> {
    if (!this.currentIP) {
      console.warn('[ESP32Service] setRelay: no IP set');
      return false;
    }
    const url = `${this.getBaseUrl()}/set?relay=${relay}&state=${state ? 1 : 0}&override=${override}`;
    console.log('[ESP32Service] Setting relay with URL:', url);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      console.log('[ESP32Service] Relay set response status:', response.status);
      return response.ok;
    } catch (error) {
      console.error(`[ESP32Service] Failed to set relay ${relay}:`, error);
      return false;
    }
  }

  public async setTimer(relay: number, onTime: number, offTime: number): Promise<boolean> {
    if (!this.currentIP) {
      console.warn('[ESP32Service] setTimer: no IP set');
      return false;
    }
    const url = `${this.getBaseUrl()}/settimer?relay=${relay}&on=${onTime}&off=${offTime}`;
    console.log('[ESP32Service] Setting timer with URL:', url);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      console.log('[ESP32Service] setTimer response status:', response.status);
      return response.ok;
    } catch (error) {
      console.error(`[ESP32Service] Failed to set timer for relay ${relay}:`, error);
      return false;
    }
  }

  public async clearOverride(relay: number): Promise<boolean> {
    if (!this.currentIP) {
      console.warn('[ESP32Service] clearOverride: no IP set');
      return false;
    }
    const url = `${this.getBaseUrl()}/clearoverride?relay=${relay}`;
    console.log('[ESP32Service] Clearing override with URL:', url);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      console.log('[ESP32Service] clearOverride response status:', response.status);
      return response.ok;
    } catch (error) {
      console.error(`[ESP32Service] Failed to clear override for relay ${relay}:`, error);
      return false;
    }
  }

  // Get current device IP
  public getCurrentDeviceIP(): string | null {
    return this.currentIP;
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

import { ESP32Status } from '../types/esp32';
import { ESP32_CONFIG } from '../config/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import NetworkManager from './NetworkManager';

type StatusUpdateCallback = (status: ESP32Status) => void;

export class ESP32Service {
  private static instance: ESP32Service;
  private statusCallbacks: StatusUpdateCallback[] = [];
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private currentIP: string | null = null;
  private discoveredIPs: string[] = [];

  // Common IP ranges to scan
  private commonIPs = [
    '192.168.4.1',     // ESP32 AP mode default
    '192.168.1.100',   // Common home network
    '192.168.0.100',   // Another common range
    '192.168.254.113', // Your current ESP32 IP
    '10.0.0.100',      // Mobile hotspot range
    '172.16.0.100',    // Corporate network
    '192.168.43.100'   // Android hotspot default
  ];

  private constructor() {
    this.loadLastKnownIP();
    this.setupNetworkChangeHandler();
  }

  private setupNetworkChangeHandler(): void {
    NetworkManager.onNetworkChange(async (state) => {
      console.log('Network changed:', state.type);
      if (state.isConnected) {
        // Try to reconnect using last known IP for this network
        const lastIP = await NetworkManager.getLastKnownIP();
        if (lastIP && await this.testConnectionToIP(lastIP)) {
          console.log('Reconnected to last known device:', lastIP);
          await this.setDeviceIP(lastIP);
        } else {
          // Try to discover devices on new network
          console.log('Attempting device discovery on new network');
          const devices = await this.discoverDevices();
          if (devices.length > 0) {
            await this.setDeviceIP(devices[0]);
          }
        }
      }
    });
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
      const savedIP = await AsyncStorage.getItem('last_esp32_ip');
      if (savedIP) {
        this.currentIP = savedIP;
        console.log('Loaded last known IP:', savedIP);
      }
    } catch (error) {
      console.log('No previous IP found');
    }
  }

  // Save successful IP for future use
  private async saveLastKnownIP(ip: string): Promise<void> {
    try {
      await AsyncStorage.setItem('last_esp32_ip', ip);
      this.currentIP = ip;
      console.log('Saved ESP32 IP:', ip);
    } catch (error) {
      console.error('Failed to save IP:', error);
    }
  }

  // Get current network info to determine likely IP ranges
  private async getNetworkBasedIPs(): Promise<string[]> {
    const ips: string[] = [];
    
    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.type === 'wifi' && netInfo.details) {
        const details = netInfo.details as any;
        if (details.ipAddress) {
          // Extract network range from device IP
          const parts = details.ipAddress.split('.');
          if (parts.length === 4) {
            const networkBase = `${parts[0]}.${parts[1]}.${parts[2]}.`;
            // Try common device IPs in this range
            for (let i = 100; i <= 120; i++) {
              ips.push(networkBase + i);
            }
          }
        }
      }
    } catch (error) {
      console.log('Could not get network info');
    }

    // Always include common IPs
    ips.push(...this.commonIPs);
    
    // Remove duplicates
    return Array.from(new Set(ips));
  }

  // Discover ESP32 devices on network
  public async discoverDevices(): Promise<string[]> {
    console.log('🔍 Starting ESP32 discovery...');
    const foundDevices: string[] = [];
    
    // Get IPs to scan based on current network
    const ipsToScan = await this.getNetworkBasedIPs();
    
    console.log(`Scanning ${ipsToScan.length} potential IPs...`);
    
    // Test IPs in batches for faster discovery
    const batchSize = 10;
    for (let i = 0; i < ipsToScan.length; i += batchSize) {
      const batch = ipsToScan.slice(i, i + batchSize);
      const promises = batch.map(ip => this.testESP32Device(ip));
      
      const results = await Promise.allSettled(promises);
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const ip = batch[index];
          foundDevices.push(ip);
          console.log('✅ Found ESP32 at:', ip);
        }
      });
    }

    this.discoveredIPs = foundDevices;
    console.log(`Discovery complete. Found ${foundDevices.length} devices`);
    return foundDevices;
  }

  // Test if specific IP has an ESP32 device
  private async testESP32Device(ip: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`http://${ip}/info`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        // Check if it's a PowerMate device
        return data.device_id && data.device_id.includes('PowerMate');
      }
    } catch (error) {
      // Device not found or timeout
    }
    return false;
  }

  // Test connection to specific IP
  private async testConnectionToIP(ip: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`http://${ip}/status`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Set active device IP
  public async setDeviceIP(ip: string): Promise<boolean> {
    const isValid = await this.testConnectionToIP(ip);
    if (isValid) {
      await this.saveLastKnownIP(ip);
      await NetworkManager.rememberDevice(ip);
      console.log('Set active device IP:', ip);
      return true;
    }
    return false;
  }

  // Get current base URL
  private getBaseUrl(): string {
    return `http://${this.currentIP || '192.168.4.1'}`;
  }

  public async testConnection(): Promise<boolean> {
    try {
      // If no current IP, try to discover devices
      if (!this.currentIP) {
        const devices = await this.discoverDevices();
        if (devices.length > 0) {
          await this.setDeviceIP(devices[0]);
        } else {
          return false;
        }
      }

      console.log('Testing connection to:', this.getBaseUrl());
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.getBaseUrl()}/status`, {
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
      // Auto-discover if no current IP
      if (!this.currentIP) {
        const devices = await this.discoverDevices();
        if (devices.length === 0) {
          throw new Error('No ESP32 devices found');
        }
        await this.setDeviceIP(devices[0]);
      }

      console.log('Getting status from:', `${this.getBaseUrl()}/status`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.getBaseUrl()}/status`, {
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
      // Try to rediscover if current connection fails
      this.currentIP = null;
      return null;
    }
  }

  public async setRelay(relay: number, state: boolean, override: boolean = false): Promise<boolean> {
    try {
      if (!this.currentIP) {
        const devices = await this.discoverDevices();
        if (devices.length === 0) return false;
        await this.setDeviceIP(devices[0]);
      }

      const url = `${this.getBaseUrl()}/set?relay=${relay}&state=${state ? 1 : 0}&override=${override ? 'true' : 'false'}`;
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
      if (!this.currentIP) {
        const devices = await this.discoverDevices();
        if (devices.length === 0) return false;
        await this.setDeviceIP(devices[0]);
      }

      const url = `${this.getBaseUrl()}/settimer?relay=${relay}&on=${onTime}&off=${offTime}`;
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
      if (!this.currentIP) {
        const devices = await this.discoverDevices();
        if (devices.length === 0) return false;
        await this.setDeviceIP(devices[0]);
      }

      const url = `${this.getBaseUrl()}/clearoverride?relay=${relay}`;
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

  public disconnectDevice(): void {
    this.stopPolling();
    this.currentIP = null;
    this.discoveredIPs = [];
  }

  // Get discovered devices
  public getDiscoveredDevices(): string[] {
    return this.discoveredIPs;
  }

  // Get current device IP
  public getCurrentDeviceIP(): string | null {
    return this.currentIP;
  }

  // Force rediscovery
  public async forceRediscover(): Promise<string[]> {
    this.currentIP = null;
    this.discoveredIPs = [];
    return await this.discoverDevices();
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
import { ESP32_CONFIG, getHttpUrl } from '../config/constants';

export interface RelayStatus {
  r1: boolean;
  r2: boolean;
  time: number;
  r1_on: number;
  r1_off: number;
  r2_on: number;
  r2_off: number;
  r1_override: boolean;
  r2_override: boolean;
}

export interface TimerSchedule {
  relay: number;
  onTime: number;  // HHMM format
  offTime: number; // HHMM format
}

class RelayService {
  private currentHost: string | null = null;
  private isConnected: boolean = false;
  private statusCallbacks: ((status: RelayStatus) => void)[] = [];
  private connectionCallbacks: ((connected: boolean) => void)[] = [];

  // Connect to device with IP address
  async connectToDevice(ipAddress: string): Promise<boolean> {
    try {
      console.log(`Attempting to connect to ${ipAddress}`);
      const url = getHttpUrl(ipAddress);
      console.log(`Full URL: ${url}${ESP32_CONFIG.ENDPOINTS.STATUS}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ESP32_CONFIG.CONNECTION_TIMEOUT);
      
      const response = await fetch(`${url}${ESP32_CONFIG.ENDPOINTS.STATUS}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Connection successful, data:', data);
        this.currentHost = ipAddress;
        this.setConnectionStatus(true);
        this.notifyStatusUpdate(data);
        return true;
      } else {
        console.log(`HTTP error: ${response.status}`);
        this.setConnectionStatus(false);
        return false;
      }
    } catch (error) {
      console.log(`Connection failed to ${ipAddress}:`, error);
      this.setConnectionStatus(false);
      return false;
    }
  }

  // Get current status
  async getStatus(): Promise<RelayStatus | null> {
    if (!this.currentHost) return null;

    try {
      const url = getHttpUrl(this.currentHost);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ESP32_CONFIG.CONNECTION_TIMEOUT);
      
      const response = await fetch(`${url}${ESP32_CONFIG.ENDPOINTS.STATUS}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        this.setConnectionStatus(true);
        this.notifyStatusUpdate(data);
        return data;
      } else {
        console.error('Error getting status:', response.status);
        this.setConnectionStatus(false);
      }
    } catch (error) {
      console.error('Error getting status:', error);
      this.setConnectionStatus(false);
    }
    
    return null;
  }

  // Set relay state
  async setRelay(relay: number, state: boolean, override: boolean = false): Promise<boolean> {
    if (!this.currentHost) return false;

    try {
      const url = getHttpUrl(this.currentHost);
      const params = new URLSearchParams({
        relay: relay.toString(),
        state: state ? '1' : '0',
        override: override.toString()
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ESP32_CONFIG.CONNECTION_TIMEOUT);
      
      const response = await fetch(`${url}${ESP32_CONFIG.ENDPOINTS.SET_RELAY}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        this.setConnectionStatus(true);
        // Refresh status after setting relay
        setTimeout(() => this.getStatus(), 500);
        return true;
      } else {
        console.error('Error setting relay:', response.status);
        this.setConnectionStatus(false);
      }
    } catch (error) {
      console.error('Error setting relay:', error);
      this.setConnectionStatus(false);
    }
    
    return false;
  }

  // Set timer schedule
  async setTimer(schedule: TimerSchedule): Promise<boolean> {
    if (!this.currentHost) return false;

    try {
      const url = getHttpUrl(this.currentHost);
      const params = new URLSearchParams({
        relay: schedule.relay.toString(),
        on: schedule.onTime.toString(),
        off: schedule.offTime.toString()
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ESP32_CONFIG.CONNECTION_TIMEOUT);
      
      const response = await fetch(`${url}${ESP32_CONFIG.ENDPOINTS.SET_TIMER}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        this.setConnectionStatus(true);
        // Refresh status after setting timer
        setTimeout(() => this.getStatus(), 500);
        return true;
      } else {
        console.error('Error setting timer:', response.status);
        this.setConnectionStatus(false);
      }
    } catch (error) {
      console.error('Error setting timer:', error);
      this.setConnectionStatus(false);
    }
    
    return false;
  }

  // Clear manual override
  async clearOverride(relay: number): Promise<boolean> {
    if (!this.currentHost) return false;

    try {
      const url = getHttpUrl(this.currentHost);
      const params = new URLSearchParams({
        relay: relay.toString()
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ESP32_CONFIG.CONNECTION_TIMEOUT);
      
      const response = await fetch(`${url}${ESP32_CONFIG.ENDPOINTS.CLEAR_OVERRIDE}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        this.setConnectionStatus(true);
        // Refresh status after clearing override
        setTimeout(() => this.getStatus(), 500);
        return true;
      } else {
        console.error('Error clearing override:', response.status);
        this.setConnectionStatus(false);
      }
    } catch (error) {
      console.error('Error clearing override:', error);
      this.setConnectionStatus(false);
    }
    
    return false;
  }

  // Disconnect from device
  disconnect(): void {
    this.currentHost = null;
    this.setConnectionStatus(false);
  }

  // Utility methods
  timeToHHMM(timeStr: string): number {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':');
    return parseInt(hours) * 100 + parseInt(minutes);
  }

  HHMMToTime(hhmm: number): string {
    if (hhmm === -1) return "";
    const hours = Math.floor(hhmm / 100);
    const minutes = hhmm % 100;
    return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;
  }

  // 12-hour format conversion utilities
  HHMMToTime12Hour(hhmm: number): string {
    if (hhmm === -1) return "";
    const hours = Math.floor(hhmm / 100);
    const minutes = hhmm % 100;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  time12HourToHHMM(timeStr: string, period: 'AM' | 'PM'): number {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':');
    let hour24 = parseInt(hours);
    
    if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    } else if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    }
    
    return hour24 * 100 + parseInt(minutes);
  }

  formatCurrentTime12Hour(hhmm: number): string {
    if (hhmm === -1) return "";
    const hours = Math.floor(hhmm / 100);
    const minutes = hhmm % 100;
    const seconds = 0; // ESP32 doesn't provide seconds
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${period}`;
  }

  // Event handling
  onStatusUpdate(callback: (status: RelayStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionCallbacks.push(callback);
  }

  private setConnectionStatus(connected: boolean): void {
    if (this.isConnected !== connected) {
      this.isConnected = connected;
      this.connectionCallbacks.forEach(callback => callback(connected));
    }
  }

  private notifyStatusUpdate(status: RelayStatus): void {
    this.statusCallbacks.forEach(callback => callback(status));
  }

  get connected(): boolean {
    return this.isConnected;
  }

  get deviceHost(): string | null {
    return this.currentHost;
  }

  // Start polling for status updates
  startPolling(): void {
    setInterval(() => {
      if (this.currentHost) {
        this.getStatus();
      }
    }, ESP32_CONFIG.POLL_INTERVAL);
  }
}

export default new RelayService();

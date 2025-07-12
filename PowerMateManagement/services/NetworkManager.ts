import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NetworkDevice {
  ip: string;
  network: string;
  timestamp: number;
}

class NetworkManager {
  private static instance: NetworkManager;
  private networkChangeListeners: ((state: NetInfoState) => void)[] = [];
  private deviceMap: Map<string, NetworkDevice> = new Map();
  private currentNetwork: string | null = null;

  private constructor() {
    this.setupNetworkListener();
    this.loadStoredDevices();
  }

  public static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const networkId = this.getNetworkIdentifier(state);
      if (networkId !== this.currentNetwork) {
        this.currentNetwork = networkId;
        this.notifyNetworkChange(state);
      }
    });
  }

  private getNetworkIdentifier(state: NetInfoState): string {
    if (state.type === 'wifi' && state.details) {
      return `wifi_${state.details.ssid || state.details.ipAddress}`;
    } else if (state.type === 'cellular') {
      return `cellular_${state.details?.carrier || 'unknown'}`;
    }
    return `other_${state.type}`;
  }

  private async loadStoredDevices(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('network_devices');
      if (stored) {
        const devices = JSON.parse(stored) as NetworkDevice[];
        devices.forEach(device => {
          this.deviceMap.set(device.network, device);
        });
      }
    } catch (error) {
      console.error('Failed to load stored devices:', error);
    }
  }

  private async saveDevices(): Promise<void> {
    try {
      const devices = Array.from(this.deviceMap.values());
      await AsyncStorage.setItem('network_devices', JSON.stringify(devices));
    } catch (error) {
      console.error('Failed to save devices:', error);
    }
  }

  public async getCurrentNetwork(): Promise<string | null> {
    const state = await NetInfo.fetch();
    return this.getNetworkIdentifier(state);
  }

  public async rememberDevice(ip: string): Promise<void> {
    const network = await this.getCurrentNetwork();
    if (network) {
      this.deviceMap.set(network, {
        ip,
        network,
        timestamp: Date.now()
      });
      await this.saveDevices();
    }
  }

  public async getLastKnownIP(): Promise<string | null> {
    const network = await this.getCurrentNetwork();
    if (network) {
      const device = this.deviceMap.get(network);
      return device?.ip || null;
    }
    return null;
  }

  public onNetworkChange(callback: (state: NetInfoState) => void): void {
    this.networkChangeListeners.push(callback);
  }

  private notifyNetworkChange(state: NetInfoState): void {
    this.networkChangeListeners.forEach(listener => listener(state));
  }

  public removeNetworkChangeListener(callback: (state: NetInfoState) => void): void {
    this.networkChangeListeners = this.networkChangeListeners.filter(
      listener => listener !== callback
    );
  }
}

export default NetworkManager.getInstance();

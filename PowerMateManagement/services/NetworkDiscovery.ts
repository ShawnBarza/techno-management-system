import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { ESP32_CONFIG } from '../config/constants';

export class NetworkDiscovery {
  private static readonly ESP32_PORT = 80;
  private static readonly DISCOVERY_TIMEOUT = 3000;

  static async findESP32Devices(): Promise<string[]> {
    const devices: string[] = [];
    const promises: Promise<void>[] = [];

    // Get current device IP to determine subnet
    const currentIP = await this.getCurrentDeviceIP();
    const subnet = this.getSubnet(currentIP);

    // Scan the current subnet
    for (let i = 1; i <= 254; i++) {
      const ip = `${subnet}${i}`;
      promises.push(this.checkESP32Device(ip).then(isESP32 => {
        if (isESP32) devices.push(ip);
      }));
    }

    await Promise.allSettled(promises);
    return devices;
  }

  private static async checkESP32Device(ip: string): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(`http://${ip}:${this.ESP32_PORT}${ESP32_CONFIG.ENDPOINTS.STATUS}`, {
        method: 'GET',
        timeout: this.DISCOVERY_TIMEOUT
      });
      
      if (response.ok) {
        const data = await response.json();
        // Check if response has expected ESP32 relay data structure
        return typeof data.r1 === 'number' && typeof data.r2 === 'number';
      }
    } catch (error) {
      // Device not responding or not ESP32
    }
    return false;
  }

  private static async getCurrentDeviceIP(): Promise<string> {
    // For local network discovery, we need to determine the local subnet
    // Instead of getting external IP, let's use common local network ranges
    const commonSubnets = [
      '192.168.1.',
      '192.168.0.',
      '192.168.254.',
      '10.0.0.',
      '172.16.0.'
    ];
    
    // Return the first common subnet as default
    // In a real implementation, you might want to try multiple subnets
    return '192.168.254.1'; // This matches your ESP32's likely subnet
  }

  private static getSubnet(ip: string): string {
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.`;
  }
}

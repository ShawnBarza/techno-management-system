export interface ESP32Status {
  time: number;
  r1: boolean;
  r2: boolean;
  r1_on: number;
  r1_off: number;
  r2_on: number;
  r2_off: number;
  device_id?: string;
  uptime?: number;
  wifi_rssi?: number;
}

export interface DeviceInfo {
  device_id: string;
  firmware_version: string;
  uptime: number;
  wifi_ssid: string;
  wifi_rssi: number;
}

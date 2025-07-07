export interface ESP32Status {
  r1: number;           // Relay 1 state (0 or 1)
  r2: number;           // Relay 2 state (0 or 1)
  time: number;         // Current time in HHMM format
  r1_on: number;        // Relay 1 on time
  r1_off: number;       // Relay 1 off time
  r2_on: number;        // Relay 2 on time
  r2_off: number;       // Relay 2 off time
}

export interface RelayControl {
  relay: number;        // Relay number (1 or 2)
  state: number;        // State (0 or 1)
}

export interface TimerSchedule {
  relay: number;        // Relay number (1 or 2)
  on: number;          // On time in HHMM format
  off: number;         // Off time in HHMM format
}

export interface ESP32Device {
  ip: string;
  status: ESP32Status | null;
  lastUpdate: Date | null;
  connected: boolean;
}

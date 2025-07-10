export const WS_CONFIG = {
  // Update these values according to your ESP32 setup
  HOST: '192.168.254.113', // Your ESP32's IP address
  PORT: '80',
  CONNECTION_TIMEOUT: 10000,
  RETRY_INTERVAL: 5000,
  MAX_RETRIES: 3
};

export const ESP32_CONFIG = {
  PORT: 80,
  
  // API endpoints matching Arduino code
  ENDPOINTS: {
    STATUS: '/status',
    SET_RELAY: '/set',
    SET_TIMER: '/settimer',
    CLEAR_OVERRIDE: '/clearoverride'
  },
  
  // Connection settings
  CONNECTION_TIMEOUT: 10000,
  RETRY_INTERVAL: 5000,
  MAX_RETRIES: 3,
  POLL_INTERVAL: 5000,
  
  // Device info
  RELAY_COUNT: 2,
  DEVICE_NAME: 'PowerMate'
};

// Device discovery
export const DISCOVERY_CONFIG = {
  BROADCAST_PORT: 5353,
  DISCOVERY_TIMEOUT: 5000,
  SERVICE_TYPE: '_http._tcp.local'
};

export const getWebSocketUrl = () => `ws://${WS_CONFIG.HOST}:${WS_CONFIG.PORT}`;
export const getHttpUrl = (host: string) => {
  return `http://${host}:${ESP32_CONFIG.PORT}`;
};

// IP address validation
export const validateIP = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
};

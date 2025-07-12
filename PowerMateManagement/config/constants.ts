export const ESP32_CONFIG = {
  PORT: 80,
  ENDPOINTS: {
    STATUS: '/status',
    SET_RELAY: '/set',
    SET_TIMER: '/settimer',
    CLEAR_OVERRIDE: '/clearoverride',
    INFO: '/info'
  },
  CONNECTION_TIMEOUT: 5000,
  RETRY_INTERVAL: 2000,
  MAX_RETRIES: 3,
  POLL_INTERVAL: 5000,
  RELAY_COUNT: 2,
  DEVICE_NAME: 'PowerMate'
};

// Device discovery
export const DISCOVERY_CONFIG = {
  BROADCAST_PORT: 5353,
  DISCOVERY_TIMEOUT: 5000,
  SERVICE_TYPE: '_http._tcp.local'
};

// Remove hardcoded HOST since we're using dynamic discovery
export const getHttpUrl = () => {
  // This will be handled by ESP32Service
  return '';
};

// IP address validation
export const validateIP = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
};

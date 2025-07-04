export const WS_CONFIG = {
  // Update these values according to your ESP32 setup
  HOST: '192.168.254.113', // Your ESP32's IP address
  PORT: '80',
  CONNECTION_TIMEOUT: 10000,
  RETRY_INTERVAL: 5000,
  MAX_RETRIES: 3
};

export const ESP32_CONFIG = {
  // Your ESP32 WiFi network
  WIFI_SSID: 'Timmy_2.4',
  // API endpoints
  ENDPOINTS: {
    STATUS: '/status',
    SET_RELAY: '/set',
    SET_TIMER: '/settimer'
  },
  POLL_INTERVAL: 5000, // Poll status every 5 seconds
  RELAY_COUNT: 2
};

export const getWebSocketUrl = () => `ws://${WS_CONFIG.HOST}:${WS_CONFIG.PORT}`;
export const getHttpUrl = () => `http://${WS_CONFIG.HOST}:${WS_CONFIG.PORT}`;

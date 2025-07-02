export const WS_CONFIG = {
  // Update these values according to your ESP32 setup
  HOST: '192.168.254.100', // Your ESP32's IP address
  PORT: '81',
  CONNECTION_TIMEOUT: 10000,
  RETRY_INTERVAL: 5000,
  MAX_RETRIES: 3
};

export const getWebSocketUrl = () => `ws://${WS_CONFIG.HOST}:${WS_CONFIG.PORT}`;

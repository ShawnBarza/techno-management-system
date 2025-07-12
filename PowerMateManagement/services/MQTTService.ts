// services/MQTTService.ts
import { Alert } from 'react-native';
import { connect, MqttClient } from 'mqtt';

export default class MQTTService {
  private static instance: MQTTService;
  private client: MqttClient | null = null;
  private brokerUrl: string = 'mqtt://broker.hivemq.com:1883'; // change if needed
  private topic = 'powermate/control';

  static getInstance() {
    if (!MQTTService.instance) {
      MQTTService.instance = new MQTTService();
    }
    return MQTTService.instance;
  }

  connect(onMessage: (topic: string, payload: string) => void) {
    this.client = connect(this.brokerUrl, {
      reconnectPeriod: 5000,
    });

    this.client.on('connect', () => {
      console.log('✅ MQTT Connected');
      this.client?.subscribe(this.topic);
    });

    this.client.on('message', (topic, message) => {
      onMessage(topic, message.toString());
    });

    this.client.on('error', (err) => {
      console.error('MQTT error:', err);
      Alert.alert('MQTT Error', err.message);
    });
  }

  publishMessage(message: string) {
    this.client?.publish(this.topic, message);
  }

  disconnect() {
    if (this.client) {
      this.client.end(true);
      this.client = null;
      console.log('🔌 MQTT Disconnected');
    }
  }
}

export const mqttService = MQTTService.getInstance();

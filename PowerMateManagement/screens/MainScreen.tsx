import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { ESP32Controller } from '../components/ESP32Controller';
import { ESP32Service } from '../services/ESP32Service';
import { validateIP } from '../config/constants';

const MainScreen: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [manualIP, setManualIP] = useState('');
  const [currentIP, setCurrentIP] = useState<string | null>(null);

  const esp32Service = ESP32Service.getInstance();

  useEffect(() => {
    checkInitialConnection();
  }, []);

  const checkInitialConnection = async () => {
    setIsConnecting(true);
    const isConnected = await esp32Service.testConnection();
    setConnected(isConnected);
    
    if (isConnected) {
      setCurrentIP(esp32Service.getCurrentDeviceIP());
    }
    setIsConnecting(false);
  };

  const handleManualConnect = async () => {
    if (!manualIP.trim()) {
      Alert.alert('Error', 'Please enter an IP address');
      return;
    }

    if (!validateIP(manualIP)) {
      Alert.alert('Error', 'Please enter a valid IP address (e.g., 192.168.1.100)');
      return;
    }

    setIsConnecting(true);
    try {
      const success = await esp32Service.setDeviceIP(manualIP);
      if (success) {
        setConnected(true);
        setCurrentIP(manualIP);
        Alert.alert('Success', `Connected to ESP32 at ${manualIP}`);
      } else {
        Alert.alert('Connection Failed', `Unable to connect to ESP32 at ${manualIP}. Please check the IP address and ensure the device is powered on.`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to device');
    }
    setIsConnecting(false);
  };

  const handleDisconnect = () => {
    esp32Service.stopPolling();
    setConnected(false);
    setCurrentIP(null);
  };

  if (connected) {
    return (
      <View style={styles.container}>
        <View style={styles.connectionHeader}>
          <Text style={styles.connectionText}>
            Connected to: {currentIP}
          </Text>
          <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
        <ESP32Controller />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>PowerMate</Text>
        <Text style={styles.title}>ESP32 Connection</Text>
        <Text style={styles.subtitle}>Connect to your PowerMate device</Text>
      </View>

      <View style={styles.connectionSection}>
        <Text style={styles.sectionTitle}>Device Connection</Text>
        <Text style={styles.description}>
          Enter your ESP32's IP address to connect to your PowerMate device.
        </Text>

        <View style={styles.manualSection}>
          <Text style={styles.inputLabel}>ESP32 IP Address:</Text>
          <TextInput
            style={styles.ipInput}
            value={manualIP}
            onChangeText={setManualIP}
            placeholder="192.168.1.100"
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.connectButton, isConnecting && styles.disabledButton]}
              onPress={handleManualConnect}
              disabled={isConnecting}
            >
              <Text style={styles.buttonText}>
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.apButton, isConnecting && styles.disabledButton]}
              onPress={() => {
                setManualIP('192.168.4.1');
                setTimeout(() => handleManualConnect(), 100);
              }}
              disabled={isConnecting}
            >
              <Text style={styles.buttonText}>AP Mode</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Connection Options:</Text>
          <Text style={styles.helpText}>• <Text style={styles.boldText}>Same Network:</Text> Connect both devices to the same WiFi</Text>
          <Text style={styles.helpText}>• <Text style={styles.boldText}>ESP32 Hotspot:</Text> Connect your phone to ESP32's WiFi (PowerMate_AP)</Text>
          <Text style={styles.helpText}>• <Text style={styles.boldText}>Direct IP:</Text> Use ESP32 IP: 192.168.4.1 (AP mode)</Text>
          
          <Text style={[styles.helpTitle, { marginTop: 16 }]}>Network Setup:</Text>
          <Text style={styles.helpText}>• Make sure your ESP32 is powered on</Text>
          <Text style={styles.helpText}>• For AP mode: Connect to "PowerMate_AP" WiFi network</Text>
          <Text style={styles.helpText}>• For same network: Ensure both devices are on same WiFi</Text>
          <Text style={styles.helpText}>• Check your ESP32's IP address on its display or serial monitor</Text>
          <Text style={styles.helpText}>• Common IP ranges: 192.168.1.x, 192.168.0.x, 10.0.0.x</Text>
          <Text style={styles.helpText}>• AP mode IP: 192.168.4.1</Text>
        </View>

        <View style={styles.remoteSection}>
          <Text style={styles.remoteSectionTitle}>🌐 Remote Access Options</Text>
          <Text style={styles.remoteText}>
            <Text style={styles.boldText}>For different networks, you need:</Text>
          </Text>
          <Text style={styles.remoteText}>• Port forwarding on your router</Text>
          <Text style={styles.remoteText}>• VPN connection to your home network</Text>
          <Text style={styles.remoteText}>• Cloud service (requires ESP32 modification)</Text>
          <Text style={styles.remoteText}>• Or use ESP32 AP mode (hotspot)</Text>
          
          <View style={styles.apModeBox}>
            <Text style={styles.apModeTitle}>📶 ESP32 Hotspot Mode (Easiest)</Text>
            <Text style={styles.apModeText}>1. Power on your ESP32</Text>
            <Text style={styles.apModeText}>2. Look for "PowerMate_AP" WiFi network</Text>
            <Text style={styles.apModeText}>3. Connect your phone to this network</Text>
            <Text style={styles.apModeText}>4. Use IP: 192.168.4.1</Text>
            <Text style={styles.apModeText}>5. Tap "AP Mode" button above</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  connectionHeader: {
    backgroundColor: '#4CAF50',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  disconnectButton: {
    backgroundColor: '#F44336',
    padding: 8,
    borderRadius: 4,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    margin: 16,
    borderRadius: 12,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  connectionSection: {
    margin: 16,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 2,
  },
  apButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manualSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2c3e50',
  },
  ipInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  helpSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2c3e50',
  },
  helpText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  remoteSection: {
    backgroundColor: '#e8f4fd',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  remoteSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  remoteText: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 4,
    lineHeight: 18,
  },
  apModeBox: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  apModeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 8,
  },
  apModeText: {
    fontSize: 13,
    color: '#F57C00',
    marginBottom: 3,
    lineHeight: 16,
  },
});

export default MainScreen;

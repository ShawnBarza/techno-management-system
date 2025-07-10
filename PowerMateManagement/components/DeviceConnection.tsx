import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import RelayService from '../services/RelayService';
import { validateIP } from '../config/constants';

interface DeviceConnectionProps {
  onConnectionChange: (connected: boolean) => void;
}

const DeviceConnection: React.FC<DeviceConnectionProps> = ({ onConnectionChange }) => {
  const [connected, setConnected] = useState(false);
  const [deviceHost, setDeviceHost] = useState<string | null>(null);
  const [ipAddress, setIpAddress] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Subscribe to connection changes
    RelayService.onConnectionChange((isConnected) => {
      setConnected(isConnected);
      setDeviceHost(RelayService.deviceHost);
      onConnectionChange(isConnected);
    });
  }, []);

  const connectToDevice = async () => {
    if (!ipAddress.trim()) {
      Alert.alert('Invalid IP', 'Please enter an IP address');
      return;
    }

    if (!validateIP(ipAddress.trim())) {
      Alert.alert('Invalid IP', 'Please enter a valid IP address (e.g., 192.168.1.100)');
      return;
    }

    setConnecting(true);
    console.log(`Attempting to connect to IP: ${ipAddress.trim()}`);
    
    try {
      const success = await RelayService.connectToDevice(ipAddress.trim());
      if (success) {
        setDeviceHost(ipAddress.trim());
        setConnected(true);
        Alert.alert('Success', 'Connected to PowerMate device successfully!');
      } else {
        Alert.alert(
          'Connection Failed', 
          `Could not connect to ${ipAddress.trim()}. Please check:\n\n` +
          '• IP address is correct\n' +
          '• Device is powered on\n' +
          '• Device is connected to WiFi\n' +
          '• You are on the same network\n' +
          '• No firewall blocking the connection\n\n' +
          'Try accessing http://' + ipAddress.trim() + ' in your browser to test.'
        );
      }
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Connection Error', `Failed to connect: ${error}`);
    } finally {
      setConnecting(false);
    }
  };

  const testConnection = async () => {
    if (!ipAddress.trim()) {
      Alert.alert('Invalid IP', 'Please enter an IP address');
      return;
    }

    if (!validateIP(ipAddress.trim())) {
      Alert.alert('Invalid IP', 'Please enter a valid IP address');
      return;
    }

    Alert.alert(
      'Test Connection',
      `Testing connection to ${ipAddress.trim()}...\n\n` +
      'Please check your device console/logs for detailed connection information.',
      [
        {
          text: 'OK',
          onPress: () => connectToDevice()
        }
      ]
    );
  };

  const disconnectDevice = () => {
    RelayService.disconnect();
    setConnected(false);
    setDeviceHost(null);
    Alert.alert('Disconnected', 'Disconnected from PowerMate device');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Device Connection</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={[styles.statusText, connected ? styles.connected : styles.disconnected]}>
          {connected ? `Connected to ${deviceHost}` : 'Disconnected'}
        </Text>
      </View>

      {!connected ? (
        <View style={styles.connectionContainer}>
          <Text style={styles.label}>ESP32 IP Address:</Text>
          <TextInput
            style={styles.input}
            value={ipAddress}
            onChangeText={setIpAddress}
            placeholder="192.168.1.100"
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.helpText}>
            Enter the IP address of your PowerMate device. You can find this in the Arduino serial monitor when the device starts up.
          </Text>
          <TouchableOpacity 
            style={[styles.button, connecting && styles.buttonDisabled]}
            onPress={testConnection}
            disabled={connecting}
          >
            <Text style={styles.buttonText}>
              {connecting ? 'Connecting...' : 'Connect'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.connectedContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.disconnectButton]}
            onPress={disconnectDevice}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  connected: {
    color: '#4CAF50',
  },
  disconnected: {
    color: '#f44336',
  },
  connectionContainer: {
    marginTop: 8,
  },
  connectedContainer: {
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    textAlign: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 16,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  disconnectButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DeviceConnection;

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, Image } from 'react-native';
import { ESP32Service } from '../services/ESP32Service';

interface Props {
  onConnectionEstablished: () => void;
}

export const ConnectionSelectionScreen: React.FC<Props> = ({ onConnectionEstablished }) => {
  const [manualIP, setManualIP] = React.useState('');
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [discoveredDevices, setDiscoveredDevices] = React.useState<string[]>([]);
  const [scanning, setScanning] = React.useState(false);
  const esp32Service = ESP32Service.getInstance();

  const handleAutoConnect = async () => {
    setScanning(true);
    setDiscoveredDevices([]);
    try {
      const devices = await esp32Service.discoverDevices();
      setDiscoveredDevices(devices);
      if (devices.length === 0) {
        Alert.alert('No Devices Found', 'Could not find any PowerMate devices automatically.');
      }
    } finally {
      setScanning(false);
    }
  };

  const handleDeviceSelect = async (ip: string) => {
    setIsConnecting(true);
    try {
      const success = await esp32Service.setDeviceIP(ip);
      if (success) {
        onConnectionEstablished();
      } else {
        Alert.alert('Connection Failed', 'Could not connect to the selected device');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualConnect = async () => {
    if (!manualIP.trim()) {
      Alert.alert('Error', 'Please enter an IP address');
      return;
    }

    setIsConnecting(true);
    try {
      const success = await esp32Service.setDeviceIP(manualIP);
      if (success) {
        onConnectionEstablished();
      } else {
        Alert.alert('Connection Failed', 'Could not connect to the specified IP address');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Connect to a PowerMate Device</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🔍 Auto Discovery</Text>
        <Text style={styles.description}>
          Let PowerMate find your devices on the network
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleAutoConnect}
          disabled={scanning}
        >
          <Text style={styles.buttonText}>
            {scanning ? 'Searching...' : 'Scan for Devices'}
          </Text>
        </TouchableOpacity>

        {discoveredDevices.length > 0 && (
          <View style={styles.deviceList}>
            <Text style={styles.subtitle}>Found Devices:</Text>
            {discoveredDevices.map((ip) => (
              <TouchableOpacity
                key={ip}
                style={styles.deviceItem}
                onPress={() => handleDeviceSelect(ip)}
                disabled={isConnecting}
              >
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>PowerMate Device</Text>
                  <Text style={styles.deviceIP}>{ip}</Text>
                </View>
                <View style={styles.connectButton}>
                  <Text style={styles.connectText}>Connect</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>⚙️ Manual Connection</Text>
        <Text style={styles.description}>
          Connect using your device's IP address
        </Text>
        <TextInput
          style={styles.input}
          value={manualIP}
          onChangeText={setManualIP}
          placeholder="Enter IP address (e.g., 192.168.1.100)"
          keyboardType="numeric"
          editable={!isConnecting}
        />
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleManualConnect}
          disabled={isConnecting}
        >
          <Text style={styles.buttonText}>Connect Manually</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.helpText}>
        💡 Tip: You can find your device's IP address on its display or through your router's admin panel
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    color: '#4CAF50', // Keep green
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: 'bold', // Keep bold
  },
  subtitle: {
    fontSize: 16,
    color: '#666', // Change back to gray
    textAlign: 'center',
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333', // Change back to dark gray
  },
  description: {
    color: '#666', // Change back to gray
    marginBottom: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  helpText: {
    color: '#666', // Change back to gray
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  deviceList: {
    marginTop: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50', // Change back to original color
    marginBottom: 4,
  },
  deviceIP: {
    fontSize: 14,
    color: '#7f8c8d', // Change back to original color
  },
  connectButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  connectText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

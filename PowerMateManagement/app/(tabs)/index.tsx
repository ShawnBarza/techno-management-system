import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { subscribeToDevice, toggleDevice, DeviceStatus } from '../utils/arduino';

export default function Home() {
  const [power1Status, setPower1Status] = useState(false);
  const [power2Status, setPower2Status] = useState(false);
  const [ipAddress, setIpAddress] = useState('Loading...');

  useEffect(() => {
    async function getNetworkInfo() {
      const ip = await Network.getIpAddressAsync();
      setIpAddress(ip);
    }
    getNetworkInfo();
  }, []);

  useEffect(() => {
    const unsubscribe1 = subscribeToDevice('device1', (status) => {
      setPower1Status(status === DeviceStatus.ON);
    });

    const unsubscribe2 = subscribeToDevice('device2', (status) => {
      setPower2Status(status === DeviceStatus.ON);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, []);

  const handleToggle = async (device: string, status: boolean) => {
    try {
      await toggleDevice(device, status ? DeviceStatus.ON : DeviceStatus.OFF);
    } catch (error) {
      console.error(`Error toggling ${device}:`, error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PowerMate Management</Text>
      
      <View style={styles.networkInfo}>
        <Ionicons name="wifi" size={20} color="#666" />
        <Text style={styles.ipText}>IP: {ipAddress}</Text>
      </View>
      
      <View style={styles.powerContainer}>
        <Text style={styles.deviceLabel}>Device 1</Text>
        <View style={styles.controlRow}>
          <TouchableOpacity 
            style={[styles.button, power1Status && styles.buttonActive]} 
            onPress={() => handleToggle('device1', true)}
          >
            <Text style={[styles.buttonText, power1Status && styles.buttonTextActive]}>ON</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, !power1Status && styles.buttonActive]} 
            onPress={() => handleToggle('device1', false)}
          >
            <Text style={[styles.buttonText, !power1Status && styles.buttonTextActive]}>OFF</Text>
          </TouchableOpacity>
          <View style={styles.indicatorContainer}>
            <Ionicons 
              name="power" 
              size={24} 
              color={power1Status ? '#4CAF50' : '#FF5252'} 
            />
          </View>
        </View>
      </View>

      <View style={styles.powerContainer}>
        <Text style={styles.deviceLabel}>Device 2</Text>
        <View style={styles.controlRow}>
          <TouchableOpacity 
            style={[styles.button, power2Status && styles.buttonActive]} 
            onPress={() => handleToggle('device2', true)}
          >
            <Text style={[styles.buttonText, power2Status && styles.buttonTextActive]}>ON</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, !power2Status && styles.buttonActive]} 
            onPress={() => handleToggle('device2', false)}
          >
            <Text style={[styles.buttonText, !power2Status && styles.buttonTextActive]}>OFF</Text>
          </TouchableOpacity>
          <View style={styles.indicatorContainer}>
            <Ionicons 
              name="power" 
              size={24} 
              color={power2Status ? '#4CAF50' : '#FF5252'} 
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#333',
  },
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  ipText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  powerContainer: {
    width: '90%',
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    backgroundColor: '#f1f3f5',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#339af0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  buttonTextActive: {
    color: '#fff',
  },
  indicatorContainer: {
    marginLeft: 16,
    width: 24,
    alignItems: 'center',
  },
});

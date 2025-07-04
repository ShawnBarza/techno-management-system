import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { ESP32Service } from '../services/ESP32Service';
import { ESP32Status } from '../types/esp32';

export const ESP32Controller: React.FC = () => {
  const [status, setStatus] = useState<ESP32Status | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [relay1Timer, setRelay1Timer] = useState({ on: '', off: '' });
  const [relay2Timer, setRelay2Timer] = useState({ on: '', off: '' });

  const esp32Service = ESP32Service.getInstance();

  useEffect(() => {
    const handleStatusUpdate = (newStatus: ESP32Status) => {
      setStatus(newStatus);
      setIsConnected(true);
      
      // Update timer inputs with current values
      setRelay1Timer({
        on: formatTime(newStatus.r1_on),
        off: formatTime(newStatus.r1_off)
      });
      setRelay2Timer({
        on: formatTime(newStatus.r2_on),
        off: formatTime(newStatus.r2_off)
      });
    };

    esp32Service.onStatusUpdate(handleStatusUpdate);
    
    // Test connection and start polling
    testConnection();

    return () => {
      esp32Service.removeStatusCallback(handleStatusUpdate);
      esp32Service.stopPolling();
    };
  }, []);

  const testConnection = async () => {
    setIsLoading(true);
    const connected = await esp32Service.testConnection();
    setIsConnected(connected);
    
    if (connected) {
      await esp32Service.getStatus();
      esp32Service.startPolling();
    }
    setIsLoading(false);
  };

  const handleRelayToggle = async (relay: number, currentState: boolean) => {
    const success = await esp32Service.setRelay(relay, !currentState);
    if (success) {
      // Status will be updated through polling
      setTimeout(() => esp32Service.getStatus(), 500);
    } else {
      Alert.alert('Error', 'Failed to toggle relay');
    }
  };

  const handleTimerUpdate = async (relay: number, onTime: string, offTime: string) => {
    const onTimeNum = parseTime(onTime);
    const offTimeNum = parseTime(offTime);
    
    if (onTimeNum !== null && offTimeNum !== null) {
      const success = await esp32Service.setTimer(relay, onTimeNum, offTimeNum);
      if (success) {
        setTimeout(() => esp32Service.getStatus(), 500);
        Alert.alert('Success', 'Timer updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update timer');
      }
    }
  };

  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 100);
    const minutes = time % 100;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const parseTime = (time: string): number | null => {
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours * 100 + minutes;
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Connecting to ESP32...</Text>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>ESP32 Not Connected</Text>
        <TouchableOpacity style={styles.retryButton} onPress={testConnection}>
          <Text style={styles.buttonText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>ESP32 Relay Controller</Text>
      
      {status && (
        <View style={styles.statusContainer}>
          <Text style={styles.subtitle}>Current Status</Text>
          <Text style={styles.timeText}>Current Time: {formatTime(status.time)}</Text>
          
          <View style={styles.relayControls}>
            {/* Relay 1 */}
            <View style={styles.relayControl}>
              <Text style={styles.relayTitle}>Relay 1 (Pin 17)</Text>
              <View style={styles.relayStatus}>
                <Text style={styles.statusText}>
                  Status: <Text style={[styles.statusValue, { color: status.r1 ? '#4CAF50' : '#F44336' }]}>
                    {status.r1 ? 'ON' : 'OFF'}
                  </Text>
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.toggleButton, { backgroundColor: status.r1 ? '#F44336' : '#4CAF50' }]}
                onPress={() => handleRelayToggle(1, !!status.r1)}
              >
                <Text style={styles.buttonText}>Turn {status.r1 ? 'OFF' : 'ON'}</Text>
              </TouchableOpacity>
              
              <View style={styles.timerSettings}>
                <Text style={styles.timerTitle}>Timer Schedule</Text>
                <View style={styles.timerInputs}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>On Time:</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={relay1Timer.on}
                      onChangeText={(text) => setRelay1Timer({ ...relay1Timer, on: text })}
                      placeholder="HH:MM"
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Off Time:</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={relay1Timer.off}
                      onChangeText={(text) => setRelay1Timer({ ...relay1Timer, off: text })}
                      placeholder="HH:MM"
                    />
                  </View>
                  <TouchableOpacity 
                    style={styles.updateButton}
                    onPress={() => handleTimerUpdate(1, relay1Timer.on, relay1Timer.off)}
                  >
                    <Text style={styles.buttonText}>Update Timer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Relay 2 */}
            <View style={styles.relayControl}>
              <Text style={styles.relayTitle}>Relay 2 (Pin 18)</Text>
              <View style={styles.relayStatus}>
                <Text style={styles.statusText}>
                  Status: <Text style={[styles.statusValue, { color: status.r2 ? '#4CAF50' : '#F44336' }]}>
                    {status.r2 ? 'ON' : 'OFF'}
                  </Text>
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.toggleButton, { backgroundColor: status.r2 ? '#F44336' : '#4CAF50' }]}
                onPress={() => handleRelayToggle(2, !!status.r2)}
              >
                <Text style={styles.buttonText}>Turn {status.r2 ? 'OFF' : 'ON'}</Text>
              </TouchableOpacity>
              
              <View style={styles.timerSettings}>
                <Text style={styles.timerTitle}>Timer Schedule</Text>
                <View style={styles.timerInputs}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>On Time:</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={relay2Timer.on}
                      onChangeText={(text) => setRelay2Timer({ ...relay2Timer, on: text })}
                      placeholder="HH:MM"
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Off Time:</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={relay2Timer.off}
                      onChangeText={(text) => setRelay2Timer({ ...relay2Timer, off: text })}
                      placeholder="HH:MM"
                    />
                  </View>
                  <TouchableOpacity 
                    style={styles.updateButton}
                    onPress={() => handleTimerUpdate(2, relay2Timer.on, relay2Timer.off)}
                  >
                    <Text style={styles.buttonText}>Update Timer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
  },
  timeText: {
    fontSize: 16,
    marginBottom: 20,
  },
  statusContainer: {
    flex: 1,
  },
  relayControls: {
    gap: 20,
  },
  relayControl: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  relayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  relayStatus: {
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
  },
  statusValue: {
    fontWeight: 'bold',
  },
  toggleButton: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  updateButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timerSettings: {
    marginTop: 16,
  },
  timerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  timerInputs: {
    gap: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    width: 80,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    backgroundColor: 'white',
  },
});

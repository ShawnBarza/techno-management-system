import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import RelayService, { RelayStatus } from '../services/RelayService';

interface RelayControlProps {
  relayNumber: number;
  connected: boolean;
}

const RelayControl: React.FC<RelayControlProps> = ({ relayNumber, connected }) => {
  const [relayState, setRelayState] = useState(false);
  const [isOverride, setIsOverride] = useState(false);
  const [onTime, setOnTime] = useState(-1);
  const [offTime, setOffTime] = useState(-1);

  useEffect(() => {
    // Subscribe to status updates
    RelayService.onStatusUpdate((status: RelayStatus) => {
      if (relayNumber === 1) {
        setRelayState(status.r1);
        setIsOverride(status.r1_override);
        setOnTime(status.r1_on);
        setOffTime(status.r1_off);
      } else {
        setRelayState(status.r2);
        setIsOverride(status.r2_override);
        setOnTime(status.r2_on);
        setOffTime(status.r2_off);
      }
    });

    // Get initial status
    if (connected) {
      RelayService.getStatus();
    }
  }, [relayNumber, connected]);

  const toggleRelay = async (override: boolean = false) => {
    if (!connected) {
      Alert.alert('Not Connected', 'Please connect to device first');
      return;
    }

    const success = await RelayService.setRelay(relayNumber, !relayState, override);
    if (!success) {
      Alert.alert('Error', 'Failed to toggle relay');
    }
  };

  const clearOverride = async () => {
    if (!connected) {
      Alert.alert('Not Connected', 'Please connect to device first');
      return;
    }

    const success = await RelayService.clearOverride(relayNumber);
    if (success) {
      Alert.alert('Success', 'Manual override cleared');
    } else {
      Alert.alert('Error', 'Failed to clear override');
    }
  };

  const formatTime = (hhmm: number): string => {
    if (hhmm === -1) return 'Not set';
    return RelayService.HHMMToTime12Hour(hhmm);
  };

  return (
    <View style={[styles.container, isOverride && styles.overrideContainer]}>
      <Text style={styles.title}>Socket # {relayNumber}</Text>
      
      <View style={styles.statusContainer}>
        <Text style={[styles.statusText, relayState ? styles.on : styles.off]}>
          {relayState ? 'ON' : 'OFF'}
        </Text>
        {isOverride && (
          <Text style={styles.overrideText}>MANUAL OVERRIDE</Text>
        )}
      </View>

      <View style={styles.scheduleContainer}>
        <Text style={styles.scheduleLabel}>Schedule:</Text>
        <Text style={styles.scheduleText}>
          Start: {formatTime(onTime)}
        </Text>
        <Text style={styles.scheduleText}>
          Stop: {formatTime(offTime)}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.toggleButton]}
          onPress={() => toggleRelay(false)}
          disabled={!connected}
        >
          <Text style={styles.buttonText}>Toggle</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.overrideButton]}
          onPress={() => toggleRelay(true)}
          disabled={!connected}
        >
          <Text style={styles.buttonText}>Override</Text>
        </TouchableOpacity>

        {isOverride && (
          <TouchableOpacity 
            style={[styles.button, styles.clearButton]}
            onPress={clearOverride}
            disabled={!connected}
          >
            <Text style={styles.buttonText}>Clear Override</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  overrideContainer: {
    borderColor: '#ff9800',
    backgroundColor: '#fff3e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 8,
    borderRadius: 6,
  },
  on: {
    color: '#4CAF50',
    backgroundColor: '#e8f5e8',
  },
  off: {
    color: '#f44336',
    backgroundColor: '#ffeaea',
  },
  overrideText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff9800',
    textAlign: 'center',
    marginTop: 4,
  },
  scheduleContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  scheduleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scheduleText: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  button: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 80,
    marginVertical: 4,
  },
  toggleButton: {
    backgroundColor: '#2196F3',
  },
  overrideButton: {
    backgroundColor: '#ff9800',
  },
  clearButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default RelayControl;

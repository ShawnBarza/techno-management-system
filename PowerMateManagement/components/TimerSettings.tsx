import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import RelayService, { TimerSchedule, RelayStatus } from '../services/RelayService';

interface TimerSettingsProps {
  relayNumber: number;
  connected: boolean;
}

const TimerSettings: React.FC<TimerSettingsProps> = ({ relayNumber, connected }) => {
  const [startTime, setStartTime] = useState('08:00');
  const [stopTime, setStopTime] = useState('06:00');
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('AM');
  const [stopPeriod, setStopPeriod] = useState<'AM' | 'PM'>('PM');
  const [currentSchedule, setCurrentSchedule] = useState<{ on: number; off: number } | null>(null);

  useEffect(() => {
    // Subscribe to status updates to get current timer settings
    RelayService.onStatusUpdate((status: RelayStatus) => {
      if (relayNumber === 1) {
        setCurrentSchedule({ on: status.r1_on, off: status.r1_off });
      } else {
        setCurrentSchedule({ on: status.r2_on, off: status.r2_off });
      }
    });
  }, [relayNumber]);

  const validateTime12Hour = (time: string): boolean => {
    const timeRegex = /^(1[0-2]|0?[1-9]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const HHMMToTime12Hour = (hhmm: number): { time: string; period: 'AM' | 'PM' } => {
    if (hhmm === -1) return { time: 'Not set', period: 'AM' };
    const hours = Math.floor(hhmm / 100);
    const minutes = hhmm % 100;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return {
      time: `${displayHours}:${minutes.toString().padStart(2, '0')}`,
      period
    };
  };

  const setTimer = async () => {
    if (!connected) {
      Alert.alert('Not Connected', 'Please connect to device first');
      return;
    }

    if (!validateTime12Hour(startTime)) {
      Alert.alert('Invalid Start Time', 'Please enter a valid start time (H:MM or HH:MM format)');
      return;
    }

    if (!validateTime12Hour(stopTime)) {
      Alert.alert('Invalid Stop Time', 'Please enter a valid stop time (H:MM or HH:MM format)');
      return;
    }

    const schedule: TimerSchedule = {
      relay: relayNumber,
      onTime: RelayService.time12HourToHHMM(startTime, startPeriod),
      offTime: RelayService.time12HourToHHMM(stopTime, stopPeriod)
    };

    // Show confirmation with timezone info
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    Alert.alert(
      'Confirm Timer Settings',
      `Setting timer for Relay ${relayNumber}:\n\n` +
      `Start: ${startTime} ${startPeriod}\n` +
      `Stop: ${stopTime} ${stopPeriod}\n\n` +
      `Current system time: ${now.toLocaleTimeString([], { hour12: true })}\n` +
      `Timezone: ${timezone}\n\n` +
      `Note: The ESP32 uses its own timezone (UTC+8 in the Arduino code). ` +
      `Make sure your times account for any timezone differences.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Set Timer',
          onPress: async () => {
            const success = await RelayService.setTimer(schedule);
            if (success) {
              Alert.alert('Success', `Timer set for Relay ${relayNumber}\nStart: ${startTime} ${startPeriod}\nStop: ${stopTime} ${stopPeriod}`);
            } else {
              Alert.alert('Error', 'Failed to set timer');
            }
          }
        }
      ]
    );
  };

  const formatTimeInput = (value: string): string => {
    // Remove any non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as H:MM or HH:MM
    if (digits.length >= 3) {
      const hours = digits.slice(0, digits.length - 2);
      const minutes = digits.slice(-2);
      return `${hours}:${minutes}`;
    } else if (digits.length >= 1) {
      return digits;
    }
    return '';
  };

  const handleTimeChange = (value: string, isStartTime: boolean) => {
    const formatted = formatTimeInput(value);
    if (isStartTime) {
      setStartTime(formatted);
    } else {
      setStopTime(formatted);
    }
  };

  const loadCurrentSchedule = () => {
    if (currentSchedule) {
      if (currentSchedule.on !== -1) {
        const startInfo = HHMMToTime12Hour(currentSchedule.on);
        setStartTime(startInfo.time);
        setStartPeriod(startInfo.period);
      }
      if (currentSchedule.off !== -1) {
        const stopInfo = HHMMToTime12Hour(currentSchedule.off);
        setStopTime(stopInfo.time);
        setStopPeriod(stopInfo.period);
      }
    }
  };

  const generateHourOptions = () => {
    const hours = [];
    for (let i = 1; i <= 12; i++) {
      hours.push(
        <Picker.Item key={i} label={i.toString()} value={i.toString()} />
      );
    }
    return hours;
  };

  const generateMinuteOptions = () => {
    const minutes = [];
    for (let i = 0; i < 60; i += 5) {
      const minute = i.toString().padStart(2, '0');
      minutes.push(
        <Picker.Item key={i} label={minute} value={minute} />
      );
    }
    return minutes;
  };

  const setQuickTime = (hour: number, minute: number, period: 'AM' | 'PM', isStartTime: boolean) => {
    const timeStr = `${hour}:${minute.toString().padStart(2, '0')}`;
    if (isStartTime) {
      setStartTime(timeStr);
      setStartPeriod(period);
    } else {
      setStopTime(timeStr);
      setStopPeriod(period);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Timer Settings - Relay {relayNumber}</Text>
      
      {currentSchedule && (
        <View style={styles.currentScheduleContainer}>
          <Text style={styles.currentScheduleLabel}>Current Schedule:</Text>
          <Text style={styles.currentScheduleText}>
            Start: {RelayService.HHMMToTime12Hour(currentSchedule.on) || 'Not set'}
          </Text>
          <Text style={styles.currentScheduleText}>
            Stop: {RelayService.HHMMToTime12Hour(currentSchedule.off) || 'Not set'}
          </Text>
          <TouchableOpacity style={styles.loadButton} onPress={loadCurrentSchedule}>
            <Text style={styles.loadButtonText}>Load Current Schedule</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Time Presets */}
      <View style={styles.quickTimeContainer}>
        <Text style={styles.quickTimeLabel}>Quick Times:</Text>
        <View style={styles.quickTimeButtons}>
          <TouchableOpacity 
            style={styles.quickTimeButton} 
            onPress={() => setQuickTime(6, 0, 'AM', true)}
          >
            <Text style={styles.quickTimeText}>6:00 AM</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickTimeButton} 
            onPress={() => setQuickTime(8, 0, 'AM', true)}
          >
            <Text style={styles.quickTimeText}>8:00 AM</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickTimeButton} 
            onPress={() => setQuickTime(6, 0, 'PM', false)}
          >
            <Text style={styles.quickTimeText}>6:00 PM</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickTimeButton} 
            onPress={() => setQuickTime(10, 0, 'PM', false)}
          >
            <Text style={styles.quickTimeText}>10:00 PM</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Start Time */}
      <View style={styles.timeContainer}>
        <Text style={styles.label}>Start Time:</Text>
        <View style={styles.timeInputContainer}>
          <TextInput
            style={styles.timeInput}
            value={startTime}
            onChangeText={(value) => handleTimeChange(value, true)}
            placeholder="8:00"
            keyboardType="numeric"
            maxLength={5}
          />
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={startPeriod}
              style={styles.picker}
              onValueChange={(value) => setStartPeriod(value)}
            >
              <Picker.Item label="AM" value="AM" />
              <Picker.Item label="PM" value="PM" />
            </Picker>
          </View>
        </View>
      </View>

      {/* Stop Time */}
      <View style={styles.timeContainer}>
        <Text style={styles.label}>Stop Time:</Text>
        <View style={styles.timeInputContainer}>
          <TextInput
            style={styles.timeInput}
            value={stopTime}
            onChangeText={(value) => handleTimeChange(value, false)}
            placeholder="6:00"
            keyboardType="numeric"
            maxLength={5}
          />
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={stopPeriod}
              style={styles.picker}
              onValueChange={(value) => setStopPeriod(value)}
            >
              <Picker.Item label="AM" value="AM" />
              <Picker.Item label="PM" value="PM" />
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.helpContainer}>
        <Text style={styles.helpText}>
          Enter times in 12-hour format (H:MM or HH:MM)
        </Text>
        <Text style={styles.helpText}>
          Examples: 8:00 AM, 1:30 PM, 11:45 PM
        </Text>
        <Text style={styles.helpText}>
          Note: ESP32 uses UTC+8 timezone
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.setButton, !connected && styles.disabledButton]}
        onPress={setTimer}
        disabled={!connected}
      >
        <Text style={styles.buttonText}>Set Timer</Text>
      </TouchableOpacity>
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    textAlign: 'center',
    minWidth: 80,
    marginRight: 8,
  },
  pickerContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 80,
  },
  picker: {
    height: 50,
  },
  helpContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  setButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentScheduleContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  currentScheduleLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  currentScheduleText: {
    fontSize: 14,
    color: '#1976D2',
  },
  loadButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  loadButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickTimeContainer: {
    marginBottom: 16,
  },
  quickTimeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  quickTimeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickTimeButton: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  quickTimeText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: 'bold',
  },
});

export default TimerSettings;

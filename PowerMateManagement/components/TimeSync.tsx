import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

interface TimeSyncProps {
  deviceTime: string;
  connected: boolean;
}

const TimeSync: React.FC<TimeSyncProps> = ({ deviceTime, connected }) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [timeDifference, setTimeDifference] = useState<number>(0);
  const [isSynced, setIsSynced] = useState<boolean>(false);

  useEffect(() => {
    // Update current time every second
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      });
      setCurrentTime(timeStr);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Calculate time difference when device time changes
    if (deviceTime && connected) {
      const now = new Date();
      const deviceTimeObj = parseDeviceTime(deviceTime);
      
      if (deviceTimeObj) {
        const diffMinutes = Math.abs(now.getTime() - deviceTimeObj.getTime()) / (1000 * 60);
        setTimeDifference(diffMinutes);
        setIsSynced(diffMinutes <= 1); // Consider synced if within 1 minute
      }
    }
  }, [deviceTime, connected]);

  const parseDeviceTime = (timeStr: string): Date | null => {
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const now = new Date();
      const deviceTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
      return deviceTime;
    } catch (error) {
      return null;
    }
  };

  const formatDeviceTime12Hour = (timeStr: string): string => {
    if (!timeStr) return 'Not available';
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${minutes.toString().padStart(2, '0')}:00 ${period}`;
    } catch (error) {
      return timeStr;
    }
  };

  const formatTimeDifference = (minutes: number): string => {
    if (minutes < 1) return 'Less than 1 minute';
    if (minutes < 60) return `${Math.round(minutes)} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const showTimeSyncInfo = () => {
    const message = `Time Synchronization Info:\n\n` +
      `System Time: ${currentTime}\n` +
      `Device Time: ${formatDeviceTime12Hour(deviceTime)}\n` +
      `Difference: ${connected ? formatTimeDifference(timeDifference) : 'Device not connected'}\n\n` +
      `Note: The ESP32 uses NTP (Network Time Protocol) to sync with internet time servers. ` +
      `If there's a time difference, check:\n` +
      `• Internet connection on ESP32\n` +
      `• NTP server accessibility\n` +
      `• Timezone setting in Arduino code\n\n` +
      `The ESP32 should automatically sync with NTP servers every hour.`;

    Alert.alert('Time Synchronization', message);
  };

  if (!connected) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Time Synchronization</Text>
        <Text style={styles.notConnectedText}>Connect to device to view time sync status</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Time Synchronization</Text>
      
      <View style={styles.timeContainer}>
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>System Time:</Text>
          <Text style={styles.timeValue}>{currentTime}</Text>
        </View>
        
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Device Time:</Text>
          <Text style={styles.timeValue}>{formatDeviceTime12Hour(deviceTime)}</Text>
        </View>
      </View>

      <View style={[styles.syncStatus, isSynced ? styles.synced : styles.notSynced]}>
        <Text style={[styles.syncText, isSynced ? styles.syncedText : styles.notSyncedText]}>
          {isSynced ? '✓ Time Synchronized' : '⚠ Time Not Synchronized'}
        </Text>
        {!isSynced && deviceTime && (
          <Text style={styles.differenceText}>
            Difference: {formatTimeDifference(timeDifference)}
          </Text>
        )}
      </View>

      <TouchableOpacity style={styles.infoButton} onPress={showTimeSyncInfo}>
        <Text style={styles.infoButtonText}>Time Sync Info</Text>
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
  notConnectedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  timeContainer: {
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timeValue: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#2196F3',
  },
  syncStatus: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    alignItems: 'center',
  },
  synced: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  notSynced: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  syncText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  syncedText: {
    color: '#4CAF50',
  },
  notSyncedText: {
    color: '#ff9800',
  },
  differenceText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  infoButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  infoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default TimeSync;

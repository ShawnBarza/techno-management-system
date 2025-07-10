import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import DeviceConnection from '../components/DeviceConnection';
import TimeSync from '../components/TimeSync';
import RelayControl from '../components/RelayControl';
import TimerSettings from '../components/TimerSettings';
import RelayService, { RelayStatus } from '../services/RelayService';

const MainScreen: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [deviceTime12Hour, setDeviceTime12Hour] = useState<string>('');

  useEffect(() => {
    // Start polling when component mounts
    RelayService.startPolling();

    // Subscribe to status updates to get current time
    RelayService.onStatusUpdate((status: RelayStatus) => {
      const timeHHMM = status.time;
      const hours = Math.floor(timeHHMM / 100);
      const minutes = timeHHMM % 100;
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      setCurrentTime(timeStr);
      
      // Format as 12-hour for display
      const time12Hour = RelayService.formatCurrentTime12Hour(timeHHMM);
      setDeviceTime12Hour(time12Hour);
    });
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>PowerMate Control</Text>
      
      <DeviceConnection onConnectionChange={setConnected} />
      
      <TimeSync deviceTime={currentTime} connected={connected} />
      
      {!connected && (
        <View style={styles.notConnectedContainer}>
          <Text style={styles.notConnectedText}>
            Please connect to your PowerMate device to control relays and timers.
          </Text>
        </View>
      )}
      
      {connected && (
        <>
          {deviceTime12Hour && (
            <View style={styles.timeContainer}>
              <Text style={styles.timeLabel}>Device Time:</Text>
              <Text style={styles.timeText}>{deviceTime12Hour}</Text>
            </View>
          )}

          <RelayControl relayNumber={1} connected={connected} />
          <RelayControl relayNumber={2} connected={connected} />
          
          <TimerSettings relayNumber={1} connected={connected} />
          <TimerSettings relayNumber={2} connected={connected} />
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  notConnectedContainer: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  notConnectedText: {
    fontSize: 16,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
});

export default MainScreen;

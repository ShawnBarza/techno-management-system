import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { ESP32Service } from '../services/ESP32Service';
import { ESP32Status } from '../types/esp32';

export const ESP32Controller: React.FC = () => {
  const [status, setStatus] = useState<ESP32Status | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [relay1Timer, setRelay1Timer] = useState({ on: '', off: '' });
  const [relay2Timer, setRelay2Timer] = useState({ on: '', off: '' });
  
  const [manualMode, setManualMode] = useState({
    r1: false,
    r2: false
  });

  const userIsEditingRef = useRef({
    r1_on: false,
    r1_off: false,
    r2_on: false,
    r2_off: false,
  });

  const [editingVisual, setEditingVisual] = useState({
    r1_on: false,
    r1_off: false,
    r2_on: false,
    r2_off: false,
  });

  const esp32Service = ESP32Service.getInstance();

  const handleStatusUpdate = useCallback((newStatus: ESP32Status) => {
    setStatus(newStatus);
    setIsConnected(true);
    
    setRelay1Timer(prev => ({
      on: userIsEditingRef.current.r1_on ? prev.on : formatTime(newStatus.r1_on),
      off: userIsEditingRef.current.r1_off ? prev.off : formatTime(newStatus.r1_off)
    }));
    
    setRelay2Timer(prev => ({
      on: userIsEditingRef.current.r2_on ? prev.on : formatTime(newStatus.r2_on),
      off: userIsEditingRef.current.r2_off ? prev.off : formatTime(newStatus.r2_off)
    }));
  }, []);

  useEffect(() => {
    esp32Service.onStatusUpdate(handleStatusUpdate);
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

  const manualModeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!status) return;

    if (manualModeTimerRef.current) {
      clearInterval(manualModeTimerRef.current);
    }

    const hasManualModeActive = manualMode.r1 || manualMode.r2;

    if (hasManualModeActive) {
      manualModeTimerRef.current = setInterval(async () => {
        try {
          const currentStatus = await esp32Service.getStatus();
          if (!currentStatus) return;

          for (const [key, isManual] of Object.entries(manualMode)) {
            if (isManual) {
              const relay = key === 'r1' ? 1 : 2;
              const onTime = relay === 1 ? currentStatus.r1_on : currentStatus.r2_on;
              const offTime = relay === 1 ? currentStatus.r1_off : currentStatus.r2_off;

              if (onTime !== offTime) {
                console.log(`Manual mode: Disabling timer for relay ${relay} (${onTime}-${offTime})`);
                await esp32Service.setTimer(relay, 0, 0);
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
        } catch (error) {
          console.error('Manual mode monitoring error:', error);
        }
      }, 10000);
    }

    return () => {
      if (manualModeTimerRef.current) {
        clearInterval(manualModeTimerRef.current);
        manualModeTimerRef.current = null;
      }
    };
  }, [status, manualMode]);

  const manualModeStateRef = useRef<{r1?: boolean, r2?: boolean}>({});
  const lastManualChangeRef = useRef<{[key: number]: number}>({});
  const operationLockRef = useRef<{[key: number]: boolean}>({});

  const forceDisableTimer = async (relay: number) => {
    if (!status) return false;

    try {
      console.log(`Disabling timer for relay ${relay}`);
      const success = await esp32Service.setTimer(relay, 0, 0);
      
      if (success) {
        console.log(`Timer disabled for relay ${relay}`);
        return true;
      } else {
        console.warn(`Failed to disable timer for relay ${relay}`);
        return false;
      }
    } catch (error) {
      console.error(`Error disabling timer for relay ${relay}:`, error);
      return false;
    }
  };

  const handleRelayToggle = async (relay: number, currentState: boolean) => {
    const isInManualMode = relay === 1 ? manualMode.r1 : manualMode.r2;
    
    if (isInManualMode) {
      if (operationLockRef.current[relay]) {
        Alert.alert('Please Wait', `Relay ${relay} operation in progress...`);
        return;
      }

      operationLockRef.current[relay] = true;

      try {
        const newState = !currentState;
        lastManualChangeRef.current[relay] = Date.now();
        
        console.log(`Manual control: Setting relay ${relay} to ${newState ? 'ON' : 'OFF'}`);
        
        const success = await esp32Service.setRelay(relay, newState, true);
        
        if (success) {
          if (relay === 1) {
            manualModeStateRef.current.r1 = newState;
          } else {
            manualModeStateRef.current.r2 = newState;
          }
          
          console.log(`Manual control: Relay ${relay} set to ${newState ? 'ON' : 'OFF'}`);
          
          setTimeout(() => esp32Service.getStatus(), 1000);
          
          Alert.alert(
            'Manual Control',
            `Relay ${relay} turned ${newState ? 'ON' : 'OFF'}`
          );
        } else {
          Alert.alert('Error', `Failed to control Relay ${relay}.`);
        }
      } finally {
        setTimeout(() => {
          operationLockRef.current[relay] = false;
        }, 2000);
      }
    } else {
      Alert.alert(
        'Control Options',
        `Choose how to control Relay ${relay}:`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Quick Toggle (Timer Active)',
            onPress: () => quickToggle(relay, !currentState)
          },
          {
            text: 'Switch to Manual Mode',
            onPress: () => enableManualMode(relay)
          }
        ]
      );
    }
  };

  const enableManualMode = async (relay: number) => {
    if (!status) {
      Alert.alert('Error', 'Cannot enable manual mode: No status available');
      return;
    }

    if (operationLockRef.current[relay]) {
      Alert.alert('Please Wait', `Relay ${relay} operation in progress...`);
      return;
    }

    operationLockRef.current[relay] = true;

    try {
      const currentState = relay === 1 ? !!status.r1 : !!status.r2;
      
      console.log(`Enabling manual mode for relay ${relay}, current state: ${currentState ? 'ON' : 'OFF'}`);

      if (relay === 1) {
        manualModeStateRef.current.r1 = currentState;
      } else {
        manualModeStateRef.current.r2 = currentState;
      }

      lastManualChangeRef.current[relay] = Date.now();

      setManualMode(prev => ({
        ...prev,
        [relay === 1 ? 'r1' : 'r2']: true
      }));

      const timerDisabled = await forceDisableTimer(relay);
      
      setTimeout(() => esp32Service.getStatus(), 1000);
      
      Alert.alert(
        'Manual Mode Enabled',
        `Relay ${relay} is now in manual mode.\n\n✅ Current state: ${currentState ? 'ON' : 'OFF'}\n🔧 Use Control button for manual on/off\n\n${timerDisabled ? '✅ Timer disabled' : '⚠️ Timer disable may have failed'}`
      );
    } finally {
      setTimeout(() => {
        operationLockRef.current[relay] = false;
      }, 2000);
    }
  };

  const quickToggle = async (relay: number, state: boolean) => {
    if (operationLockRef.current[relay]) {
      Alert.alert('Please Wait', `Relay ${relay} operation in progress...`);
      return;
    }

    operationLockRef.current[relay] = true;

    try {
      lastManualChangeRef.current[relay] = Date.now();
      
      const success = await esp32Service.setRelay(relay, state);
      if (success) {
        setTimeout(() => esp32Service.getStatus(), 500);
        Alert.alert(
          'Quick Toggle',
          `Relay ${relay} turned ${state ? 'ON' : 'OFF'}.\n\n⚠️ Timer is still active and may override this.`
        );
      } else {
        Alert.alert('Error', `Failed to toggle Relay ${relay}.`);
      }
    } finally {
      setTimeout(() => {
        operationLockRef.current[relay] = false;
      }, 1000);
    }
  };

  const enableTimerMode = async (relay: number) => {
    if (relay === 1) {
      delete manualModeStateRef.current.r1;
    } else {
      delete manualModeStateRef.current.r2;
    }
    delete lastManualChangeRef.current[relay];
    operationLockRef.current[relay] = false;

    setManualMode(prev => ({
      ...prev,
      [relay === 1 ? 'r1' : 'r2']: false
    }));
    
    Alert.alert(
      'Timer Mode Enabled',
      `Relay ${relay} will now be controlled by timer.\n\n⏰ Set your schedule in the Timer Settings below.`
    );
  };

  useEffect(() => {
    return () => {
      if (manualModeTimerRef.current) {
        clearInterval(manualModeTimerRef.current);
      }
    };
  }, []);

  const handleTimerUpdate = async (relay: number, onTime: string, offTime: string) => {
    const isInManualMode = relay === 1 ? manualMode.r1 : manualMode.r2;
    
    if (isInManualMode) {
      Alert.alert(
        'Manual Mode Active',
        `Relay ${relay} is in manual mode. Timer updates are disabled.\n\nSwitch to Timer Mode first to set schedules.`
      );
      return;
    }

    const onTimeNum = parseTime(onTime);
    const offTimeNum = parseTime(offTime);
    
    if (onTimeNum !== null && offTimeNum !== null) {
      const success = await esp32Service.setTimer(relay, onTimeNum, offTimeNum);
      if (success) {
        if (relay === 1) {
          userIsEditingRef.current.r1_on = false;
          userIsEditingRef.current.r1_off = false;
          setEditingVisual(prev => ({ ...prev, r1_on: false, r1_off: false }));
        } else {
          userIsEditingRef.current.r2_on = false;
          userIsEditingRef.current.r2_off = false;
          setEditingVisual(prev => ({ ...prev, r2_on: false, r2_off: false }));
        }
        
        setTimeout(() => esp32Service.getStatus(), 500);
        Alert.alert('Success', `Timer updated for Relay ${relay}`);
      } else {
        Alert.alert('Error', 'Failed to update timer');
      }
    } else {
      Alert.alert('Error', 'Please enter valid time format (HH:MM AM/PM)');
    }
  };

  const handleRelay1OnChange = (text: string) => {
    const formatted = formatInputTime(text);
    setRelay1Timer(prev => ({ ...prev, on: formatted }));
    userIsEditingRef.current.r1_on = true;
    setEditingVisual(prev => ({ ...prev, r1_on: true }));
  };

  const handleRelay1OffChange = (text: string) => {
    const formatted = formatInputTime(text);
    setRelay1Timer(prev => ({ ...prev, off: formatted }));
    userIsEditingRef.current.r1_off = true;
    setEditingVisual(prev => ({ ...prev, r1_off: true }));
  };

  const handleRelay2OnChange = (text: string) => {
    const formatted = formatInputTime(text);
    setRelay2Timer(prev => ({ ...prev, on: formatted }));
    userIsEditingRef.current.r2_on = true;
    setEditingVisual(prev => ({ ...prev, r2_on: true }));
  };

  const handleRelay2OffChange = (text: string) => {
    const formatted = formatInputTime(text);
    setRelay2Timer(prev => ({ ...prev, off: formatted }));
    userIsEditingRef.current.r2_off = true;
    setEditingVisual(prev => ({ ...prev, r2_off: true }));
  };

  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 100);
    const minutes = time % 100;
    
    if (hours === 0) {
      return `12:${minutes.toString().padStart(2, '0')} AM`;
    } else if (hours < 12) {
      return `${hours}:${minutes.toString().padStart(2, '0')} AM`;
    } else if (hours === 12) {
      return `12:${minutes.toString().padStart(2, '0')} PM`;
    } else {
      return `${hours - 12}:${minutes.toString().padStart(2, '0')} PM`;
    }
  };

  const parseTime = (time: string): number | null => {
    if (!time) return null;
    
    let hours: number, minutes: number;
    let isPM = false;
    
    const cleanTime = time.replace(/\s*(AM|PM|am|pm)\s*/gi, (match) => {
      isPM = match.toLowerCase().includes('p');
      return '';
    });
    
    if (cleanTime.includes(':')) {
      const parts = cleanTime.split(':');
      if (parts.length !== 2) return null;
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
    } else {
      if (cleanTime.length <= 2) {
        hours = parseInt(cleanTime, 10);
        minutes = 0;
      } else if (cleanTime.length === 3) {
        hours = parseInt(cleanTime.substring(0, 1), 10);
        minutes = parseInt(cleanTime.substring(1), 10);
      } else {
        hours = parseInt(cleanTime.substring(0, 2), 10);
        minutes = parseInt(cleanTime.substring(2), 10);
      }
    }
    
    if (isNaN(hours) || isNaN(minutes)) return null;
    
    if (isPM && hours !== 12) {
      hours += 12;
    } else if (!isPM && hours === 12) {
      hours = 0;
    }
    
    if (hours > 23 || minutes > 59) return null;
    return hours * 100 + minutes;
  };

  const formatInputTime = (text: string): string => {
    let cleaned = text.replace(/[^\d:\sAMPMampm]/g, '');
    
    const ampmMatch = cleaned.match(/(AM|PM|am|pm|A|P|a|p)/i);
    let ampm = '';
    
    if (ampmMatch) {
      const match = ampmMatch[0].toUpperCase();
      if (match === 'A' || match === 'AM') {
        ampm = ' AM';
      } else if (match === 'P' || match === 'PM') {
        ampm = ' PM';
      }
    }
    
    const timeOnly = cleaned.replace(/(AM|PM|am|pm|A|P|a|p)/gi, '').trim();
    
    let formattedTime = '';
    
    if (!timeOnly.includes(':')) {
      if (timeOnly.length === 0) {
        formattedTime = '';
      } else if (timeOnly.length <= 2) {
        formattedTime = timeOnly;
      } else if (timeOnly.length <= 4) {
        const hours = timeOnly.substring(0, timeOnly.length - 2);
        const minutes = timeOnly.substring(timeOnly.length - 2);
        formattedTime = `${hours}:${minutes}`;
      }
    } else {
      const parts = timeOnly.split(':');
      if (parts.length === 2) {
        const hours = parts[0].substring(0, 2);
        const minutes = parts[1].substring(0, 2);
        formattedTime = `${hours}:${minutes}`;
      }
    }
    
    if (formattedTime.includes(':')) {
      const [hourStr, minuteStr] = formattedTime.split(':');
      let hour = parseInt(hourStr, 10);
      
      if (!isNaN(hour)) {
        if (hour > 12) {
          hour = 12;
        } else if (hour === 0) {
          hour = 12;
        }
        formattedTime = `${hour}:${minuteStr}`;
      }
    } else if (formattedTime.length > 0) {
      const hour = parseInt(formattedTime, 10);
      if (!isNaN(hour)) {
        if (hour > 12) {
          formattedTime = '12';
        } else if (hour === 0) {
          formattedTime = '12';
        }
      }
    }
    
    return formattedTime + ampm;
  };

  const isTimeInRange = (currentTime: number, onTime: number, offTime: number): boolean => {
    if (onTime === offTime) return false;
    
    if (onTime < offTime) {
      return currentTime >= onTime && currentTime <= offTime;
    } else {
      return currentTime >= onTime || currentTime <= offTime;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.logoText}>PM</Text>
        <Text style={styles.loadingText}>Connecting to ESP32...</Text>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={styles.centered}>
        <Text style={styles.logoText}>PM</Text>
        <Text style={styles.title}>ESP32 Not Connected</Text>
        <TouchableOpacity style={styles.retryButton} onPress={testConnection}>
          <Text style={styles.buttonText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>PowerMate</Text>
        <Text style={styles.title}>Management System</Text>
        <Text style={styles.subtitle}>Smart Relay Control</Text>
      </View>
      
      {status && (
        <View style={styles.statusContainer}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <Text style={styles.timeText}>Current Time: {formatTime(status.time)}</Text>
          
          <View style={styles.statusPanel}>
            <Text style={styles.statusPanelTitle}>🎛️ Control Mode</Text>
            <Text style={styles.statusPanelText}>
              Relay 1: {manualMode.r1 ? '🔧 MANUAL MODE' : 
                isTimeInRange(status.time, status.r1_on, status.r1_off) ? 
                '🟢 TIMER ACTIVE' : '⚫ TIMER INACTIVE'}
            </Text>
            <Text style={styles.statusPanelText}>
              Relay 2: {manualMode.r2 ? '🔧 MANUAL MODE' : 
                isTimeInRange(status.time, status.r2_on, status.r2_off) ? 
                '🟢 TIMER ACTIVE' : '⚫ TIMER INACTIVE'}
            </Text>
          </View>
          
          <View style={styles.relayControls}>
            <View style={styles.relayControl}>
              <Text style={styles.relayTitle}>Relay 1 (Pin 17)</Text>
              <View style={styles.relayStatus}>
                <Text style={styles.statusText}>
                  Status: <Text style={[styles.statusValue, { color: status.r1 ? '#4CAF50' : '#F44336' }]}>
                    {status.r1 ? 'ON' : 'OFF'}
                  </Text>
                </Text>
                {manualMode.r1 ? (
                  <Text style={styles.modeText}>🔧 Manual Mode - Timer Disabled</Text>
                ) : (
                  <Text style={styles.timerActiveText}>
                    ⏰ Schedule: {formatTime(status.r1_on)} - {formatTime(status.r1_off)}
                  </Text>
                )}
              </View>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.controlButton, { backgroundColor: status.r1 ? '#F44336' : '#4CAF50' }]}
                  onPress={() => handleRelayToggle(1, !!status.r1)}
                >
                  <Text style={styles.buttonText}>
                    {manualMode.r1 ? (status.r1 ? 'Turn OFF' : 'Turn ON') : 'Control'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modeButton, { backgroundColor: manualMode.r1 ? '#FF9800' : '#4CAF50' }]}
                  onPress={() => manualMode.r1 ? enableTimerMode(1) : enableManualMode(1)}
                >
                  <Text style={styles.buttonText}>
                    {manualMode.r1 ? 'Timer Mode' : 'Manual Mode'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {!manualMode.r1 && (
                <View style={styles.timerSettings}>
                  <Text style={styles.timerTitle}>Timer Schedule</Text>
                  <View style={styles.timerInputs}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>On Time:</Text>
                      <TextInput
                        style={[
                          styles.timeInput,
                          editingVisual.r1_on && styles.editingInput
                        ]}
                        value={relay1Timer.on}
                        onChangeText={handleRelay1OnChange}
                        placeholder="8:00 AM"
                        keyboardType="default"
                        maxLength={10}
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Off Time:</Text>
                      <TextInput
                        style={[
                          styles.timeInput,
                          editingVisual.r1_off && styles.editingInput
                        ]}
                        value={relay1Timer.off}
                        onChangeText={handleRelay1OffChange}
                        placeholder="6:00 PM"
                        keyboardType="default"
                        maxLength={10}
                        autoCapitalize="characters"
                      />
                    </View>
                    <TouchableOpacity 
                      style={[styles.updateButton, { backgroundColor: '#2196F3' }]}
                      onPress={() => handleTimerUpdate(1, relay1Timer.on, relay1Timer.off)}
                    >
                      <Text style={styles.buttonText}>Update Timer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.relayControl}>
              <Text style={styles.relayTitle}>Relay 2 (Pin 18)</Text>
              <View style={styles.relayStatus}>
                <Text style={styles.statusText}>
                  Status: <Text style={[styles.statusValue, { color: status.r2 ? '#4CAF50' : '#F44336' }]}>
                    {status.r2 ? 'ON' : 'OFF'}
                  </Text>
                </Text>
                {manualMode.r2 ? (
                  <Text style={styles.modeText}>🔧 Manual Mode - Timer Disabled</Text>
                ) : (
                  <Text style={styles.timerActiveText}>
                    ⏰ Schedule: {formatTime(status.r2_on)} - {formatTime(status.r2_off)}
                  </Text>
                )}
              </View>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.controlButton, { backgroundColor: status.r2 ? '#F44336' : '#4CAF50' }]}
                  onPress={() => handleRelayToggle(2, !!status.r2)}
                >
                  <Text style={styles.buttonText}>
                    {manualMode.r2 ? (status.r2 ? 'Turn OFF' : 'Turn ON') : 'Control'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modeButton, { backgroundColor: manualMode.r2 ? '#FF9800' : '#4CAF50' }]}
                  onPress={() => manualMode.r2 ? enableTimerMode(2) : enableManualMode(2)}
                >
                  <Text style={styles.buttonText}>
                    {manualMode.r2 ? 'Timer Mode' : 'Manual Mode'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {!manualMode.r2 && (
                <View style={styles.timerSettings}>
                  <Text style={styles.timerTitle}>Timer Schedule</Text>
                  <View style={styles.timerInputs}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>On Time:</Text>
                      <TextInput
                        style={[
                          styles.timeInput,
                          editingVisual.r2_on && styles.editingInput
                        ]}
                        value={relay2Timer.on}
                        onChangeText={handleRelay2OnChange}
                        placeholder="8:00 AM"
                        keyboardType="default"
                        maxLength={10}
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Off Time:</Text>
                      <TextInput
                        style={[
                          styles.timeInput,
                          editingVisual.r2_off && styles.editingInput
                        ]}
                        value={relay2Timer.off}
                        onChangeText={handleRelay2OffChange}
                        placeholder="6:00 PM"
                        keyboardType="default"
                        maxLength={10}
                        autoCapitalize="characters"
                      />
                    </View>
                    <TouchableOpacity 
                      style={[styles.updateButton, { backgroundColor: '#2196F3' }]}
                      onPress={() => handleTimerUpdate(2, relay2Timer.on, relay2Timer.off)}
                    >
                      <Text style={styles.buttonText}>Update Timer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={styles.infoPanel}>
            <Text style={styles.infoTitle}>ℹ️ Control Modes & Time Format</Text>
            <Text style={styles.infoText}>• <Text style={styles.boldText}>Timer Mode:</Text> Automatic scheduling with manual override option</Text>
            <Text style={styles.infoText}>• <Text style={styles.boldText}>Manual Mode:</Text> Complete manual control with continuous timer blocking</Text>
            <Text style={styles.infoText}>• <Text style={styles.boldText}>Quick Toggle:</Text> Temporary override, timer remains active</Text>
            <Text style={styles.infoText}>• <Text style={styles.boldText}>Time Format:</Text> Use 12-hour format with AM/PM</Text>
            <Text style={styles.infoText}>• Examples: "8:30 AM", "2:45 PM", "12:00 AM", "12:00 PM"</Text>
            <Text style={styles.infoText}>• You can type: "8AM", "830AM", "8:30AM", "8:30 AM"</Text>
            <Text style={styles.infoText}>• Switch between modes using the mode buttons</Text>
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
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#7f8c8d',
    marginTop: 10,
  },
  timeText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#34495e',
    textAlign: 'center',
    backgroundColor: '#ecf0f1',
    padding: 12,
    borderRadius: 8,
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
    marginTop: 16,
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
  currentSchedule: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  editingInput: {
    borderColor: '#2196F3',
    borderWidth: 2,
    backgroundColor: '#f8f9ff',
  },
  statusPanel: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  statusPanelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  statusPanelText: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  controlButton: {
    flex: 2,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeText: {
    fontSize: 12,
    color: '#ff9800',
    fontWeight: 'bold',
    marginTop: 4,
  },
  timerActiveText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 4,
  },
  boldText: {
    fontWeight: 'bold',
  },
  infoPanel: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 16,
  },
});

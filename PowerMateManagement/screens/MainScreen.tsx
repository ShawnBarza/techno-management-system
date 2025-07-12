import React, { useState } from 'react';
import { View } from 'react-native';
import { ESP32Controller } from '../components/ESP32Controller';
import { ConnectionSelectionScreen } from './ConnectionSelectionScreen';

export const MainScreen: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);

  if (!isConnected) {
    return <ConnectionSelectionScreen onConnectionEstablished={() => setIsConnected(true)} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <ESP32Controller onDisconnect={() => setIsConnected(false)} />
    </View>
  );
};

export default MainScreen;

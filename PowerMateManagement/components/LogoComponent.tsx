import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface LogoComponentProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const LogoComponent: React.FC<LogoComponentProps> = ({ size = 'medium', showText = false }) => {
  const logoSizes = {
    small: 40,
    medium: 60,
    large: 80
  };

  const textSizes = {
    small: 12,
    medium: 16,
    large: 20
  };

  return (
    <View style={styles.container}>
      <View style={[
        styles.logo,
        { 
          width: logoSizes[size], 
          height: logoSizes[size],
          borderRadius: logoSizes[size] / 2
        }
      ]}>
        <Text style={[styles.logoText, { fontSize: textSizes[size] }]}>PM</Text>
      </View>
      {showText && (
        <Text style={[styles.brandText, { fontSize: textSizes[size] }]}>PowerMate</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logo: {
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    color: 'white',
    fontWeight: 'bold',
  },
  brandText: {
    color: '#2c3e50',
    fontWeight: 'bold',
  },
});
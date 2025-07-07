import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface LogoComponentProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const LogoComponent: React.FC<LogoComponentProps> = ({ 
  size = 'medium', 
  showText = true 
}) => {
  const sizeStyles = {
    small: { width: 40, height: 40 },
    medium: { width: 60, height: 60 },
    large: { width: 80, height: 80 }
  };

  return (
    <View style={styles.container}>
      <View style={[
        styles.logoContainer, 
        { 
          width: sizeStyles[size].width, 
          height: sizeStyles[size].height 
        }
      ]}>
        <Image
          source={require('../assets/images/logo.png')} // Adjust path if needed
          style={[
            styles.logoImage,
            { 
              width: sizeStyles[size].width, 
              height: sizeStyles[size].height 
            }
          ]}
          resizeMode="contain"
        />
      </View>
      {showText && (
        <Text style={styles.brandText}>PowerMate</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoImage: {
    borderRadius: 10, // Adjust for rounded corners if needed
  },
  brandText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
});
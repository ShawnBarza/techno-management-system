import React from 'react';
import { Image, StyleSheet, ImageStyle } from 'react-native';

interface LogoProps {
  size?: number;
  style?: ImageStyle;
}

export const Logo: React.FC<LogoProps> = ({ size = 80, style }) => {
  return (
    <Image
      source={require('../assets/logo.png')}
      style={[
        styles.logo,
        { width: size, height: size },
        style
      ]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  logo: {
    width: 80,
    height: 80,
  },
});

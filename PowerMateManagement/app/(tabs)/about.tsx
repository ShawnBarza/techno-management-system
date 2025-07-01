import { Text, View, StyleSheet } from 'react-native';

export default function AboutScreen() {
  return (
    <>
      <Text>Welcome to the PowerMate Management System!</Text>
      <Text style={styles.text}>About Screen</Text>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
  },
});

import { StyleSheet, Text, View } from 'react-native';

/** Placeholder for tabs/screens delivered in later build steps. */
export function ComingSoon({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 20, fontWeight: '700', color: '#202124', marginBottom: 8 },
  message: { fontSize: 14, color: '#5f6368', textAlign: 'center', lineHeight: 20 },
});

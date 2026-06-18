import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { hasSupabaseConfig } from '@/lib/config';

function MissingConfig() {
  return (
    <View style={styles.center}>
      <Text style={styles.configTitle}>Configuration needed</Text>
      <Text style={styles.configBody}>
        Copy .env.example to .env and set EXPO_PUBLIC_SUPABASE_URL and
        EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Expo.
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      {hasSupabaseConfig ? (
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      ) : (
        <MissingConfig />
      )}
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  configTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#202124' },
  configBody: { fontSize: 14, color: '#5f6368', textAlign: 'center', lineHeight: 20 },
});

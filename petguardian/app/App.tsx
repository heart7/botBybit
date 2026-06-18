import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/screens/AuthScreen';
import { AccountScreen } from '@/screens/AccountScreen';
import { hasSupabaseConfig } from '@/lib/config';

/**
 * Step 3 routing: not configured -> setup hint; loading -> spinner;
 * signed out -> AuthScreen; signed in -> AccountScreen.
 * Tab navigation (Home / Pets / Scan / Records / Account) arrives with the
 * screens that need it in later build steps.
 */
function Root() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return session ? <AccountScreen /> : <AuthScreen />;
}

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
    <>
      {hasSupabaseConfig ? (
        <AuthProvider>
          <Root />
        </AuthProvider>
      ) : (
        <MissingConfig />
      )}
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  configTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#202124' },
  configBody: { fontSize: 14, color: '#5f6368', textAlign: 'center', lineHeight: 20 },
});

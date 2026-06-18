import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TRIAGE_GUIDANCE, TRIAGE_LEVELS, AI_GUIDANCE_DISCLAIMER } from '@/lib/triage';

/**
 * Step 1 skeleton screen. It renders the triage model so the foundation is visibly
 * wired; real screens (auth, pets, scans) arrive in later build steps. Networking is
 * intentionally not exercised here so the app runs before Supabase env is configured.
 */
export default function App() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>PetGuardian</Text>
        <Text style={styles.subtitle}>AI Health Operating System for Pets</Text>

        <Text style={styles.section}>Triage model</Text>
        {TRIAGE_LEVELS.map((level) => (
          <View key={level} style={[styles.card, styles[level]]}>
            <Text style={styles.cardTitle}>
              {level.toUpperCase()} — {TRIAGE_GUIDANCE[level].title}
            </Text>
            <Text style={styles.cardBody}>{TRIAGE_GUIDANCE[level].action}</Text>
          </View>
        ))}

        <Text style={styles.disclaimer}>{AI_GUIDANCE_DISCLAIMER}</Text>
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 72, gap: 8 },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 16 },
  section: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 4 },
  card: { padding: 14, borderRadius: 12, marginVertical: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardBody: { fontSize: 14, color: '#333', marginTop: 2 },
  green: { backgroundColor: '#e6f4ea' },
  yellow: { backgroundColor: '#fef7e0' },
  orange: { backgroundColor: '#fde8e0' },
  disclaimer: { fontSize: 12, color: '#666', marginTop: 24, fontStyle: 'italic' },
});

/**
 * Triage result (Doc 05 §4.5). Renders the AI assessment when present — green/yellow/
 * orange with a clear next step — and ALWAYS reinforces that this is guidance, not a
 * diagnosis. Until the AI engine (Step 7) processes the scan, it shows a pending state.
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@/components/Button';
import { isAppError } from '@/lib/errors';
import { getScanWithAssessment, type Assessment, type Scan } from '@/lib/scans';
import { AI_GUIDANCE_DISCLAIMER, TRIAGE_GUIDANCE, type TriageLevel } from '@/lib/triage';
import type { ScanStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<ScanStackParamList, 'ScanResult'>;

const TRIAGE_STYLE: Record<TriageLevel, { bg: string; fg: string }> = {
  green: { bg: '#e6f4ea', fg: '#137333' },
  yellow: { bg: '#fef7e0', fg: '#b06000' },
  orange: { bg: '#fce8e6', fg: '#c5221f' },
};

export function ScanResultScreen({ navigation, route }: Props) {
  const { scanId } = route.params;

  const [scan, setScan] = useState<Scan | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      getScanWithAssessment(scanId)
        .then(({ scan: s, assessment: a }) => {
          if (!active) return;
          setScan(s);
          setAssessment(a);
        })
        .catch((e) => active && setError(isAppError(e) ? e.message : 'Could not load this scan.'))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [scanId]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {assessment ? (
        <View style={[styles.card, { backgroundColor: TRIAGE_STYLE[assessment.triage_level].bg }]}>
          <Text style={[styles.level, { color: TRIAGE_STYLE[assessment.triage_level].fg }]}>
            {assessment.triage_level.toUpperCase()} — {TRIAGE_GUIDANCE[assessment.triage_level].title}
          </Text>
          <Text style={styles.action}>{TRIAGE_GUIDANCE[assessment.triage_level].action}</Text>
          <Text style={styles.summary}>{assessment.summary}</Text>
          {assessment.factors.length > 0 ? (
            <View style={styles.factors}>
              {assessment.factors.map((f) => (
                <Text key={f} style={styles.factor}>
                  • {f}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.pending}>
          <Text style={styles.pendingTitle}>
            {scan?.status === 'failed' ? 'Scan could not be processed' : 'Scan submitted'}
          </Text>
          <Text style={styles.pendingBody}>
            {scan?.status === 'failed'
              ? 'Something went wrong analysing this scan. Please try again later.'
              : 'We have saved this scan to your pet’s Digital Twin. AI triage guidance will appear here once analysis is available.'}
          </Text>
        </View>
      )}

      <Text style={styles.disclaimer}>{AI_GUIDANCE_DISCLAIMER}</Text>

      <Button title="Done" onPress={() => navigation.popToTop()} style={styles.done} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20 },
  card: { borderRadius: 14, padding: 18, marginBottom: 16 },
  level: { fontSize: 18, fontWeight: '700' },
  action: { fontSize: 15, color: '#202124', marginTop: 6, fontWeight: '600' },
  summary: { fontSize: 15, color: '#202124', marginTop: 10, lineHeight: 21 },
  factors: { marginTop: 12 },
  factor: { fontSize: 14, color: '#3c4043', marginVertical: 1 },
  pending: { backgroundColor: '#e8f0fe', borderRadius: 14, padding: 18, marginBottom: 16 },
  pendingTitle: { fontSize: 18, fontWeight: '700', color: '#1967d2' },
  pendingBody: { fontSize: 15, color: '#202124', marginTop: 8, lineHeight: 21 },
  disclaimer: { fontSize: 12, color: '#5f6368', fontStyle: 'italic' },
  error: { color: '#c5221f', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  done: { marginTop: 24 },
});

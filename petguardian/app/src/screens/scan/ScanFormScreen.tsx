/**
 * Scan flow (Doc 05 §4.4): structured symptom questionnaire + optional photo, then
 * create a `pending` scan. The triage result is produced by the AI engine in Step 7;
 * here we collect inputs and reinforce that output will be guidance, not a diagnosis.
 *
 * Scan-limit enforcement is authoritative server-side (process_scan, Doc 04 §7); this
 * screen shows a soft client-side check so users aren't surprised at the cap.
 */
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/Button';
import { Chips } from '@/components/Chips';
import { Field } from '@/components/Field';
import { SegmentedControl } from '@/components/SegmentedControl';
import { isAppError } from '@/lib/errors';
import {
  buildSymptomPayload,
  DURATIONS,
  emptyAnswers,
  PRIMARY_CONCERNS,
  SYMPTOMS,
  validateAnswers,
  type QuestionnaireAnswers,
} from '@/lib/questionnaire';
import { uploadPetMedia, type PickedAsset } from '@/lib/media';
import { createScan } from '@/lib/scans';
import { getMySubscription, TIER_SCAN_LIMIT } from '@/lib/subscription';
import { AI_GUIDANCE_DISCLAIMER } from '@/lib/triage';
import type { ScanStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<ScanStackParamList, 'ScanForm'>;

const concernOptions = PRIMARY_CONCERNS.map((o) => ({ label: o.label, value: o.id }));
const durationOptions = DURATIONS.map((o) => ({ label: o.label, value: o.id }));

export function ScanFormScreen({ navigation, route }: Props) {
  const { petId } = route.params;

  const [answers, setAnswers] = useState<QuestionnaireAnswers>(emptyAnswers);
  const [asset, setAsset] = useState<(PickedAsset & { preview: string }) | null>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMySubscription()
        .then((sub) => {
          if (!active || !sub) return;
          setUsage({ used: sub.scans_used, limit: TIER_SCAN_LIMIT[sub.tier] });
        })
        .catch(() => {
          /* usage is advisory; ignore load failures */
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const atLimit = usage?.limit != null && usage.used >= usage.limit;

  function toggleSymptom(id: string) {
    setAnswers((a) => ({
      ...a,
      symptoms: a.symptoms.includes(id)
        ? a.symptoms.filter((s) => s !== id)
        : [...a.symptoms, id],
    }));
  }

  async function onAddPhoto() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo library permission is needed to attach a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || result.assets.length === 0) return;
    const picked = result.assets[0];
    if (!picked) return;
    setAsset({
      uri: picked.uri,
      mimeType: picked.mimeType,
      fileSize: picked.fileSize,
      preview: picked.uri,
    });
  }

  async function onSubmit() {
    setError(null);
    const invalid = validateAnswers(answers);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (atLimit) {
      setError('You have reached your monthly scan limit. Upgrade your plan to scan more.');
      return;
    }

    setSubmitting(true);
    try {
      let inputMediaId: string | null = null;
      if (asset) {
        const media = await uploadPetMedia(petId, asset);
        inputMediaId = media.id;
      }
      const scan = await createScan({
        petId,
        inputMediaId,
        symptomPayload: buildSymptomPayload(answers),
      });
      navigation.replace('ScanResult', { scanId: scan.id });
    } catch (e) {
      setError(isAppError(e) ? e.message : 'Could not submit this scan.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {usage?.limit != null ? (
        <Text style={[styles.usage, atLimit && styles.usageWarn]}>
          {usage.used} of {usage.limit} scans used this month
        </Text>
      ) : null}

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <SegmentedControl
        label="Main concern"
        options={concernOptions}
        value={answers.primaryConcern}
        onChange={(v) => setAnswers((a) => ({ ...a, primaryConcern: v }))}
      />
      <Chips
        label="Symptoms (select any)"
        options={SYMPTOMS}
        selected={answers.symptoms}
        onToggle={toggleSymptom}
      />
      <SegmentedControl
        label="How long has this been going on?"
        options={durationOptions}
        value={answers.duration}
        onChange={(v) => setAnswers((a) => ({ ...a, duration: v }))}
      />
      <Field
        label="Anything else? (optional)"
        value={answers.notes}
        onChangeText={(t) => setAnswers((a) => ({ ...a, notes: t }))}
        placeholder="Describe what you've noticed"
        multiline
        numberOfLines={4}
        style={styles.notes}
      />

      <Text style={styles.photoLabel}>Photo (optional)</Text>
      {asset ? (
        <View style={styles.photoRow}>
          <Image source={{ uri: asset.preview }} style={styles.preview} />
          <Pressable onPress={() => setAsset(null)} accessibilityRole="button">
            <Text style={styles.removePhoto}>Remove</Text>
          </Pressable>
        </View>
      ) : (
        <Button title="Add a photo" variant="secondary" onPress={onAddPhoto} style={styles.photoBtn} />
      )}

      <Button
        title="Submit scan"
        onPress={onSubmit}
        loading={submitting}
        disabled={atLimit}
        style={styles.submit}
      />
      <Text style={styles.disclaimer}>{AI_GUIDANCE_DISCLAIMER}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  usage: { fontSize: 13, color: '#5f6368', marginBottom: 12 },
  usageWarn: { color: '#c5221f', fontWeight: '600' },
  error: {
    backgroundColor: '#fce8e6',
    color: '#c5221f',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  notes: { minHeight: 96, textAlignVertical: 'top' },
  photoLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#202124' },
  photoBtn: { marginBottom: 8 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  preview: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#f1f3f4' },
  removePhoto: { color: '#c5221f', fontSize: 15 },
  submit: { marginTop: 12 },
  disclaimer: { fontSize: 12, color: '#5f6368', fontStyle: 'italic', marginTop: 16 },
});

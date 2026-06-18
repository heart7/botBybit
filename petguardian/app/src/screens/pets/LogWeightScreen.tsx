/**
 * Log a weight entry (Doc 08 §6 weight trajectory). Inserts into weight history; the
 * DB trigger keeps pets.current_weight_kg in sync.
 */
import { useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { isAppError } from '@/lib/errors';
import { parseWeight, validateDob, validateWeight } from '@/lib/petValidation';
import { addWeight } from '@/lib/twin';
import type { PetsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<PetsStackParamList, 'LogWeight'>;

export function LogWeightScreen({ navigation, route }: Props) {
  const { petId } = route.params;
  const today = new Date().toISOString().slice(0, 10);

  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState<{ weight?: string; date?: string }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Log weight' });
  }, [navigation]);

  async function onSave() {
    setBanner(null);
    const next = {
      weight: validateWeight(weight) ?? undefined,
      date: validateDob(date) ?? undefined, // same rule: YYYY-MM-DD, not future
    };
    setErrors(next);
    if (next.weight || next.date) return;

    const kg = parseWeight(weight);
    if (kg == null) {
      setErrors({ weight: 'Enter a number.' });
      return;
    }

    setSaving(true);
    try {
      // Store at noon UTC so the date the user picked is preserved across timezones.
      const recordedAt = date === today ? undefined : `${date}T12:00:00Z`;
      await addWeight(petId, kg, recordedAt);
      navigation.goBack();
    } catch (e) {
      setBanner(isAppError(e) ? e.message : 'Could not save this weight.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {banner ? (
        <Text style={styles.banner} accessibilityRole="alert">
          {banner}
        </Text>
      ) : null}
      <Field
        label="Weight (kg)"
        value={weight}
        onChangeText={setWeight}
        error={errors.weight}
        keyboardType="decimal-pad"
        placeholder="e.g. 11.5"
        autoFocus
      />
      <Field
        label="Date"
        value={date}
        onChangeText={setDate}
        error={errors.date}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />
      <Button title="Save weight" onPress={onSave} loading={saving} style={styles.submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  banner: {
    backgroundColor: '#fce8e6',
    color: '#c5221f',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  submit: { marginTop: 8 },
});

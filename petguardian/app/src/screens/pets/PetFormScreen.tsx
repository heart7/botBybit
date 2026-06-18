/**
 * Create / edit a pet (the Twin root). Weight is NOT set here — it flows through
 * weight history ("Log weight" on the detail screen) so pets.current_weight_kg stays
 * consistent with the time series (Doc 08 §8).
 */
import { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { SegmentedControl } from '@/components/SegmentedControl';
import { isAppError } from '@/lib/errors';
import { createPet, getPet, updatePet } from '@/lib/pets';
import {
  validateBreed,
  validateDob,
  validatePetName,
  validateSex,
  validateSpecies,
  type Sex,
  type Species,
} from '@/lib/petValidation';
import type { PetsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<PetsStackParamList, 'PetForm'>;

const SPECIES_OPTIONS = [
  { label: 'Dog', value: 'dog' as Species },
  { label: 'Cat', value: 'cat' as Species },
];
const SEX_OPTIONS = [
  { label: 'Male', value: 'male' as Sex },
  { label: 'Female', value: 'female' as Sex },
  { label: 'Unknown', value: 'unknown' as Sex },
];

export function PetFormScreen({ navigation, route }: Props) {
  const editingId = route.params?.petId;
  const isEdit = Boolean(editingId);

  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species | null>(null);
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [dob, setDob] = useState('');

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    species?: string;
    breed?: string;
    sex?: string;
    dob?: string;
  }>({});
  const [banner, setBanner] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit pet' : 'Add pet' });
  }, [navigation, isEdit]);

  useFocusEffect(
    useCallback(() => {
      if (!editingId) return;
      let active = true;
      getPet(editingId)
        .then((p) => {
          if (!active || !p) return;
          setName(p.name);
          setSpecies(p.species);
          setBreed(p.breed ?? '');
          setSex(p.sex);
          setDob(p.date_of_birth ?? '');
        })
        .catch((e) => active && setBanner(isAppError(e) ? e.message : 'Could not load this pet.'))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [editingId]),
  );

  async function onSubmit() {
    setBanner(null);
    const next = {
      name: validatePetName(name) ?? undefined,
      species: validateSpecies(species ?? '') ?? undefined,
      breed: validateBreed(breed) ?? undefined,
      sex: validateSex(sex ?? '') ?? undefined,
      dob: validateDob(dob) ?? undefined,
    };
    setErrors(next);
    if (next.name || next.species || next.breed || next.sex || next.dob) return;

    setSaving(true);
    try {
      const input = {
        name,
        species: species as Species,
        breed,
        sex,
        date_of_birth: dob,
      };
      if (editingId) {
        await updatePet(editingId, input);
      } else {
        await createPet(input);
      }
      navigation.goBack();
    } catch (e) {
      setBanner(isAppError(e) ? e.message : 'Could not save this pet.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {banner ? (
        <Text style={styles.banner} accessibilityRole="alert">
          {banner}
        </Text>
      ) : null}

      <Field label="Name" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" />
      <SegmentedControl
        label="Species"
        options={SPECIES_OPTIONS}
        value={species}
        onChange={setSpecies}
        error={errors.species}
      />
      <Field label="Breed (optional)" value={breed} onChangeText={setBreed} error={errors.breed} autoCapitalize="words" />
      <SegmentedControl
        label="Sex (optional)"
        options={SEX_OPTIONS}
        value={sex}
        onChange={setSex}
        error={errors.sex}
      />
      <Field
        label="Date of birth (optional)"
        value={dob}
        onChangeText={setDob}
        error={errors.dob}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />

      <Button
        title={isEdit ? 'Save changes' : 'Create pet'}
        onPress={onSubmit}
        loading={saving}
        style={styles.submit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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

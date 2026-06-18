/**
 * Pet Profile / Digital Twin root (Doc 05 §4.3, Doc 08): header (name, breed, age,
 * current weight) + a chronological Twin timeline, with actions to log weight, edit,
 * and remove the pet.
 */
import { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@/components/Button';
import { isAppError } from '@/lib/errors';
import { getPet, softDeletePet, type Pet } from '@/lib/pets';
import { getTimeline, type TimelineItem, type TimelineKind } from '@/lib/twin';
import { deriveAge, formatDate, formatWeight } from '@/lib/format';
import type { PetsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<PetsStackParamList, 'PetDetail'>;

const KIND_LABEL: Record<TimelineKind, string> = {
  weight: 'Weight',
  vaccination: 'Vaccination',
  medication: 'Medication',
  event: 'Health event',
  assessment: 'AI assessment',
};

export function PetDetailScreen({ navigation, route }: Props) {
  const { petId } = route.params;
  const [pet, setPet] = useState<Pet | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      Promise.all([getPet(petId), getTimeline(petId)])
        .then(([p, t]) => {
          if (!active) return;
          setPet(p);
          setTimeline(t);
        })
        .catch((e) => active && setError(isAppError(e) ? e.message : 'Could not load this pet.'))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [petId]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: pet?.name ?? 'Pet',
      headerRight: () =>
        pet ? (
          <Pressable
            onPress={() => navigation.navigate('PetForm', { petId })}
            accessibilityRole="button"
            accessibilityLabel="Edit pet"
            hitSlop={12}
          >
            <Text style={styles.headerAction}>Edit</Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, pet, petId]);

  function onDelete() {
    Alert.alert('Remove pet', `Remove ${pet?.name ?? 'this pet'}? You can ask support to restore it.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await softDeletePet(petId);
            navigation.goBack();
          } catch (e) {
            setError(isAppError(e) ? e.message : 'Could not remove this pet.');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Pet not found.'}</Text>
      </View>
    );
  }

  const age = deriveAge(pet.date_of_birth);
  const subtitle = [pet.species, pet.breed, age].filter(Boolean).join(' · ');

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={timeline}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{pet.species === 'cat' ? '🐱' : '🐶'}</Text>
            </View>
            <Text style={styles.name}>{pet.name}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <Text style={styles.weight}>Current weight: {formatWeight(pet.current_weight_kg)}</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button
              title="Log weight"
              onPress={() => navigation.navigate('LogWeight', { petId })}
              style={styles.flexBtn}
            />
            <Button
              title="Remove"
              variant="danger"
              onPress={onDelete}
              style={styles.flexBtn}
            />
          </View>

          <Text style={styles.sectionTitle}>Timeline</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          No history yet. Log a weight to start building {pet.name}&apos;s Digital Twin.
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text style={styles.itemKind}>{KIND_LABEL[item.kind]}</Text>
          <Text style={styles.itemTitle}>{item.title}</Text>
          {item.subtitle ? <Text style={styles.itemSub}>{item.subtitle}</Text> : null}
          <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  content: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', paddingVertical: 16 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f3f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 40 },
  name: { fontSize: 24, fontWeight: '700', color: '#202124' },
  subtitle: { fontSize: 15, color: '#5f6368', marginTop: 4, textTransform: 'capitalize' },
  weight: { fontSize: 15, color: '#202124', marginTop: 8 },
  headerAction: { color: '#1a73e8', fontSize: 16, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 },
  flexBtn: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#202124', marginTop: 16, marginBottom: 8 },
  empty: { fontSize: 14, color: '#5f6368', textAlign: 'center', paddingVertical: 24 },
  item: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eceef0',
  },
  itemKind: { fontSize: 12, fontWeight: '700', color: '#1a73e8', textTransform: 'uppercase' },
  itemTitle: { fontSize: 16, color: '#202124', marginTop: 2 },
  itemSub: { fontSize: 14, color: '#5f6368', marginTop: 2 },
  itemDate: { fontSize: 12, color: '#9aa0a6', marginTop: 6 },
  error: { color: '#c5221f', fontSize: 14, marginVertical: 8, textAlign: 'center' },
});

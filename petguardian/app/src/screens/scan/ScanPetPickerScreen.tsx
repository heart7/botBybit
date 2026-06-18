/**
 * Scan tab entry — choose which pet to scan (Doc 05 core flow). One pet still
 * confirms explicitly so the right Twin is always selected.
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { isAppError } from '@/lib/errors';
import { listPets, type Pet } from '@/lib/pets';
import { deriveAge } from '@/lib/format';
import type { ScanStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<ScanStackParamList, 'ScanPetPicker'>;

export function ScanPetPickerScreen({ navigation }: Props) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      listPets()
        .then((rows) => active && setPets(rows))
        .catch((e) => active && setError(isAppError(e) ? e.message : 'Could not load pets.'))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, []),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (pets.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No pets yet</Text>
        <Text style={styles.emptyBody}>Add a pet on the Pets tab before starting a scan.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={pets}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <Text style={styles.heading}>Who is this scan for?</Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate('ScanForm', { petId: item.id })}
          accessibilityRole="button"
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.species === 'cat' ? '🐱' : '🐶'}</Text>
          </View>
          <View style={styles.rowText}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {[item.breed, deriveAge(item.date_of_birth)].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  list: { padding: 16 },
  heading: { fontSize: 18, fontWeight: '700', color: '#202124', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eceef0',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f3f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 22 },
  rowText: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600', color: '#202124' },
  meta: { fontSize: 14, color: '#5f6368', marginTop: 2 },
  chevron: { fontSize: 28, color: '#9aa0a6' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#202124', marginBottom: 6 },
  emptyBody: { fontSize: 14, color: '#5f6368', textAlign: 'center' },
  error: { color: '#c5221f', fontSize: 14, marginTop: 12, textAlign: 'center' },
});

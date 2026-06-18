/**
 * Pets tab root — multi-pet list (Doc 05 §3 "Pets"). Each row opens the pet's
 * Digital Twin. The header "+" creates a new pet.
 */
import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, type NavigationProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@/components/Button';
import { isAppError } from '@/lib/errors';
import { listPets, type Pet } from '@/lib/pets';
import { deriveAge, formatWeight } from '@/lib/format';
import type { PetsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<PetsStackParamList, 'PetsList'>;

export function PetsListScreen({ navigation }: Props) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('PetForm', {})}
          accessibilityRole="button"
          accessibilityLabel="Add pet"
          hitSlop={12}
        >
          <Text style={styles.addButton}>+ Add</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

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
        <Text style={styles.emptyBody}>Add your first pet to start its Digital Twin.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Add a pet"
          onPress={() => navigation.navigate('PetForm', {})}
          style={styles.emptyButton}
        />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={pets}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate('PetDetail', { petId: item.id })}
          accessibilityRole="button"
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.species === 'cat' ? '🐱' : '🐶'}</Text>
          </View>
          <View style={styles.rowText}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {[item.breed, deriveAge(item.date_of_birth), formatWeight(item.current_weight_kg)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      )}
    />
  );
}

// Convenience type for screens that only navigate within the Pets stack.
export type PetsNav = NavigationProp<PetsStackParamList>;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  list: { padding: 16 },
  addButton: { color: '#1a73e8', fontSize: 16, fontWeight: '600' },
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f3f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 24 },
  rowText: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600', color: '#202124' },
  meta: { fontSize: 14, color: '#5f6368', marginTop: 2 },
  chevron: { fontSize: 28, color: '#9aa0a6', marginLeft: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#202124', marginBottom: 6 },
  emptyBody: { fontSize: 14, color: '#5f6368', textAlign: 'center', marginBottom: 20 },
  emptyButton: { alignSelf: 'stretch' },
  error: { color: '#c5221f', fontSize: 14, marginBottom: 12, textAlign: 'center' },
});

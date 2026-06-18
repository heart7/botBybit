/**
 * Pet Profile / Digital Twin root (Doc 05 §4.3, Doc 08): header (avatar, name, breed,
 * age, current weight) + a chronological Twin timeline. Actions: log weight, add
 * photo, edit, remove. Photos load via short-lived signed URLs (Doc 09 §5).
 */
import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/Button';
import { isAppError } from '@/lib/errors';
import { getPet, softDeletePet, type Pet } from '@/lib/pets';
import { getTimeline, type TimelineItem, type TimelineKind } from '@/lib/twin';
import {
  getSignedUrls,
  listPetMedia,
  setPetAvatar,
  uploadPetMedia,
  type PetMedia,
} from '@/lib/media';
import { deriveAge, formatDate, formatWeight } from '@/lib/format';
import type { PetsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<PetsStackParamList, 'PetDetail'>;

const KIND_LABEL: Record<TimelineKind, string> = {
  weight: 'Weight',
  vaccination: 'Vaccination',
  medication: 'Medication',
  event: 'Health event',
  assessment: 'AI assessment',
  photo: 'Photo',
  video: 'Video',
};

export function PetDetailScreen({ navigation, route }: Props) {
  const { petId } = route.params;
  const [pet, setPet] = useState<Pet | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [photos, setPhotos] = useState<Array<{ media: PetMedia; url: string }>>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [p, t, media] = await Promise.all([getPet(petId), getTimeline(petId), listPetMedia(petId)]);
    setPet(p);
    setTimeline(t);

    const photoMedia = media.filter((m) => m.kind === 'photo');
    const urls = await getSignedUrls(photoMedia.map((m) => m.storage_path));
    setPhotos(
      photoMedia
        .filter((m) => urls[m.storage_path])
        .map((m) => ({ media: m, url: urls[m.storage_path] as string })),
    );

    const avatar = p?.avatar_media_id
      ? photoMedia.find((m) => m.id === p.avatar_media_id)
      : undefined;
    setAvatarUrl(avatar ? (urls[avatar.storage_path] ?? null) : null);
  }, [petId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load()
        .catch((e) => active && setError(isAppError(e) ? e.message : 'Could not load this pet.'))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [load]),
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

  async function onAddPhoto() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo library permission is needed to add a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    if (!asset) return;

    setUploading(true);
    try {
      const created = await uploadPetMedia(petId, {
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
      });
      if (pet && !pet.avatar_media_id) {
        await setPetAvatar(petId, created.id);
      }
      await load();
    } catch (e) {
      setError(isAppError(e) ? e.message : 'Could not upload the photo.');
    } finally {
      setUploading(false);
    }
  }

  function onSetAvatar(mediaId: string) {
    Alert.alert('Set as profile photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Set',
        onPress: async () => {
          try {
            await setPetAvatar(petId, mediaId);
            await load();
          } catch (e) {
            setError(isAppError(e) ? e.message : 'Could not update the photo.');
          }
        },
      },
    ]);
  }

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
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{pet.species === 'cat' ? '🐱' : '🐶'}</Text>
              )}
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
              title="Add photo"
              variant="secondary"
              onPress={onAddPhoto}
              loading={uploading}
              style={styles.flexBtn}
            />
          </View>

          {photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
              {photos.map(({ media, url }) => (
                <Pressable
                  key={media.id}
                  onPress={() => onSetAvatar(media.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Set as profile photo"
                >
                  <Image source={{ uri: url }} style={styles.thumb} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <Text style={styles.sectionTitle}>Timeline</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          No history yet. Log a weight or add a photo to start building {pet.name}&apos;s Digital Twin.
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
      ListFooterComponent={
        <Button title="Remove pet" variant="danger" onPress={onDelete} style={styles.removeBtn} />
      }
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
    overflow: 'hidden',
  },
  avatarImage: { width: 80, height: 80 },
  avatarText: { fontSize: 40 },
  name: { fontSize: 24, fontWeight: '700', color: '#202124' },
  subtitle: { fontSize: 15, color: '#5f6368', marginTop: 4, textTransform: 'capitalize' },
  weight: { fontSize: 15, color: '#202124', marginTop: 8 },
  headerAction: { color: '#1a73e8', fontSize: 16, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 },
  flexBtn: { flex: 1 },
  strip: { marginVertical: 10 },
  thumb: { width: 72, height: 72, borderRadius: 10, marginRight: 8, backgroundColor: '#f1f3f4' },
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
  removeBtn: { marginTop: 16 },
});

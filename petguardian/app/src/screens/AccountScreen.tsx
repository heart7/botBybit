/**
 * Account & Subscription (Doc 05 §4.7): profile, current plan + scan usage,
 * consent management (Layer 3), and account controls.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Field } from '@/components/Field';
import { signOut } from '@/lib/auth';
import { isAppError } from '@/lib/errors';
import { getMyProfile, updateMyProfile, type Profile } from '@/lib/profile';
import { getMySubscription, TIER_SCAN_LIMIT, type Subscription } from '@/lib/subscription';
import { CONSENT_LAYER3_LEARNING, getConsent, setConsent } from '@/lib/consent';
import { validateCountry, validateDisplayName } from '@/lib/validation';

export function AccountScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [layer3, setLayer3] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; country?: string }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, s, c] = await Promise.all([
        getMyProfile(),
        getMySubscription(),
        getConsent(CONSENT_LAYER3_LEARNING),
      ]);
      setProfile(p);
      setSubscription(s);
      setDisplayName(p?.display_name ?? '');
      setCountry(p?.country ?? '');
      setLayer3(c?.granted ?? false);
    } catch (e) {
      setBanner(isAppError(e) ? e.message : 'Could not load your account.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setBanner(null);
    const errs = {
      name: validateDisplayName(displayName) ?? undefined,
      country: validateCountry(country) ?? undefined,
    };
    setFieldErrors(errs);
    if (errs.name || errs.country) return;

    setSaving(true);
    try {
      const updated = await updateMyProfile({
        display_name: displayName.trim() || null,
        country: country.trim() || null,
      });
      setProfile(updated);
      setBanner('Saved.');
    } catch (e) {
      setBanner(isAppError(e) ? e.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  async function onToggleLayer3(next: boolean) {
    setLayer3(next); // optimistic
    try {
      await setConsent(CONSENT_LAYER3_LEARNING, next);
    } catch (e) {
      setLayer3(!next); // revert on failure
      setBanner(isAppError(e) ? e.message : 'Could not update consent.');
    }
  }

  function onRequestDeletion() {
    // Real deletion is a server-side flow (cascade/anonymise per Doc 09 §8) wired in
    // a later step via an Edge Function. Honest placeholder for now.
    Alert.alert(
      'Delete account & data',
      'This will permanently delete your account and all pet data. This feature is ' +
        'coming soon and will be handled securely on the server.',
      [{ text: 'OK' }],
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const scanLimit = subscription ? TIER_SCAN_LIMIT[subscription.tier] : null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Account</Text>
      {banner ? (
        <Text style={styles.banner} accessibilityRole="alert">
          {banner}
        </Text>
      ) : null}

      <Text style={styles.section}>Profile</Text>
      <Field
        label="Name"
        value={displayName}
        onChangeText={setDisplayName}
        error={fieldErrors.name}
        autoCapitalize="words"
      />
      <Field
        label="Country"
        value={country}
        onChangeText={setCountry}
        error={fieldErrors.country}
        autoCapitalize="words"
      />
      <Pressable
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={onSave}
        disabled={saving}
        accessibilityRole="button"
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save profile</Text>
        )}
      </Pressable>

      <Text style={styles.section}>Plan</Text>
      <View style={styles.card}>
        <Text style={styles.cardLine}>
          Tier: <Text style={styles.bold}>{subscription?.tier ?? 'free'}</Text> (
          {subscription?.status ?? 'active'})
        </Text>
        <Text style={styles.cardLine}>
          Scans this period:{' '}
          <Text style={styles.bold}>
            {subscription?.scans_used ?? 0}
            {scanLimit != null ? ` / ${scanLimit}` : ' (unlimited)'}
          </Text>
        </Text>
      </View>

      <Text style={styles.section}>Privacy</Text>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Help improve PetGuardian</Text>
          <Text style={styles.rowSub}>
            Share anonymised data for model improvement (Layer 3). Optional and revocable.
          </Text>
        </View>
        <Switch
          value={layer3}
          onValueChange={onToggleLayer3}
          accessibilityLabel="Anonymised learning consent"
        />
      </View>

      <Pressable onPress={onRequestDeletion} accessibilityRole="button" style={styles.linkRow}>
        <Text style={styles.linkDanger}>Request account & data deletion</Text>
      </Pressable>

      <Pressable
        onPress={() => void signOut()}
        accessibilityRole="button"
        style={styles.signOut}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 24, paddingTop: 72 },
  title: { fontSize: 28, fontWeight: '700', color: '#202124', marginBottom: 12 },
  section: { fontSize: 16, fontWeight: '700', color: '#202124', marginTop: 24, marginBottom: 10 },
  banner: {
    backgroundColor: '#e8f0fe',
    color: '#1967d2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  card: { backgroundColor: '#f1f3f4', borderRadius: 12, padding: 16 },
  cardLine: { fontSize: 15, color: '#202124', marginVertical: 2 },
  bold: { fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowText: { flex: 1, paddingRight: 12 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#202124' },
  rowSub: { fontSize: 13, color: '#5f6368', marginTop: 2 },
  button: {
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkRow: { marginTop: 28 },
  linkDanger: { color: '#c5221f', fontSize: 15 },
  signOut: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#d0d3d6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#202124', fontSize: 16, fontWeight: '600' },
});

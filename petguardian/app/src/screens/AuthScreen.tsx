/**
 * Onboarding & Auth (Doc 05 §4.1): welcome + sign-in / sign-up.
 * Validates input before calling Supabase and shows friendly errors (Doc 04 §8).
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Field } from '@/components/Field';
import { signIn, signUp } from '@/lib/auth';
import { isAppError } from '@/lib/errors';
import { validateDisplayName, validateEmail, validatePassword } from '@/lib/validation';

type Mode = 'signin' | 'signup';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

  function validate(): boolean {
    const next: typeof errors = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      name: isSignup ? (validateDisplayName(displayName) ?? undefined) : undefined,
    };
    setErrors(next);
    return !next.email && !next.password && !next.name;
  }

  async function onSubmit() {
    setBanner(null);
    setInfo(null);
    if (!validate()) return;
    setBusy(true);
    try {
      if (isSignup) {
        const { needsEmailConfirmation } = await signUp({ email, password, displayName });
        if (needsEmailConfirmation) {
          setInfo('Account created. Check your email to confirm, then sign in.');
          setMode('signin');
        }
        // Otherwise onAuthStateChange swaps to the app automatically.
      } else {
        await signIn(email, password);
      }
    } catch (e) {
      setBanner(isAppError(e) ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>PetGuardian</Text>
        <Text style={styles.subtitle}>AI health guidance for your pet — not a diagnosis.</Text>

        {info ? (
          <Text style={styles.info} accessibilityRole="alert">
            {info}
          </Text>
        ) : null}
        {banner ? (
          <Text style={styles.banner} accessibilityRole="alert">
            {banner}
          </Text>
        ) : null}

        {isSignup ? (
          <Field
            label="Name (optional)"
            value={displayName}
            onChangeText={setDisplayName}
            error={errors.name}
            autoCapitalize="words"
            textContentType="name"
          />
        ) : null}

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          inputMode="email"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          textContentType={isSignup ? 'newPassword' : 'password'}
        />

        <Pressable
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={busy}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isSignup ? 'Create account' : 'Sign in'}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(isSignup ? 'signin' : 'signup');
            setErrors({});
            setBanner(null);
            setInfo(null);
          }}
          accessibilityRole="button"
          style={styles.switch}
        >
          <Text style={styles.switchText}>
            {isSignup ? 'Already have an account? Sign in' : "New here? Create an account"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 96, flexGrow: 1 },
  title: { fontSize: 32, fontWeight: '700', color: '#202124' },
  subtitle: { fontSize: 15, color: '#5f6368', marginTop: 6, marginBottom: 24 },
  info: {
    backgroundColor: '#e6f4ea',
    color: '#137333',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  banner: {
    backgroundColor: '#fce8e6',
    color: '#c5221f',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  switch: { marginTop: 18, alignItems: 'center' },
  switchText: { color: '#1a73e8', fontSize: 14 },
});

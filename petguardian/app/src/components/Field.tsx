/**
 * Labeled text input with inline error and accessibility support
 * (Doc 05 design principle: accessible — labels, contrast, scalable text).
 */
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

interface FieldProps extends TextInputProps {
  label: string;
  error?: string | null;
}

export function Field({ label, error, style, ...inputProps }: FieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor="#9aa0a6"
        accessibilityLabel={label}
        {...inputProps}
      />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#202124' },
  input: {
    borderWidth: 1,
    borderColor: '#d0d3d6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#202124',
    backgroundColor: '#fff',
  },
  inputError: { borderColor: '#c5221f' },
  error: { color: '#c5221f', fontSize: 13, marginTop: 4 },
});

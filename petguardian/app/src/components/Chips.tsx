import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Option {
  id: string;
  label: string;
}

interface ChipsProps {
  label: string;
  options: ReadonlyArray<Option>;
  /** Selected option ids. */
  selected: ReadonlyArray<string>;
  /** Toggle an option id on/off. */
  onToggle: (id: string) => void;
  error?: string | null;
}

/** Multi-select chip group (e.g. symptom checklist). */
export function Chips({ label, options, selected, onToggle, error }: ChipsProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const isOn = selected.includes(opt.id);
          return (
            <Pressable
              key={opt.id}
              onPress={() => onToggle(opt.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isOn }}
              style={[styles.chip, isOn && styles.chipOn]}
            >
              <Text style={[styles.chipText, isOn && styles.chipTextOn]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
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
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d0d3d6',
    backgroundColor: '#fff',
  },
  chipOn: { backgroundColor: '#e8f0fe', borderColor: '#1a73e8' },
  chipText: { fontSize: 14, color: '#202124' },
  chipTextOn: { color: '#1a73e8', fontWeight: '600' },
  error: { color: '#c5221f', fontSize: 13, marginTop: 4 },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Option<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: ReadonlyArray<Option<T>>;
  value: T | null;
  onChange: (value: T) => void;
  error?: string | null;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.segment, selected && styles.segmentSelected]}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                {opt.label}
              </Text>
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
  segment: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d0d3d6',
    backgroundColor: '#fff',
  },
  segmentSelected: { backgroundColor: '#e8f0fe', borderColor: '#1a73e8' },
  segmentText: { fontSize: 15, color: '#202124' },
  segmentTextSelected: { color: '#1a73e8', fontWeight: '600' },
  error: { color: '#c5221f', fontSize: 13, marginTop: 4 },
});

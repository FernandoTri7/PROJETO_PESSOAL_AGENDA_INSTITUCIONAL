import { Text, TextInput, TouchableOpacity, View, StyleSheet, ScrollView } from 'react-native';
import { colors } from './theme';

export function Field({ label, value, onChange, placeholder, keyboardType, multiline }: any) {
  return (
    <View style={f.field}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={[f.input, multiline && { minHeight: 70, textAlignVertical: 'top' }]}
        value={value ?? ''}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

export function Choice({ label, options, value, onChange }: { label: string; options: { key: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={f.field}>
      <Text style={f.label}>{label}</Text>
      <View style={f.chips}>
        {options.map((o) => (
          <TouchableOpacity key={o.key} style={[f.chip, value === o.key && f.chipSel]} onPress={() => onChange(o.key)}>
            <Text style={[f.chipText, value === o.key && { color: '#fff' }]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function FormScreen({ children }: any) {
  return <ScrollView style={f.screen} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>{children}</ScrollView>;
}

export const f = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  field: { marginBottom: 14 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 12, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderColor: colors.border, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipSel: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontSize: 13 },
  save: { backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  saveText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  delete: { borderColor: colors.red, borderWidth: 1, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10 },
  deleteText: { color: colors.red, fontWeight: '600' },
  error: { color: colors.red, marginBottom: 10, textAlign: 'center' },
});

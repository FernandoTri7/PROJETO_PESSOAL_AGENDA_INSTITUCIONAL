import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../src/api';
import { Field, Choice, FormScreen, f } from '../src/form';
import { colors } from '../src/theme';

const SCOPES = [
  { key: 'TODAS', label: 'Todas' },
  { key: 'PESSOAL', label: 'Pessoal' },
  { key: 'FAMILIAR', label: 'Familiar' },
  { key: 'INSTITUCIONAL', label: 'Institucional' },
];

const PALETTE = [
  '#0F5C5E', '#0A6A6C', '#13807F', '#0D4D4F', '#073C3E', '#15706F',
  '#1F2933', '#52606D', '#9AA0A6', '#22C55E', '#0369A1', '#7C3AED',
  '#F5A018', '#D67708', '#B45309', '#EF4444',
];

export default function CategoryForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [error, setError] = useState('');
  const [cat, setCat] = useState<any>({ label: '', color: '#0F5C5E', scope: 'TODAS' });

  useEffect(() => {
    if (id) {
      api('/categories').then((list: any[]) => {
        const found = list.find((c) => c.id === id);
        if (found) setCat({ label: found.label, color: found.color, scope: found.scope });
      });
    }
  }, [id]);

  async function save() {
    setError('');
    if (!cat.label.trim()) { setError('Nome é obrigatório'); return; }
    try {
      const body = { label: cat.label.trim(), color: cat.color, scope: cat.scope };
      if (id) await api(`/categories/${id}`, { method: 'PUT', body });
      else await api('/categories', { method: 'POST', body });
      router.back();
    } catch (e: any) { setError(e.message); }
  }

  async function remove() {
    await api(`/categories/${id}`, { method: 'DELETE' });
    router.back();
  }

  return (
    <FormScreen>
      {!!error && <Text style={f.error}>{error}</Text>}
      <Field label="Nome *" value={cat.label} onChange={(v: string) => setCat({ ...cat, label: v })} placeholder="Ex.: Reunião" />
      <Choice label="Agenda (escopo)" options={SCOPES} value={cat.scope} onChange={(v) => setCat({ ...cat, scope: v })} />
      <Text style={c.label}>Cor</Text>
      <View style={c.grid}>
        {PALETTE.map((color) => (
          <TouchableOpacity
            key={color}
            style={[c.swatch, { backgroundColor: color }, cat.color === color && c.swatchSel]}
            onPress={() => setCat({ ...cat, color })}
          />
        ))}
      </View>
      <TouchableOpacity style={f.save} onPress={save}><Text style={f.saveText}>Salvar</Text></TouchableOpacity>
      {!!id && <TouchableOpacity style={f.delete} onPress={remove}><Text style={f.deleteText}>Excluir categoria</Text></TouchableOpacity>}
    </FormScreen>
  );
}

const c = StyleSheet.create({
  label: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  swatch: { width: 34, height: 34, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  swatchSel: { borderColor: colors.text },
});

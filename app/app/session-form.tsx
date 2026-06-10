import { useEffect, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../src/api';
import { Field, Choice, FormScreen, f } from '../src/form';

const TYPES = [
  { key: 'ESCALA', label: 'Escala' },
  { key: 'ESCALA_ANUAL', label: 'Escala Anual' },
  { key: 'INSTRUTIVA', label: 'Instrutiva' },
  { key: 'EXTRA', label: 'Extra' },
  { key: 'ADVENTICIOS', label: 'Adventícios' },
  { key: 'DIRECAO', label: 'Direção' },
  { key: 'QUADRO_DE_MESTRES', label: 'Quadro de Mestres' },
  { key: 'COMEMORATIVA', label: 'Comemorativa' },
  { key: 'OUTRA', label: 'Outra' },
];

export default function SessionForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [calendars, setCalendars] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [sx, setSx] = useState<any>({
    calendarId: '', type: 'ESCALA', title: '', date: new Date().toISOString().slice(0, 10),
    dirigente: '', assistente: '', auxAssistente: '', som: '', leituraDocumentos: '', explanacao: '',
    vegetalDescricao: '', coadoLitros: '', comungadoLitros: '', retornoLitros: '',
    coposSimples: '', coposDuplos: '', coposCriancas: '', repeticoes: '', observacoes: '',
  });

  useEffect(() => {
    api('/calendars').then((cals) => {
      setCalendars(cals);
      const inst = cals.find((c: any) => c.type === 'INSTITUCIONAL') || cals[0];
      if (!id && inst) setSx((x: any) => ({ ...x, calendarId: x.calendarId || inst.id }));
    });
    if (id) {
      api('/sessions').then((all) => {
        const found = all.find((x: any) => x.id === id);
        if (found) setSx({ ...found, date: new Date(found.date).toISOString().slice(0, 10) });
      });
    }
  }, [id]);

  function set(k: string) {
    return (v: string) => setSx((x: any) => ({ ...x, [k]: v }));
  }

  async function save() {
    setError('');
    try {
      const num = (v: any) => (v === '' || v === null || v === undefined ? null : String(v).replace(',', '.'));
      const body = {
        ...sx,
        date: `${sx.date}T12:00:00`,
        coadoLitros: num(sx.coadoLitros), comungadoLitros: num(sx.comungadoLitros), retornoLitros: num(sx.retornoLitros),
        coposSimples: num(sx.coposSimples), coposDuplos: num(sx.coposDuplos),
        coposCriancas: num(sx.coposCriancas), repeticoes: num(sx.repeticoes),
      };
      if (id) await api(`/sessions/${id}`, { method: 'PUT', body });
      else await api('/sessions', { method: 'POST', body });
      router.back();
    } catch (e: any) { setError(e.message); }
  }

  async function remove() {
    await api(`/sessions/${id}`, { method: 'DELETE' });
    router.back();
  }

  return (
    <FormScreen>
      {!!error && <Text style={f.error}>{error}</Text>}
      <Choice label="Agenda" options={calendars.map((c) => ({ key: c.id, label: c.name }))} value={sx.calendarId} onChange={set('calendarId')} />
      <Choice label="Tipo de sessão" options={TYPES} value={sx.type} onChange={set('type')} />
      <Field label="Título (opcional)" value={sx.title} onChange={set('title')} placeholder="Ex.: Sessão de Reis" />
      <Field label="Data (AAAA-MM-DD) *" value={sx.date} onChange={set('date')} />
      <Field label="Mestre Dirigente" value={sx.dirigente} onChange={set('dirigente')} />
      <Field label="Mestre Assistente" value={sx.assistente} onChange={set('assistente')} />
      <Field label="Auxiliares do Assistente" value={sx.auxAssistente} onChange={set('auxAssistente')} />
      <Field label="Som" value={sx.som} onChange={set('som')} />
      <Field label="Leitura dos Documentos" value={sx.leituraDocumentos} onChange={set('leituraDocumentos')} />
      <Field label="Explanação" value={sx.explanacao} onChange={set('explanacao')} />
      <Field label="Vegetal utilizado (origem/preparo)" value={sx.vegetalDescricao} onChange={set('vegetalDescricao')} multiline />
      <Field label="Coado (litros)" value={String(sx.coadoLitros ?? '')} onChange={set('coadoLitros')} keyboardType="decimal-pad" />
      <Field label="Comungado (litros)" value={String(sx.comungadoLitros ?? '')} onChange={set('comungadoLitros')} keyboardType="decimal-pad" />
      <Field label="Retorno (litros)" value={String(sx.retornoLitros ?? '')} onChange={set('retornoLitros')} keyboardType="decimal-pad" />
      <Field label="Copos simples" value={String(sx.coposSimples ?? '')} onChange={set('coposSimples')} keyboardType="numeric" />
      <Field label="Copos duplos" value={String(sx.coposDuplos ?? '')} onChange={set('coposDuplos')} keyboardType="numeric" />
      <Field label="Copos crianças" value={String(sx.coposCriancas ?? '')} onChange={set('coposCriancas')} keyboardType="numeric" />
      <Field label="Repetições" value={String(sx.repeticoes ?? '')} onChange={set('repeticoes')} keyboardType="numeric" />
      <Field label="Observações" value={sx.observacoes} onChange={set('observacoes')} multiline />
      <TouchableOpacity style={f.save} onPress={save}><Text style={f.saveText}>Salvar sessão</Text></TouchableOpacity>
      {!!id && <TouchableOpacity style={f.delete} onPress={remove}><Text style={f.deleteText}>Excluir sessão</Text></TouchableOpacity>}
    </FormScreen>
  );
}

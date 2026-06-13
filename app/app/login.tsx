import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api, setToken } from '../src/api';
import { colors } from '../src/theme';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [needsSetup, setNeedsSetup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Primeiro acesso (sistema sem usuários): força o cadastro do administrador.
  useEffect(() => {
    api('/auth/setup')
      .then((r) => { if (r?.needsSetup) { setNeedsSetup(true); setMode('register'); } })
      .catch(() => { /* API fora: mantém login */ });
  }, []);

  async function submit() {
    setError('');
    setLoading(true);
    try {
      const body = mode === 'login' ? { email, password } : { name, email, password };
      const data = await api(`/auth/${mode}`, { method: 'POST', body });
      await setToken(data.token);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Ionicons name="calendar" size={34} color={colors.primary} />
        <Text style={s.logo}>Agenda</Text>
      </View>
      <Text style={s.subtitle}>Institucional e Pessoal</Text>
      {needsSetup && (
        <Text style={s.setupHint}>Primeiro acesso: crie a conta do administrador do sistema.</Text>
      )}
      {mode === 'register' && (
        <TextInput style={s.input} placeholder="Nome" placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
      )}
      <TextInput style={s.input} placeholder="E-mail" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Senha" placeholderTextColor={colors.muted} secureTextEntry value={password} onChangeText={setPassword} />
      {!!error && <Text style={s.error}>{error}</Text>}
      <TouchableOpacity style={s.button} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>{mode === 'login' ? 'Entrar' : (needsSetup ? 'Criar administrador e entrar' : 'Criar conta')}</Text>}
      </TouchableOpacity>
      {!needsSetup && (
        <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
          <Text style={s.switch}>{mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24, maxWidth: 480, width: '100%', alignSelf: 'center' },
  logo: { fontSize: 40, color: colors.text, textAlign: 'center', fontWeight: '700' },
  subtitle: { color: colors.muted, textAlign: 'center', marginBottom: 32, fontSize: 16 },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 14, color: colors.text, marginBottom: 12 },
  button: { backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  switch: { color: colors.primary, textAlign: 'center', marginTop: 20 },
  setupHint: { color: colors.muted, textAlign: 'center', marginBottom: 16, fontSize: 13 },
  error: { color: colors.red, marginBottom: 8, textAlign: 'center' },
});

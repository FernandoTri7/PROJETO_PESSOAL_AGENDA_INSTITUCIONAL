import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api, setToken, loadToken } from '../src/api';
import { injectWebCss } from '../src/webCss';
import { AgendaMark, AgendaWordmark } from '../src/brand';

const inputStyle: any = { width: '100%', padding: '10px 12px', border: '1px solid #DCE2E5', borderRadius: 7, fontSize: 14, fontFamily: 'inherit', outline: 'none' };
const labelStyle: any = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 };

export default function LoginWeb() {
  // mode: 'login' | 'setup' (cadastro inicial do administrador, quando não há usuários)
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    injectWebCss();
    loadToken().then((t) => { if (t) router.replace('/'); });
    // Descobre se é o primeiro acesso (sistema sem nenhum usuário).
    api('/auth/setup')
      .then((r) => { if (r?.needsSetup) setMode('setup'); })
      .catch(() => { /* se a API estiver fora, segue no login */ })
      .finally(() => setChecking(false));
  }, []);

  async function login(e: any) {
    e?.preventDefault();
    if (!email || !password) { setError('Preencha email e senha'); return; }
    setLoading(true); setError('');
    try {
      const res = await api('/auth/login', { method: 'POST', body: { email, password } });
      await setToken(res.token);
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas');
    } finally { setLoading(false); }
  }

  async function setup(e: any) {
    e?.preventDefault();
    if (!name.trim()) { setError('Informe o nome do administrador'); return; }
    if (!email.trim()) { setError('Informe o e-mail'); return; }
    if (password.length < 6) { setError('A senha deve ter ao menos 6 caracteres'); return; }
    if (password !== confirm) { setError('As senhas não conferem'); return; }
    setLoading(true); setError('');
    try {
      const res = await api('/auth/register', { method: 'POST', body: { name: name.trim(), email: email.trim(), password } });
      await setToken(res.token);
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Não foi possível concluir o cadastro');
    } finally { setLoading(false); }
  }

  const isSetup = mode === 'setup';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#073C3E', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: 'white', borderRadius: 16, padding: '40px 44px', width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,.35)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <AgendaMark size={56} />
          <div style={{ marginTop: 12 }}><AgendaWordmark size={22} /></div>
          <p style={{ color: '#52606D', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
            {checking ? 'Carregando...' : isSetup
              ? 'Primeiro acesso · Crie a conta do administrador do sistema'
              : 'Acesso restrito · Entre com sua conta'}
          </p>
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: 13, padding: '9px 13px', background: '#fef2f2', borderRadius: 7, borderLeft: '3px solid #ef4444', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {isSetup ? (
          <form onSubmit={setup}>
            <div style={{ background: '#f0f9f4', border: '1px solid #bbe7cd', color: '#0b6b3a', fontSize: 12.5, padding: '10px 13px', borderRadius: 8, marginBottom: 16 }}>
              Nenhum usuário cadastrado. Esta primeira conta será o <strong>administrador</strong> do sistema.
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoFocus style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 6 caracteres" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Confirmar senha</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="repita a senha" style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '11px', background: '#0F5C5E', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? .7 : 1 }}>
              {loading ? 'Criando conta...' : 'Criar administrador e entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={login}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoFocus style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '11px', background: '#0F5C5E', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? .7 : 1 }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#9ca3af' }}>
          Agenda Institucional e Pessoal · v1.0
        </div>
      </div>
    </div>
  );
}

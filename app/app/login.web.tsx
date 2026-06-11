import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api, setToken, loadToken } from '../src/api';
import { injectWebCss } from '../src/webCss';
import { AgendaMark, AgendaWordmark } from '../src/brand';

export default function LoginWeb() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    injectWebCss();
    loadToken().then(t => { if (t) router.replace('/'); });
  }, []);

  async function login(e: any) {
    e?.preventDefault();
    if (!email || !password) { setError('Preencha email e senha'); return; }
    setLoading(true); setError('');
    try {
      const res = await api('/auth/login', { method: 'POST', body: { email, password } });
      await setToken(res.token);
      router.replace('/');
    } catch(err: any) {
      setError(err.message || 'Credenciais inválidas');
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#073C3E',
      fontFamily:"'DM Sans', sans-serif",
    }}>
      <div style={{
        background:'white', borderRadius:16, padding:'40px 44px', width:'100%', maxWidth:420,
        boxShadow:'0 24px 64px rgba(0,0,0,.35)',
      }}>
        {/* Logo */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:28 }}>
          <AgendaMark size={56} />
          <div style={{ marginTop:12 }}><AgendaWordmark size={22} /></div>
          <p style={{ color:'#52606D', fontSize:13, marginTop:10 }}>Acesso restrito · Entre com sua conta</p>
        </div>

        <form onSubmit={login}>
          {error && (
            <div style={{ color:'#ef4444', fontSize:13, padding:'9px 13px', background:'#fef2f2', borderRadius:7, borderLeft:'3px solid #ef4444', marginBottom:16 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoFocus
              style={{ width:'100%', padding:'10px 12px', border:'1px solid #DCE2E5', borderRadius:7, fontSize:14, fontFamily:'inherit', outline:'none' }}
              onFocus={e => e.target.style.borderColor='#F5A018'}
              onBlur={e => e.target.style.borderColor='#DCE2E5'}
            />
          </div>

          <div style={{ marginBottom:24 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width:'100%', padding:'10px 12px', border:'1px solid #DCE2E5', borderRadius:7, fontSize:14, fontFamily:'inherit', outline:'none' }}
              onFocus={e => e.target.style.borderColor='#F5A018'}
              onBlur={e => e.target.style.borderColor='#DCE2E5'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width:'100%', padding:'11px', background:'#0F5C5E', color:'white', border:'none',
              borderRadius:8, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              opacity: loading ? .7 : 1, transition:'background .15s',
            }}
            onMouseOver={e => !loading && ((e.target as any).style.background='#14706F')}
            onMouseOut={e => !loading && ((e.target as any).style.background='#0F5C5E')}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign:'center', marginTop:24, fontSize:12, color:'#9ca3af' }}>
          Agenda Institucional e Pessoal · v1.0
        </div>
      </div>
    </div>
  );
}
